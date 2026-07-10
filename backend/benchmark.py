"""Benchmarking module for HNSW approximate nearest neighbor search.

Provides a unified function to compare performance (Recall and Latency) between
HNSW search and exact brute-force search, and a standalone CLI.
"""

import time
import numpy as np
from backend.embeddings import load_glove, cosine_distance
from backend.hnsw import HNSW


def run_benchmark(
    hnsw: HNSW,
    words: list[str],
    vectors: np.ndarray,
    num_queries: int = 50,
    k: int = 10,
    ef: int = 50,
    seed: int = 42,
) -> dict:
    """Run recall and timing comparisons across random queries.

    Parameters
    ----------
    hnsw : HNSW
        The populated HNSW index instance.
    words : list[str]
        List of vocabulary words matching vectors.
    vectors : np.ndarray
        Array of vocabulary vectors of shape (N, 50).
    num_queries : int, optional
        Number of query searches to run, by default 50.
    k : int, optional
        Number of nearest neighbors to retrieve, by default 10.
    ef : int, optional
        Search beam size for HNSW, by default 50.
    seed : int, optional
        Random seed for query selection reproducibility, by default 42.

    Returns
    -------
    dict
        Aggregated average statistics containing latency and recall comparisons.
    """
    # Seed generator for reproducible query selection
    rng = np.random.default_rng(seed)
    vocab_size = len(words)

    # Prevent out of bounds query count
    num_queries = min(num_queries, vocab_size)

    # Randomly select query indices from vocabulary
    query_indices = rng.choice(vocab_size, size=num_queries, replace=False)

    hnsw_times = []
    brute_times = []
    recalls = []

    for idx in query_indices:
        query_word = words[idx]
        query_vector = vectors[idx]

        # 1. HNSW query search
        t0 = time.perf_counter_ns()
        hnsw_results, _ = hnsw.query(query_vector, k=k, ef=ef, record_steps=False)
        hnsw_time_ms = (time.perf_counter_ns() - t0) / 1_000_000.0
        hnsw_times.append(hnsw_time_ms)

        # 2. Exact brute force search
        t0 = time.perf_counter_ns()
        dists = [cosine_distance(query_vector, vectors[i]) for i in range(vocab_size)]
        # Sort and take top k
        brute_results = sorted(enumerate(dists), key=lambda x: x[1])[:k]
        brute_time_ms = (time.perf_counter_ns() - t0) / 1_000_000.0
        brute_times.append(brute_time_ms)

        # 3. Calculate Recall@k
        hnsw_ids = {node_id for node_id, _ in hnsw_results}
        brute_ids = {brute_idx for brute_idx, _ in brute_results}

        if k > 0:
            recall = len(hnsw_ids & brute_ids) / k
        else:
            recall = 0.0
        recalls.append(recall)

    return {
        "avg_hnsw_time_ms": float(np.mean(hnsw_times)),
        "avg_brute_force_time_ms": float(np.mean(brute_times)),
        "avg_recall": float(np.mean(recalls)),
        "queries_run": num_queries,
    }


if __name__ == "__main__":
    import os

    glove_path = "data/glove.6B.50d.txt"
    if not os.path.exists(glove_path):
        print(f"Error: GloVe file not found at '{glove_path}'.")
        print("Please run 'python3 backend/download_glove.py' first.")
        exit(1)

    print("Loading GloVe embeddings...")
    words, vectors = load_glove(glove_path)

    print("Building HNSW index...")
    hnsw = HNSW()
    for i, vec in enumerate(vectors):
        hnsw.insert(vec, i)
        if (i + 1) % 1000 == 0:
            print(f"Inserted {i + 1}/{len(vectors)} vectors...")

    print("Running benchmark...")
    stats = run_benchmark(hnsw, words, vectors)

    print("\n+-------------------------------------------------+")
    print("|                HNSW Benchmark                   |")
    print("+----------------------+--------------------------+")
    print("| Metric               | Value                    |")
    print("+----------------------+--------------------------+")
    print(f"| Queries Run          | {stats['queries_run']:<24} |")
    print(
        f"| Avg HNSW Time        | {stats['avg_hnsw_time_ms']:0.4f} ms               |"
    )
    print(
        f"| Avg Brute Force Time | {stats['avg_brute_force_time_ms']:0.4f} ms               |"
    )
    print(f"| Avg Recall@10        | {stats['avg_recall']:0.4f}                   |")
    print("+----------------------+--------------------------+")
