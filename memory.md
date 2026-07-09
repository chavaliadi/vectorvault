# Memory — VectorVault Session

Last updated: 2026-07-09T15:21:55+05:30

## 1. Completed Work

### Module 1: Embeddings Logic & Downloader
- **GloVe Dataset Downloader**: Created `backend/download_glove.py` to download `glove.6B.50d.txt` using Hugging Face LFS mirror and Stanford ZIP fallback. Successfully verified 171MB dataset locally.
- **Vector Embedding Loader & Utilities**: Implemented `backend/embeddings.py` featuring `load_glove` (loads up to 5,000 words), `cosine_distance` (computes distances with similarity clipping), and `word_to_vector` (maps words to indices).
- **Unit Testing Suite**: Created `tests/test_embeddings.py` validating loader checks, distance bounds, and lookups (9/9 tests passing).

### Module 2A: HNSW Query Routing & Navigation
- **HNSW Class & Routing Implementation**: Implemented `backend/hnsw.py` initialization and graph representation.
- **Search Operations**: Implemented `_search_layer` (heap-based beam search) and `query` (greedy upper-layer descent with `ef=1`, Layer 0 beam search).
- **Mock Routing Tests**: Created `tests/test_hnsw.py` to mock a 5-node, 2-layer graph and verify traversal correctness, sorted results, and log step schemas.

### Module 2B: HNSW Insertion & Graph Construction
- **Index Construction**: Implemented level selection (`_random_level` with domain-safe log limits), neighbor selection (`_select_neighbors`), and `insert()` in `backend/hnsw.py`.
- **Bidirectional Linking & Pruning**: Configured bidirectional edge creation during insertion. When link lists exceed $M$, pruning is performed locally, sorting neighbors of node $X$ by their distance to $X$ itself.
- **Strict Boundary Checks**: Enforces `ValueError` checks on insert for duplicated IDs, negative IDs, malformed vector dimensions, and NaN/Inf coordinates.
- **Expanded Test Suite**: Added HNSW tests verifying validations, exponential decay distribution, degree limit bounds, no duplicate links, and graph connectivity.

## 2. Architectural Decisions
- **Similarity Clipping**: Documented the addition of similarity clipping (`[-1.0, 1.0]`) in `cosine_distance` in `docs/DECISIONS.md`. This defends against floating-point precision errors producing values like `1.0000001` which would break distance calculations.
- **Python Version Update**: Formally updated python version targets in `docs/PROJECT_PLAN.md` and `docs/DEVELOPMENT_RULES.md` from `3.11` to `3.13` to match the local development environment.
- **Deployment Platform Pivot**: Removed Render references from `docs/PROJECT_PLAN.md` and marked deployment platforms as undecided.
- **Greedy routing reuse**: Implemented greedy routing on upper layers by reusing `_search_layer` with `ef=1`, rather than defining a separate greedy search function. This keeps the code DRY and simplified.
- **Defensive search limits**: Enforced `ef = max(ef, k)` inside `query` to prevent errors when querying for more elements than the search beam size.
- **Negated max-heap**: Utilized negative distance mapping to leverage Python's standard `heapq` module as a max-heap for result tracking.
- **Duplicate ID Rejection**: Insertions raise `ValueError` on ID collision (rather than overwriting) to safeguard against graph structural corruption.
- **Directed Pruning Connectivity**: Pruning is executed locally at the pruned node's coordinates. This creates directed graph edges that satisfy the "Insert must never disconnect the graph" invariant.

## 3. HNSW Invariants to Preserve
- **Query Mutability**: Query operations must never mutate the graph structure.
- **Graph Connection Preservation**: Insert must never disconnect the graph (every node must have degree $\ge 1$ at each layer it belongs to, unless $N = 1$).
- **Layer 0 Inclusion**: Every node in the index must exist on Layer 0.
- **Adjacency Uniqueness**: Neighbor lists must contain unique node IDs (no duplicates).
- **Degree Limit Bounds**: No node's link list can exceed the threshold $M_{max} = M$ at any layer.
- **Cosine Distance Source**: `cosine_distance` must be imported only from `backend.embeddings`.

## 4. Verification
- **Automated Tests**: Total of 15 tests (9 for embeddings, 6 for HNSW) passing successfully in `0.34s` via `pytest`.
- **Review Outcomes**: 
  - Module 1 Approved (no issues found).
  - Module 2A Approved (no issues found).
  - Module 2B implemented and tested. Pending final integration review of the complete HNSW module.
- **Code Quality**: Reformatted with `black` and verified compliant.

## 5. Current Project State
- **Module 1 (embeddings.py & download_glove.py)**: Complete and verified.
- **Module 2 (hnsw.py)**: Feature complete. Awaiting final integration review and refinements.
- **Module 3 (FastAPI Backend)**: Not started.

## 6. Known Technical Debt
- **Lazy Logging**: Convert eager f-string logs to lazy logging (`logger.warning("...", args)`) in performance-sensitive areas.
- **Case Sensitivity**: Lowercase coercion at the search query boundary.
- **Linear Lookup**: Replace $O(N)$ list search in `word_to_vector` with $O(1)$ dictionary lookup if needed.

## 7. Next Session Plan
1. Read this memory.
2. Review the complete HNSW implementation (Phase 2A + Phase 2B).
3. Fix any review findings.
4. Verify graph invariants and test coverage.
5. Update `docs/DECISIONS.md` if needed.
6. Commit and push the finalized Module 2.
7. Begin planning Module 3 (FastAPI Backend).
