"""FastAPI application for VectorVault.

Exposes REST endpoints for querying the HNSW index, retrieving graph structural
relationships, and running benchmarks.
"""

import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np

from backend.embeddings import load_glove, cosine_distance
from backend.hnsw import HNSW
from backend.benchmark import run_benchmark

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GLOVE_PATH = "data/glove.6B.50d.txt"


# Lifespan Context Manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager handling startup bootstrapping and database loading."""
    logger.info("Loading GloVe embeddings from %s...", GLOVE_PATH)
    try:
        words, vectors = load_glove(GLOVE_PATH)
    except FileNotFoundError as err:
        logger.error("Startup Failure: GloVe dataset not found at %s", GLOVE_PATH)
        raise FileNotFoundError(
            f"GloVe dataset missing at {GLOVE_PATH}. Run download script."
        ) from err

    logger.info("Creating word index lookup dictionary...")
    word_to_index = {word: idx for idx, word in enumerate(words)}

    logger.info("Initializing HNSW index construction...")
    hnsw = HNSW()
    num_vectors = len(vectors)

    for i, vec in enumerate(vectors):
        hnsw.insert(vec, i)
        if (i + 1) % 1000 == 0:
            logger.info("Inserted %d/%d vectors...", i + 1, num_vectors)

    logger.info(
        "HNSW index construction completed successfully. Loaded %d words.",
        len(words),
    )

    # Attach loaded resources to app.state
    app.state.words = words
    app.state.vectors = vectors
    app.state.word_to_index = word_to_index
    app.state.hnsw = hnsw

    yield

    # Clean up state on shutdown if needed
    app.state.words = None
    app.state.vectors = None
    app.state.word_to_index = None
    app.state.hnsw = None


