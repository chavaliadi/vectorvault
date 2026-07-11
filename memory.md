# Memory — VectorVault Session

Last updated: 2026-07-11T17:48:47+05:30

## 1. Completed Work

### Module 1: Embeddings Logic & Downloader
- **GloVe Dataset Downloader**: Created `backend/download_glove.py` to download `glove.6B.50d.txt` using Hugging Face LFS mirror and Stanford ZIP fallback. Successfully verified 171MB dataset locally.
- **Vector Embedding Loader & Utilities**: Implemented `backend/embeddings.py` featuring `load_glove` (loads up to 5,000 words), `cosine_distance` (computes distances with similarity clipping), and `word_to_vector` (maps words to indices).
- **Unit Testing Suite**: Created `tests/test_embeddings.py` validating loader checks, distance bounds, and lookups (9/9 tests passing).

### Module 2: HNSW Algorithm Core (`hnsw.py`)
- **HNSW Class & Routing Implementation**: Implemented `backend/hnsw.py` initialization and graph representation.
- **Search Operations**: Implemented `_search_layer` (heap-based beam search) and `query` (greedy upper-layer descent with `ef=1`, Layer 0 beam search).
- **Mock Routing Tests**: Created `tests/test_hnsw.py` to mock a 5-node, 2-layer graph and verify traversal correctness, sorted results, and log step schemas.
- **Index Construction**: Implemented level selection (`_random_level` with domain-safe log limits), neighbor selection (`_select_neighbors`), and `insert()` in `backend/hnsw.py`.
- **Bidirectional Linking & Pruning**: Configured bidirectional edge creation during insertion. When link lists exceed $M$, pruning is performed locally, sorting neighbors of node $X$ by their distance to $X$ itself.
- **Strict Boundary Checks**: Enforces `ValueError` checks on insert for duplicated IDs, negative IDs, malformed vector dimensions, and NaN/Inf coordinates.
- **Expanded Test Suite**: Added HNSW tests verifying validations, exponential decay distribution, degree limit bounds, no duplicate links, and graph connectivity.

### Module 3: FastAPI Backend & CLI Benchmark
- **Seeded Benchmark Engine**: Implemented `backend/benchmark.py` running Recall@k and query latency calculations over random queries. Added query reproducibility (`seed=42`) and formatted CLI output as a clean ASCII metrics table.
- **API Server & Routing**: Implemented `backend/main.py` with:
  - Lifespan context manager creating an $O(1)$ word-to-index lookup and populating the HNSW index, with progressive startup logging indicators.
  - `POST /query` endpoint returning HNSW search hits, exact brute force matching (delegating metrics to `embeddings.py`), logged trajectory hops, and query execution statistics (recall, latency, nodes visited). Includes `id` inside `SearchResult` payload.
  - `GET /graph` endpoint outputting nodes with complete layer lists (`layers: list[int]`) and layer edges (deduplicated per layer).
  - `GET /benchmark` endpoint serving aggregated recall statistics.
- **API Routing Integration Tests**: Implemented `tests/test_api.py` validating endpoint schemas, validations (404 and 422), and startup crash handling (halting lifespan startup with `FileNotFoundError` if dataset is missing).

### Module 4: Frontend Visualization (React + D3.js)
- **Scaffolded Workspace**: Created React + Vite environment under the `frontend/` directory using standard templates.
- **Graph & Zoom Canvas**: Built `GraphCanvas.jsx` wrapping static force layouts (cooling engine after 100 ticks to preserve CPU), Zoom/Pan controls, and selective link pruning (hiding Layer 0 hairballs to keep traversal paths readable).
- **Interactive Inspector**: Implemented `NodeInspector.jsx` mapping all layers the selected node resides on and rendering neighbors as clickable search portal buttons.
- **Playback controller**: Created `TraversalPlayer.jsx` supplying play/pause ticks, step-timeline seeks, and speed adjustments.
- **API wrapper & Shared Styling**: Wrote `api.js` for query/graph endpoints and constructed custom theme variables in `index.css` supporting dark mode and loaders.
- **Side-by-side Comparisons**: Implemented `ComparisonPanel.jsx` rendering latencies and HNSW vs Brute Force results.
- **Build Verified**: Compiled production bundle successfully with zero warnings: `npm run build`.

