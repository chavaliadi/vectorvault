"""Empirical validation and parameter sweep module for HNSW index performance.

Compares VectorVault HNSW against standard C++ hnswlib reference implementation
and evaluates parameter trade-off curves across M and ef_search grids.
"""

import os
import sys
import time
import logging
import numpy as np
import matplotlib.pyplot as plt
import hnswlib

from backend.embeddings import load_glove, cosine_distance
from backend.hnsw import HNSW

logger = logging.getLogger(__name__)


def get_seeded_queries(
    words: list[str], vectors: np.ndarray, num_queries: int = 50, seed: int = 42
) -> tuple[list[int], list[np.ndarray]]:
    """Select a deterministic set of query indices and vectors.

    Complexity: O(Q) time.

    Parameters
    ----------
    words : list[str]
        List of vocabulary words.
    vectors : np.ndarray
        Array of corresponding word vectors of shape (N, 50).
    num_queries : int, optional
        Number of queries to select, by default 50.
    seed : int, optional
        Random seed for reproducibility, by default 42.

    Returns
    -------
    tuple[list[int], list[np.ndarray]]
        Selected query vocabulary indices and query vector arrays.
    """
    rng = np.random.default_rng(seed)
    vocab_size = len(words)
    num_queries = min(num_queries, vocab_size)
    query_indices = list(rng.choice(vocab_size, size=num_queries, replace=False))
    query_vectors = [vectors[idx] for idx in query_indices]
    return query_indices, query_vectors


def compute_ground_truth(
    query_vectors: list[np.ndarray], vectors: np.ndarray, k: int = 10
) -> list[list[int]]:
    """Compute exact brute-force top-k nearest neighbor indices for queries.

    Complexity: O(Q * N * D) where Q is query count, N is vocab size, D is dimension.

    Parameters
    ----------
    query_vectors : list[np.ndarray]
        List of query vectors.
    vectors : np.ndarray
        Array of all dataset vectors.
    k : int, optional
        Top-k nearest neighbors to retrieve, by default 10.

    Returns
    -------
    list[list[int]]
        List of ground truth top-k node ID lists per query.
    """
    vocab_size = len(vectors)
    ground_truth = []
    for q_vec in query_vectors:
        dists = [cosine_distance(q_vec, vectors[i]) for i in range(vocab_size)]
        top_k = sorted(enumerate(dists), key=lambda x: x[1])[:k]
        ground_truth.append([node_id for node_id, _ in top_k])
    return ground_truth


