# VectorVault — Architecture & Design Decisions

## [2026-07-08] Similarity Clipping in Cosine Distance
- **Decision**: Clip similarity to the range `[-1.0, 1.0]` in `cosine_distance` before computing distance.
- **Reasoning**: Floating-point precision issues in computer arithmetic can occasionally produce cosine similarities slightly outside the theoretical range of `[-1.0, 1.0]` (e.g. `1.0000001` or `-1.0000001`). This leads to distances outside `[0.0, 2.0]`. Adding defensive clipping ensures correct and safe distance bounds.
- **Code Reference**: [cosine_distance in backend/embeddings.py](file:///Users/srinivasch/Documents/Projects/VectorVault/backend/embeddings.py#L109)

## [2026-07-09] Data Structure Selection for self.vectors
- **Decision**: Store vectors as a dictionary `self.vectors: dict[int, np.ndarray]` rather than a list.
- **Reasoning**: While current indices map contiguous integers from `0` to `len(words)-1`, the dictionary structure matches the original specifications in `PROJECT_PLAN.md` and provides flexibility for arbitrary node identifiers (such as sparse or hash-based keys). A timing benchmark comparing dict lookups vs list lookups inside hot loops across 200 random queries on the loaded index (N=5000) measured no meaningful latency difference (Dict: 1.726 ms per query vs List: 1.729 ms per query, or a -0.14% difference). Because lookup times are dominated by `cosine_distance` calculations, dictionary overhead is negligible.
- **Code Reference**: [HNSW.__init__ in backend/hnsw.py](file:///Users/srinivasch/Documents/Projects/VectorVault/backend/hnsw.py#L40)

## [2026-07-09] Greedy Routing Reuse of _search_layer with ef=1
- **Decision**: Avoid code duplication by reusing the beam search `_search_layer` with `ef=1` for greedy upper-layer routing.
- **Reasoning**: Beam search with a candidate beam size of 1 is mathematically equivalent to greedy search. Reusing the general heap-based routing prevents code duplication and keeps code footprint compact.
- **Code Reference**: [HNSW.query in backend/hnsw.py](file:///Users/srinivasch/Documents/Projects/VectorVault/backend/hnsw.py#L193-L203)

## [2026-07-10] Pruning Strategy
- **Decision**: Implement a simple distance-based closest $M$ neighbors selection (Algorithm 3 from the HNSW paper) inside `_select_neighbors`.
- **Reasoning**: Simplifies core implementation for educational readability. It preserves structural index properties without the additional complexity of the heuristic neighbor selection (Algorithm 4).
- **Code Reference**: [HNSW._select_neighbors in backend/hnsw.py](file:///Users/srinivasch/Documents/Projects/VectorVault/backend/hnsw.py#L315-L336)

## [2026-07-10] Defensive Floor on ef_search
- **Decision**: Enforce a defensive floor `ef = max(ef, k)` inside query routes.
- **Reasoning**: Prevents structural errors or return bounds exhaustion if users query for more nearest neighbors than the search candidate beam size.
- **Code Reference**: [HNSW.query in backend/hnsw.py](file:///Users/srinivasch/Documents/Projects/VectorVault/backend/hnsw.py#L209)

## [2026-07-10] Negated Max-Heap results tracking
- **Decision**: Use standard python `heapq` (a min-heap) with negated distances `(-dist, node_id)` to model a max-heap tracking the best $ef$ results.
- **Reasoning**: Standardizes heap structures on Python's built-in `heapq` module without requiring external library imports, maintaining pure Python dependencies.
- **Code Reference**: [HNSW._search_layer in backend/hnsw.py](file:///Users/srinivasch/Documents/Projects/VectorVault/backend/hnsw.py#L265-L272)

## [2026-07-10] Duplicate ID Rejection
- **Decision**: Explicitly raise a `ValueError` inside `insert` if the target `node_id` is already occupied.
- **Reasoning**: Prevents vector coordinates overwriting which could lead to structural metadata mismatches and broken references across layered graphs.
- **Code Reference**: [HNSW.insert in backend/hnsw.py](file:///Users/srinivasch/Documents/Projects/VectorVault/backend/hnsw.py#L63-L64)

## [2026-07-10] Directed Pruning Connectivity
- **Decision**: Run neighbor selection pruning at the coordinates of the neighbor node itself rather than the query vector.
- **Reasoning**: By measuring candidate relative proximity from the neighbor node's coordinates, we construct local directed links that satisfy graph connectivity invariants (preventing isolated components).
- **Code Reference**: [HNSW.insert in backend/hnsw.py](file:///Users/srinivasch/Documents/Projects/VectorVault/backend/hnsw.py#L134-L144)

## [2026-07-11] Python Version Pin & Deployment Platform Selection
- **Decision**: Target Python version `3.13` and keep deployment hosting local-only.
- **Reasoning**: Pinning Python to `3.13` matches the current local runtime environment. Storing and constructing the HNSW graph over the 5,000-word GloVe dataset on start requires substantial initialization and memory processing; operating as a local-only dashboard avoids sluggish startup latencies and memory failures typical of free-tier cloud container configurations.
- **Code Reference**: [PROJECT_PLAN.md](file:///Users/srinivasch/Documents/Projects/VectorVault/docs/PROJECT_PLAN.md#L411-L415) and [DEVELOPMENT_RULES.md](file:///Users/srinivasch/Documents/Projects/VectorVault/docs/DEVELOPMENT_RULES.md#L6-L10)

## [2026-07-13] D3 Static Cooling layout
- **Decision**: Pre-run the force-directed simulation for `110` ticks and freeze it via `simulation.stop()` on initial graph mount.
- **Reasoning**: 5,000 node coordinate layouts cause major browser CPU locking if calculated continuously. Running the simulation offline on mount freezes coordinates statically, saving resources.
- **Code Reference**: [GraphCanvas.jsx](file:///Users/srinivasch/Documents/Projects/VectorVault/frontend/src/components/GraphCanvas.jsx#L46-L50)

## [2026-07-13] Layer 0 Edge Hiding
- **Decision**: Filter out Layer 0 connections from the static graph view, rendering Layer 1+ connections only.
- **Reasoning**: Layer 0 contains 5,000 dense clusters causing a cluttered "hairball" visual pattern. Hiding Layer 0 links ensures the graph layout is legible and clean.
- **Code Reference**: [GraphCanvas.jsx](file:///Users/srinivasch/Documents/Projects/VectorVault/frontend/src/components/GraphCanvas.jsx#L71)

## [2026-07-13] React-to-D3 State Bridge
- **Decision**: Separate React states updates from D3.js SVG rendering cycles using direct element selections inside a separate `useEffect` hook.
- **Reasoning**: Isolates D3’s SVG DOM management from React’s virtual DOM reconciliations. Playback changes alter colors, sizes, and active traversal lines instantly without re-rendering SVG subtrees.
- **Code Reference**: [GraphCanvas.jsx](file:///Users/srinivasch/Documents/Projects/VectorVault/frontend/src/components/GraphCanvas.jsx#L118-L163)

## [2026-08-16] External HNSW Reference Cross-Validation & Trade-off Parameter Sweep
- **Decision**: Introduce `backend/validate.py` to cross-validate VectorVault against `hnswlib` (the reference C++ HNSW implementation) and sweep $M \in \{8, 16, 32\}$ and $ef\_search \in \{10, 50, 100, 200\}$.
- **Reasoning**: Internal brute-force comparisons only verify local math consistency; benchmarking against `hnswlib` proves that VectorVault's graph routing achieves structural parity with standard production implementations (100% Top-10 ID overlap and identical recall metrics). Sweeping the $M \times ef\_search$ grid maps the exact Recall vs. Query Latency trade-off curve across sparse vs. dense graph connectivity choices.
- **Code Reference**: [backend/validate.py](file:///Users/srinivasch/Documents/Projects/VectorVault/backend/validate.py)

## [2026-08-18] Fully Deterministic HNSW Index Construction via Seeded RNG
- **Decision**: Add an optional `seed: int | None = None` parameter to `HNSW.__init__`, storing `self.rng = np.random.default_rng(seed)` on the instance and using `self.rng.uniform()` inside `_random_level()`. Default to `seed=42` across `backend/benchmark.py`, `backend/validate.py`, `backend/main.py`, and test suites.
- **Reasoning**: Previously, `_random_level()` drew from global unseeded `np.random.uniform()`, causing probabilistic graph topology differences on every index build and producing minor recall discrepancies (~0.948 vs 0.954) on identical configs. Encapsulating RNG state inside `HNSW` instances guarantees that two index builds with the same seed yield 100% byte-identical graph structures (`self.graphs`), resulting in reproducible evaluation metrics (`Recall@10 = 0.9460` across both `benchmark.py` and `validate.py`).
- **Code Reference**: [HNSW.__init__ in backend/hnsw.py](file:///Users/srinivasch/Documents/Projects/VectorVault/backend/hnsw.py#L25-L40), [run_benchmark in backend/benchmark.py](file:///Users/srinivasch/Documents/Projects/VectorVault/backend/benchmark.py#L109), and [run_hnswlib_validation in backend/validate.py](file:///Users/srinivasch/Documents/Projects/VectorVault/backend/validate.py#L134)


