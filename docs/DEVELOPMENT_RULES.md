# VectorVault — Development Rules

These are the standards every AI-generated or hand-written change must follow. Read this alongside `docs/PROJECT_PLAN.md` before starting any module.

---

## General

- DRY, SOLID, KISS — see Section 5 of PROJECT_PLAN.md for how these apply here specifically.
- Production-quality code only, but don't over-engineer for a 5,000-word, in-memory, single-user demo. No premature abstraction for scale you explicitly decided to skip (Section 7: no Redis, no Docker, no FAISS).
- One module, one responsibility. If `hnsw.py` starts importing FastAPI types, or `main.py` starts doing distance math, stop and move it.
- No dead code, no commented-out blocks left in commits. Delete or don't write it.

## AI Assistant Rules

These apply to any AI coding assistant working in this repo — Antigravity, Claude Code, Cursor, whatever.

- Never invent APIs, classes, or library behavior. If you're not certain a method/parameter exists, say so and check instead of guessing.
- If a requirement is ambiguous, ask — don't silently pick an interpretation and proceed.
- Preserve the architecture described in `docs/PROJECT_PLAN.md`. Don't restructure modules "for cleanliness" mid-task.
- Never rewrite working code unless explicitly asked to. A request to fix bug A is not permission to also refactor function B.
- Never remove functionality without explaining why first.
- Before modifying an existing function, state what's changing and why — then make the change.
- Don't rename files or folders unless requested.
- Prefer extending an existing module over creating a new file for something that fits an existing one.

## Python (backend)

- Python 3.13.
- Type hints on every function signature — `def query(self, vec: np.ndarray, k: int = 10) -> list[SearchResult]`, not bare `def query(self, vec, k=10)`.
- NumPy-style docstrings on every public function/class, minimum: one-line summary, `Parameters`, `Returns`.
- Format with `black`, lint with `ruff`. Run both before every commit.
- No magic numbers. `M=16`, `ef_construction=200` are named constants at the top of `hnsw.py`, not inline literals scattered through the file.
- Functions should generally stay under ~40–60 lines. If a function grows significantly larger, reconsider whether it has more than one responsibility — but don't force a split just to satisfy a line count. `_search_layer()` with step-logging branches may legitimately run long because it's one coherent algorithm; splitting it into five tiny helpers to hit a number would hurt readability, not help it.
- Explicit error handling: a missing word in `word_to_vector()` returns `None` (as PROJECT_PLAN specifies) — never silently returns a zero-vector or raises an uncaught `KeyError` the API has to guess about.
- Every non-trivial function gets a one-line complexity note in its docstring — e.g. `O(log n) expected` for `_search_layer` — since explaining algorithmic complexity is literally an interview talking point for this project.

## Algorithm-specific rules (HNSW is the product — protect it)

- `cosine_distance()` lives in `embeddings.py` only. Every other file imports it. If you catch an AI reimplementing distance math inline in `hnsw.py`, reject the diff.
- No silent parameter tuning. If M, ef_construction, or ef_search change from the documented defaults, that change is logged in `docs/DECISIONS.md` with the before/after recall@10 and timing — not just changed and forgotten.
- `query()` must ship and be verified correct on a random graph *before* `insert()` is implemented, per the KISS ordering in PROJECT_PLAN. Don't let an agent implement both at once because it's "more efficient."
- Recall@10 is a required, not optional, printout of `benchmark.py`. Never merge an HNSW change without re-running the benchmark and eyeballing the number.
- Step logging (`record_steps=True`) must never change traversal behavior — it's an observation hook, not a control-flow branch. If adding a log line changes which node gets visited next, that's a bug, not a quirk.

## Performance

- Profile before optimizing — don't guess where the bottleneck is.
- Prefer NumPy vectorized operations over Python loops where practical, especially in `hnsw.py` and `embeddings.py`.
- Avoid unnecessary copying of arrays (watch for `.copy()` or slicing patterns that duplicate the embedding matrix).
- Every optimization should preserve readability — an unreadable 2x speedup isn't worth it on a 5,000-node in-memory demo.
- Re-run `benchmark.py` after any optimization, not just after correctness changes. A "faster" change that quietly drops recall isn't a win.