def run_hnswlib_validation(
    words: list[str],
    vectors: np.ndarray,
    num_queries: int = 50,
    k: int = 10,
    M: int = 16,
    ef_construction: int = 200,
    ef_search: int = 50,
    seed: int = 42,
    log_progress: bool = True,
) -> dict:
    """Validate VectorVault HNSW against standard hnswlib reference implementation.

    Complexity: O(N * M log N + Q * log N) time.

    Parameters
    ----------
    words : list[str]
        Vocabulary word list.
    vectors : np.ndarray
        Vector embeddings matrix of shape (N, 50).
    num_queries : int, optional
        Number of seeded queries to run, by default 50.
    k : int, optional
        Number of nearest neighbors to retrieve, by default 10.
    M : int, optional
        Bidirectional link degree, by default 16.
    ef_construction : int, optional
        Construction dynamic candidate pool size, by default 200.
    ef_search : int, optional
        Search beam candidate pool size, by default 50.
    seed : int, optional
        Random seed, by default 42.
    log_progress : bool, optional
        Whether to log vector insertion progress, by default True.

    Returns
    -------
    dict
        Validation statistics containing recall, overlap, and latency comparisons.
    """
    vocab_size = len(words)
    query_indices, query_vectors = get_seeded_queries(
        words, vectors, num_queries=num_queries, seed=seed
    )

    # Compute ground truth brute force
    ground_truth = compute_ground_truth(query_vectors, vectors, k=k)

    # 1. Build and query VectorVault HNSW index
    if log_progress:
        print(f"Building VectorVault HNSW index (M={M}, ef_c={ef_construction})...", flush=True)
    vv_hnsw = HNSW(M=M, ef_construction=ef_construction, seed=seed)
    for i, vec in enumerate(vectors):
        vv_hnsw.insert(vec, i)
        if log_progress and (i + 1) % 1000 == 0:
            print(f"Inserted {i + 1}/{vocab_size} vectors (VectorVault M={M})...", flush=True)

    vv_times = []
    vv_recalls = []
    vv_results_all = []

    for idx, q_vec in enumerate(query_vectors):
        t0 = time.perf_counter_ns()
        res, _ = vv_hnsw.query(q_vec, k=k, ef=ef_search, record_steps=False)
        vv_time_ms = (time.perf_counter_ns() - t0) / 1_000_000.0
        vv_times.append(vv_time_ms)

        vv_ids = [node_id for node_id, _ in res]
        vv_results_all.append(vv_ids)

        gt_set = set(ground_truth[idx])
        recall = len(set(vv_ids) & gt_set) / float(k) if k > 0 else 0.0
        vv_recalls.append(recall)

    # 2. Build and query reference hnswlib C++ index
    if log_progress:
        print(f"Building reference hnswlib index (M={M}, ef_c={ef_construction})...")
    hnswlib_index = hnswlib.Index(space="cosine", dim=50)
    hnswlib_index.init_index(
        max_elements=vocab_size, ef_construction=ef_construction, M=M
    )
    hnswlib_index.add_items(vectors, np.arange(vocab_size))
    hnswlib_index.set_ef(ef_search)

    hnswlib_times = []
    hnswlib_recalls = []
    hnswlib_results_all = []
    overlaps = []

    for idx, q_vec in enumerate(query_vectors):
        t0 = time.perf_counter_ns()
        labels, _ = hnswlib_index.knn_query(q_vec, k=k)
        h_time_ms = (time.perf_counter_ns() - t0) / 1_000_000.0
        hnswlib_times.append(h_time_ms)

        h_ids = list(labels[0])
        hnswlib_results_all.append(h_ids)

        gt_set = set(ground_truth[idx])
        recall = len(set(h_ids) & gt_set) / float(k) if k > 0 else 0.0
        hnswlib_recalls.append(recall)

        # Compute Top-k ID Overlap between VectorVault and hnswlib
        overlap = len(set(vv_results_all[idx]) & set(h_ids)) / float(k) if k > 0 else 0.0
        overlaps.append(overlap)

    return {
        "vectorvault_recall": float(np.mean(vv_recalls)),
        "hnswlib_recall": float(np.mean(hnswlib_recalls)),
        "avg_overlap": float(np.mean(overlaps)),
        "vectorvault_latency_ms": float(np.mean(vv_times)),
        "hnswlib_latency_ms": float(np.mean(hnswlib_times)),
        "queries_run": len(query_indices),
    }