app = FastAPI(
    title="VectorVault API",
    description="Backend API serving HNSW graph traversal animations",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend integration (allow only local development hosts)
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic Schemas
class QueryRequest(BaseModel):
    """Pydantic model representing search request payload."""

    word: str = Field(..., description="Query word, e.g. 'king'")
    k: int = Field(10, ge=1, le=100, description="Top-k nearest neighbors to return")
    ef: int = Field(50, ge=1, le=500, description="HNSW search beam size")


class SearchResult(BaseModel):
    """Pydantic model representing a search hit vector."""

    id: int
    word: str
    distance: float


class TraversalStep(BaseModel):
    """Pydantic model representing a single step log entry in HNSW query trajectory."""

    current: int
    evaluating: int
    distance: float
    accepted: bool
    layer: int


class ComparisonStats(BaseModel):
    """Pydantic model containing latency and recall comparisons against exact search."""

    hnsw_visited: int
    brute_force_visited: int
    hnsw_time_ms: float
    brute_force_time_ms: float
    recall: float


class QueryResponse(BaseModel):
    """Pydantic model representing query endpoint response payload."""

    hnsw_results: list[SearchResult]
    brute_force_results: list[SearchResult]
    steps: list[TraversalStep]
    stats: ComparisonStats


class GraphNode(BaseModel):
    """Pydantic model representing a node inside D3 graph layout."""

    id: int
    word: str
    layers: list[int]


class GraphEdge(BaseModel):
    """Pydantic model representing an edge inside D3 graph layout."""

    source: int
    target: int
    layer: int


class GraphResponse(BaseModel):
    """Pydantic model representing graph topology payload."""

    nodes: list[GraphNode]
    edges: list[GraphEdge]


class BenchmarkResponse(BaseModel):
    """Pydantic model representing aggregated recall benchmarks payload."""

    avg_hnsw_time_ms: float
    avg_brute_force_time_ms: float
    avg_recall: float
    queries_run: int


@app.post("/query", response_model=QueryResponse, status_code=status.HTTP_200_OK)
async def query_word(request: QueryRequest):
    """Search for the nearest neighbors of a word using HNSW and Brute Force.

    Coordinates search, calculates stats, and maps trajectory steps.
    """
    clean_word = request.word.strip().lower()
    word_to_index = app.state.word_to_index

    if clean_word not in word_to_index:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Word '{request.word}' not found in vocabulary.",
        )

    query_id = word_to_index[clean_word]
    query_vector = app.state.vectors[query_id]
    k = request.k
    ef = request.ef

    # 1. HNSW Search traversal
    t0 = time.perf_counter_ns()
    hnsw_results, steps = app.state.hnsw.query(
        query_vector, k=k, ef=ef, record_steps=True
    )
    hnsw_time_ms = (time.perf_counter_ns() - t0) / 1_000_000.0

    # 2. Exact Brute Force baseline (delegates math metric to cosine_distance)
    t0 = time.perf_counter_ns()
    vocab_size = len(app.state.words)
    dists = [
        cosine_distance(query_vector, app.state.vectors[i]) for i in range(vocab_size)
    ]
    brute_results = sorted(enumerate(dists), key=lambda x: x[1])[:k]
    brute_time_ms = (time.perf_counter_ns() - t0) / 1_000_000.0

    # 3. Calculate metrics
    hnsw_ids = [node_id for node_id, _ in hnsw_results]
    brute_ids = [idx for idx, _ in brute_results]

    hnsw_ids_set = set(hnsw_ids)
    brute_ids_set = set(brute_ids)

    recall = len(hnsw_ids_set & brute_ids_set) / k if k > 0 else 0.0

    # Calculate unique nodes evaluated during search
    visited_nodes = {step["evaluating"] for step in steps}
    if app.state.hnsw.entry_point is not None:
        visited_nodes.add(app.state.hnsw.entry_point)
    hnsw_visited = len(visited_nodes)

    # 4. Formulate response payload
    hnsw_mapped_results = [
        SearchResult(id=node_id, word=app.state.words[node_id], distance=distance)
        for node_id, distance in hnsw_results
    ]

    brute_mapped_results = [
        SearchResult(id=idx, word=app.state.words[idx], distance=distance)
        for idx, distance in brute_results
    ]

    mapped_steps = [
        TraversalStep(
            current=step["current"],
            evaluating=step["evaluating"],
            distance=step["distance"],
            accepted=step["accepted"],
            layer=step["layer"],
        )
        for step in steps
    ]

    stats = ComparisonStats(
        hnsw_visited=hnsw_visited,
        brute_force_visited=vocab_size,
        hnsw_time_ms=hnsw_time_ms,
        brute_force_time_ms=brute_time_ms,
        recall=recall,
    )

    return QueryResponse(
        hnsw_results=hnsw_mapped_results,
        brute_force_results=brute_mapped_results,
        steps=mapped_steps,
        stats=stats,
    )


@app.get("/graph", response_model=GraphResponse, status_code=status.HTTP_200_OK)
async def get_graph():
    """Retrieve full HNSW index structure including nodes and unique edges across layers."""
    words = app.state.words
    hnsw = app.state.hnsw

    # 1. Map nodes with all active layers they exist on
    nodes = []
    for node_id in range(len(words)):
        node_layers = [level for level in hnsw.graphs if node_id in hnsw.graphs[level]]
        nodes.append(GraphNode(id=node_id, word=words[node_id], layers=node_layers))

    # 2. Extract edges deduplicated per layer
    edges = []
    for layer, adjacency in hnsw.graphs.items():
        layer_edges = set()
        for source, neighbors in adjacency.items():
            for target in neighbors:
                # Deduplicate bidirectional connections per layer
                edge_pair = (min(source, target), max(source, target))
                layer_edges.add(edge_pair)

        for src, dst in layer_edges:
            edges.append(GraphEdge(source=src, target=dst, layer=layer))

    return GraphResponse(nodes=nodes, edges=edges)


@app.get(
    "/benchmark",
    response_model=BenchmarkResponse,
    status_code=status.HTTP_200_OK,
)
async def get_benchmark():
    """Execute query recall benchmarks across 50 random seeded queries."""
    stats = run_benchmark(
        app.state.hnsw, app.state.words, app.state.vectors, num_queries=50
    )
    return BenchmarkResponse(
        avg_hnsw_time_ms=stats["avg_hnsw_time_ms"],
        avg_brute_force_time_ms=stats["avg_brute_force_time_ms"],
        avg_recall=stats["avg_recall"],
        queries_run=stats["queries_run"],
    )