## Logging

- Use Python's `logging` module, not `print()`. `print()` is fine for one-off debugging but gets removed before commit.
- INFO for normal execution (index built, server started, query received).
- WARNING for recoverable problems (word not found, falling back to nearest match).
- ERROR for failures (index failed to build, malformed request).
- Remove temporary debug logs before committing — if it was only there to chase one bug, it doesn't belong in the permanent log output.

## React / Frontend

- Functional components with hooks only. No class components.
- Keep components small and single-purpose — `Graph.jsx` renders the graph, `TraversalPlayer.jsx` owns playback state, they don't reach into each other's internals.
- `getNodeColor()` lives once in `utils/nodeColor.js`. Both `Graph.jsx` and any step-info panel import it — never reimplement the yellow/red/green/blue logic in two places.
- Step data shape is defined once (a `Step` type/interface or a documented object shape) and referenced by `TraversalPlayer`, `Graph`, and `ComparisonPanel` consistently.
- No inline styles for anything beyond one-off layout tweaks; keep visual patterns consistent so `/imprint` has something coherent to capture.

## D3-specific

- Default force-simulation parameters first (per KISS). Only tune repulsion/link-distance after visually confirming the default is unreadable — and note *why* in `docs/DECISIONS.md` if you do.
- D3 owns the DOM inside its own container; React owns everything around it. Don't let D3 mutate React-rendered nodes directly, and don't let React re-render D3's SVG subtree on every state tick.

## API (FastAPI)

- REST, proper HTTP status codes (404 for unknown word, 422 for bad payload — not a 200 with an error string in the body).
- Request/response validation via Pydantic models — no raw dict payloads.
- `POST /query` returns everything the frontend needs in one call (steps + results + comparison stats), per PROJECT_PLAN's Interface Segregation note. Don't split this into three round-trips later "for cleanliness."
- Consistent response shape across endpoints — same key naming style (`snake_case` in JSON is fine, just be consistent) across `/query`, `/graph`, `/benchmark`.

## Testing

- Every phase milestone (per PROJECT_PLAN Section 3) gets at least a smoke test before moving to the next phase — e.g. after Phase 1, a script that asserts `query("king")` returns `"queen"` in the top 10.
- `benchmark.py`'s recall@10 run counts as your regression test for HNSW correctness. If a change tanks recall, that's a failing test, treat it like one.
- No test deletion to make a red suite green. Fix the code or fix the test's assumption — explain which.

## Git / Commits

- Commit at every phase milestone, not just at the end of a session.
- Commit messages describe *what* and *why* in one line — `"Add step logging to _search_layer for traversal visualization"`, not `"updates"`.
- Never commit the GloVe data file (`data/*.txt` is gitignored per PROJECT_PLAN — keep it that way).

## Documentation

- `docs/DECISIONS.md` — new file, log every non-default parameter choice, architecture pivot, or "I tried X, it didn't work, did Y instead." This is what makes your `/remember` summaries and interview talking points accurate instead of reconstructed from memory later.
- README gets the benchmark table (Section 9 of PROJECT_PLAN) filled in with real numbers before you call the project done — no placeholder `0.XX` left in the final version.
- Fill in Section 10 (Lessons Learned) as you go, not all at once at the end — you'll forget the reasoning behind early trade-offs otherwise.

## Before Every Commit

Verify:
- Ruff passes
- Black formatting passes
- Smoke tests pass
- `benchmark.py` executed and recall@10 checked (if HNSW code changed)
- No leftover `TODO` comments
- No dead code
- README updated if user-facing behavior changed

## Session discipline (ties into your Agent Skills workflow)

- No `/implement` without a prior `/architect` for anything that isn't a trivial one-file change.
- `/review` after each phase milestone, before moving to the next phase — not just at the very end.
- `/recover`: paste raw terminal output/stack trace, never paraphrase.
- `/remember save` at the end of every session, even short ones — this file plus PROJECT_PLAN plus DECISIONS.md is what the next session reads before touching code.