## 2. Architectural Decisions
- **Similarity Clipping**: Documented the addition of similarity clipping (`[-1.0, 1.0]`) in `cosine_distance` in `docs/DECISIONS.md`. This defends against floating-point precision errors producing values like `1.0000001` which would break distance calculations.
- **Python Version Update**: Formally updated python version targets in `docs/PROJECT_PLAN.md` and `docs/DEVELOPMENT_RULES.md` from `3.11` to `3.13` to match the local development environment.
- **Deployment Platform Pivot**: Removed Render references from `docs/PROJECT_PLAN.md` and marked deployment platforms as undecided.
- **Greedy routing reuse**: Implemented greedy routing on upper layers by reusing `_search_layer` with `ef=1`, rather than defining a separate greedy search function. This keeps the codebase DRY and simplified.
- **Defensive search limits**: Enforced `ef = max(ef, k)` inside `query` to prevent errors when querying for more elements than the search beam size.
- **Negated max-heap**: Utilized negative distance mapping to leverage Python's standard `heapq` module as a max-heap for result tracking.
- **Duplicate ID Rejection**: Insertions raise `ValueError` on ID collision (rather than overwriting) to safeguard against graph structural corruption.
- **Directed Pruning Connectivity**: Pruning is executed locally at the pruned node's coordinates. This creates directed graph edges that satisfy the "Insert must never disconnect the graph" invariant.
- **Unified Benchmark Library**: Built the benchmark logic into a clean CLI module that main endpoints reuse directly, ensuring consistency and preventing duplication of index setup logic.
- **FastAPI Layer Delegation Constraint**: Explicitly enforced that the API routes do not perform vector calculations or traverse HNSW subgraphs. All calculations are delegated strictly to lower layers.
- **D3 DOM Isolation & Cooling**: Separated D3 DOM nodes from React’s virtual DOM update cycle. Runs force simulations offline for 100 ticks and halts them before render to prevent CPU lockup.
- **Traversal Edge Highlighting**: Limits Layer 0 edge drawings exclusively to active search path links and neighbor inspection focus, preventing screen clutter.

## 3. HNSW Invariants to Preserve
- **Query Mutability**: Query operations must never mutate the graph structure.
- **Graph Connection Preservation**: Insert must never disconnect the graph (every node must have degree $\ge 1$ at each layer it belongs to, unless $N = 1$).
- **Layer 0 Inclusion**: Every node in the index must exist on Layer 0.
- **Adjacency Uniqueness**: Neighbor lists must contain unique node IDs (no duplicates).
- **Degree Limit Bounds**: No node's link list can exceed the threshold $M_{max} = M$ at any layer.
- **Cosine Distance Source**: `cosine_distance` must be imported only from `backend.embeddings`.

## 4. Verification
- **Automated Tests**: Total of 17 tests (9 for embeddings, 6 for HNSW, 2 for API) passing successfully in `29.46s` via `pytest`.
- **Vite Compilation**: React + Vite workspace compiled successfully via `npm run build` in `519ms`.
- **Review Outcomes**: 
  - Module 1 Approved.
  - Module 2 Approved.
  - Module 3 Approved.
  - Module 4 implemented, built, and compiled cleanly.

## 5. Current Project State
- **Module 1 (embeddings.py & download_glove.py)**: Complete and verified.
- **Module 2 (hnsw.py)**: Complete and verified.
- **Module 3 (main.py & benchmark.py)**: Complete and verified.
- **Module 4 (React + Vite + D3 Frontend)**: Complete, compiled, and verified.
- **Integration Review & Deployment**: Ready to begin.

## 6. Known Technical Debt
- **Lazy Logging**: Convert eager f-string logs to lazy logging (`logger.warning("...", args)`) in performance-sensitive areas.
- **Case Sensitivity**: Coercion to lowercase inside index queries is now handled at the API boundary, but direct low-level queries remain case-sensitive.
- **Linear Lookup**: `embeddings.word_to_vector` still uses $O(N)$ lookup. The API routes bypass this by using the $O(1)$ startup dictionary mapping `word_to_index`.

## 7. Next Session Plan
1. Read this memory.
2. Review the entire application (running FastAPI server and loading Vite frontend locally).
3. Verify D3.js force-directed cluster layout, timeline playback operations, and inspector selections.
4. Finalize the project documentation and benchmarks list in README.md.
