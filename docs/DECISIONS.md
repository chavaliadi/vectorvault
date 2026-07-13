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
- **Decision**: Target Python version `3.13` and set deployment hosting as Undecided.
- **Reasoning**: Pinning Python to `3.13` matches the current local runtime environment. Removing hosting configurations from Render focuses the scope purely on running the dashboard locally in development mode.
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