def run_parameter_sweep(
    words: list[str],
    vectors: np.ndarray,
    M_values: list[int] = None,
    ef_search_values: list[int] = None,
    num_queries: int = 50,
    k: int = 10,
    ef_construction: int = 200,
    seed: int = 42,
    log_progress: bool = True,
) -> dict:
    """Perform a grid search parameter sweep across M and ef_search values.

    Complexity: O(|M| * N * M log N + |M| * |ef_search| * Q * log N) time.

    Parameters
    ----------
    words : list[str]
        Vocabulary words list.
    vectors : np.ndarray
        Array of embeddings.
    M_values : list[int], optional
        List of M values to test, by default [8, 16, 32].
    ef_search_values : list[int], optional
        List of ef_search values to test, by default [10, 50, 100, 200].
    num_queries : int, optional
        Number of seeded query searches, by default 50.
    k : int, optional
        Number of nearest neighbors to retrieve, by default 10.
    ef_construction : int, optional
        Construction dynamic candidate pool size, by default 200.
    seed : int, optional
        Random seed, by default 42.
    log_progress : bool, optional
        Whether to print progress logs, by default True.

    Returns
    -------
    dict
        Grid results mapping (M, ef_search) tuples to metrics dicts.
    """
    if M_values is None:
        M_values = [8, 16, 32]
    if ef_search_values is None:
        ef_search_values = [10, 50, 100, 200]

    vocab_size = len(words)
    query_indices, query_vectors = get_seeded_queries(
        words, vectors, num_queries=num_queries, seed=seed
    )

    if log_progress:
        print("Pre-computing ground truth brute-force nearest neighbors...")
    ground_truth = compute_ground_truth(query_vectors, vectors, k=k)

    grid_results = {}

    for M in M_values:
        if log_progress:
            print(f"\nBuilding VectorVault HNSW index for M={M}...", flush=True)
        hnsw = HNSW(M=M, ef_construction=ef_construction, seed=seed)
        for i, vec in enumerate(vectors):
            hnsw.insert(vec, i)
            if log_progress and (i + 1) % 1000 == 0:
                print(f"Inserted {i + 1}/{vocab_size} vectors (M={M})...", flush=True)

        for ef in ef_search_values:
            times = []
            recalls = []
            for idx, q_vec in enumerate(query_vectors):
                t0 = time.perf_counter_ns()
                res, _ = hnsw.query(q_vec, k=k, ef=ef, record_steps=False)
                time_ms = (time.perf_counter_ns() - t0) / 1_000_000.0
                times.append(time_ms)

                res_ids = {node_id for node_id, _ in res}
                gt_set = set(ground_truth[idx])
                recall = len(res_ids & gt_set) / float(k) if k > 0 else 0.0
                recalls.append(recall)

            grid_results[(M, ef)] = {
                "recall": float(np.mean(recalls)),
                "latency_ms": float(np.mean(times)),
            }

    return grid_results


def generate_tradeoff_plot(
    sweep_results: dict, output_path: str = "docs/assets/tradeoff_curve.png"
) -> None:
    """Generate and save a Recall vs. Latency trade-off curve plot.

    Complexity: O(|Grid|) time.

    Parameters
    ----------
    sweep_results : dict
        Results mapping from run_parameter_sweep.
    output_path : str, optional
        Target file path for saving PNG plot, by default "docs/assets/tradeoff_curve.png".
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Dark theme styling matching VectorVault UI design system
    plt.style.use("dark_background")
    fig, ax = plt.subplots(figsize=(9, 5.5), dpi=300)

    # Color palette matching UI variables
    colors = {8: "#38BDF8", 16: "#22C55E", 32: "#A855F7"}

    M_values = sorted(list(set(m for m, _ in sweep_results.keys())))

    for M in M_values:
        points = []
        for (m_val, ef_val), metrics in sweep_results.items():
            if m_val == M:
                points.append((ef_val, metrics["latency_ms"], metrics["recall"]))

        # Sort points by latency ascending
        points.sort(key=lambda x: x[1])

        ef_labels = [p[0] for p in points]
        latencies = [p[1] for p in points]
        recalls = [p[2] for p in points]

        line_color = colors.get(M, "#3B82F6")
        ax.plot(
            latencies,
            recalls,
            marker="o",
            linewidth=2.5,
            markersize=7,
            color=line_color,
            label=f"M = {M}",
        )

        for ef, x, y in zip(ef_labels, latencies, recalls):
            ax.annotate(
                f"ef={ef}",
                (x, y),
                textcoords="offset points",
                xytext=(0, 8),
                ha="center",
                fontsize=8,
                color="#E2E8F0",
            )

    ax.set_title(
        "HNSW Recall@10 vs. Query Latency Trade-off Curve",
        fontsize=13,
        fontweight="bold",
        pad=15,
        color="#F8FAFC",
    )
    ax.set_xlabel("Average Query Latency (ms)", fontsize=11, labelpad=10, color="#94A3B8")
    ax.set_ylabel("Recall@10", fontsize=11, labelpad=10, color="#94A3B8")
    ax.grid(True, linestyle="--", alpha=0.2, color="#64748B")
    ax.legend(title="Graph Degree (M)", frameon=True, facecolor="#1E293B", edgecolor="#334155")

    # Set aesthetic plot margins
    y_min = max(0.0, min(m["recall"] for m in sweep_results.values()) - 0.05)
    ax.set_ylim(y_min, 1.02)

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"Trade-off curve plot successfully saved to '{output_path}'.")


def main() -> None:
    """Execute validation and parameter sweep CLI workflow."""
    glove_path = "data/glove.6B.50d.txt"
    if not os.path.exists(glove_path):
        print(f"Error: GloVe file missing at '{glove_path}'.")
        print("Please run 'python3 backend/download_glove.py' first.")
        sys.exit(1)

    print("==================================================")
    print("      VectorVault Empirical Validation Suite      ")
    print("==================================================")
    print("Loading GloVe 50d dataset (5,000 vectors)...")
    words, vectors = load_glove(glove_path, max_words=5000)

    # 1. Part A: hnswlib Reference Validation
    print("\n--------------------------------------------------")
    print(" Part A: hnswlib Reference Cross-Validation")
    print("--------------------------------------------------")
    val_stats = run_hnswlib_validation(words, vectors, num_queries=50, k=10)

    print("\n+-------------------------------------------------+")
    print("|          hnswlib Reference Comparison           |")
    print("+----------------------+--------------------------+")
    print("| Metric               | Value                    |")
    print("+----------------------+--------------------------+")
    print(f"| Queries Run          | {val_stats['queries_run']:<24} |")
    print(f"| VectorVault Recall   | {val_stats['vectorvault_recall']:0.4f}                   |")
    print(f"| hnswlib Recall       | {val_stats['hnswlib_recall']:0.4f}                   |")
    print(f"| Top-10 ID Overlap    | {val_stats['avg_overlap']*100:0.1f}%                    |")
    print(f"| VectorVault Latency  | {val_stats['vectorvault_latency_ms']:0.4f} ms               |")
    print(f"| hnswlib Latency      | {val_stats['hnswlib_latency_ms']:0.4f} ms               |")
    print("+----------------------+--------------------------+")

    # 2. Part B: Parameter Grid Sweep
    print("\n--------------------------------------------------")
    print(" Part B: M x ef_search Parameter Trade-off Sweep")
    print("--------------------------------------------------")
    sweep_results = run_parameter_sweep(words, vectors, num_queries=50, k=10)

    M_values = sorted(list(set(m for m, _ in sweep_results.keys())))
    ef_values = sorted(list(set(e for _, e in sweep_results.keys())))

    print("\n+-------------------------------------------------------------------+")
    print("|          Parameter Sweep Grid (Recall@10 / Latency ms)            |")
    print("+--------+----------------------------------------------------------+")
    header_str = "| M \\ ef | " + " | ".join(f"ef={ef:<6}" for ef in ef_values) + " |"
    print(header_str)
    print("+--------+----------------------------------------------------------+")

    for M in M_values:
        row_str = f"| M={M:<4} | "
        cell_strs = []
        for ef in ef_values:
            cell = sweep_results[(M, ef)]
            cell_strs.append(f"{cell['recall']:0.3f}/{cell['latency_ms']:0.2f}ms")
        row_str += " | ".join(cell_strs) + " |"
        print(row_str)
    print("+--------+----------------------------------------------------------+")

    # 3. Generate plot
    print("\nGenerating trade-off curve plot...")
    generate_tradeoff_plot(sweep_results, "docs/assets/tradeoff_curve.png")
    print("\nEmpirical validation suite completed successfully!")


if __name__ == "__main__":
    main()
