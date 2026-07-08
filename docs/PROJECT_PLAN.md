# VectorVault
**Tagline:** Visualize how vector search actually works — watch HNSW graph traversal happen step by step on real word embeddings.

---

## 1. Purpose

### Problem it solves
Every developer building RAG systems uses a vector database — Pinecone, Qdrant, Weaviate — but almost none can explain what happens when they call `.query()`. They know it returns similar results. They don't know how.

HNSW (Hierarchical Navigable Small World) is the algorithm powering approximate nearest neighbor search in every major vector database. It's fast, accurate, and almost entirely invisible to the people using it.

VectorVault makes it visible.

### What it is
A visualization-first educational tool that:
- Builds an HNSW index from scratch in Python using real GloVe word embeddings
- Instruments every step of the graph traversal
- Renders the full graph and animates traversal hop-by-hop in the browser via D3.js
- Shows a live side-by-side comparison of HNSW vs brute-force search

### Why it matters for your portfolio
After KnowledgeHub (which uses pgvector) and Aurelin (AST analysis), recruiters will ask "how does a vector database actually work?" VectorVault gives a concrete, visual answer. You say: "I implemented HNSW from scratch and built a visualization that shows graph traversal step by step." That moves the conversation from using AI tools to understanding AI infrastructure.

---

## 2. How the Project Works (End-to-End User Flow)

```
User opens VectorVault
        │
        ▼
Sees a D3 force-directed graph
  → 5,000 word embeddings as nodes
  → HNSW connections as edges
  → Nodes colored by HNSW layer
  → Layer 0 = all nodes (dense), Layer 1+ = sparse long-range links
        │
        ▼
Types a word in the search bar e.g. "king"
  → Frontend sends POST /query { word: "king" }
        │
        ▼
FastAPI backend
  → Looks up GloVe vector for "king"
  → Runs HNSW search with step logging enabled
  → Simultaneously runs brute-force exact search
  → Returns { steps, final_results, brute_force_results, comparison_stats }
        │
        ▼
TWO panels update simultaneously:

LEFT — Traversal Visualization
  → Yellow: currently visiting this node
  → Red: candidate evaluated but rejected
  → Green: candidate selected as best neighbor
  → Blue: final top-10 results
  → Player: Play / Pause / Step Forward / Step Back / Speed slider

RIGHT — Comparison Panel (new)
  ┌─────────────────────┬─────────────────────┐
  │   HNSW (yours)      │   Brute Force        │
  ├─────────────────────┼─────────────────────┤
  │ Nodes visited: 67   │ Nodes visited: 5000  │
  │ Time: 2.1ms         │ Time: 48ms           │
  │ Results: queen,     │ Results: queen,      │
  │ prince, royal...    │ prince, royal...     │
  │ Recall@10: 0.93     │ Recall@10: 1.0       │
  └─────────────────────┴─────────────────────┘
  Teaching point: "HNSW visited 1.3% of nodes, got 93% of the same answers, 23× faster"
        │
        ▼
User clicks any node
  → Node inspector panel opens
  → Shows: word, layer, neighbors, distance from query
        │
        ▼
Benchmark panel (always visible in header)
  → Recall@10 across 50 random queries
  → Average HNSW time vs brute-force time
```

---

## 3. Build Roadmap

### Phase 1 — HNSW Core (Week 1)
**Goal:** Working HNSW in Python with step logging. No API, no frontend.
**Milestone:** Query "king" → returns ["queen", "prince", ...] with logged steps printed to console.

- Download GloVe 50d, write loader, slice to 5,000 words
- Implement `HNSW` class: `_random_level()`, `_search_layer()`, `insert()`, `query()`
- Add `record_steps=True` flag to `_search_layer()` logging every hop
- Write `benchmark.py`: recall@10 vs brute-force on 50 random queries
- Test in plain Python script, verify output makes semantic sense

### Phase 2 — FastAPI Backend (Week 1–2)
**Goal:** REST API serving traversal steps, graph structure, and comparison data.
**Milestone:** `curl POST /query {"word":"king"}` returns JSON with steps + comparison stats.

- Write `main.py` with FastAPI + CORS
- Build HNSW index at startup (load GloVe → insert all vectors)
- `POST /query` — returns steps, HNSW results, brute-force results, comparison stats
- `GET /graph` — returns all nodes + edges for D3
- `GET /benchmark` — runs recall@10 computation, returns numbers

### Phase 3 — D3 Visualization (Week 2–3)
**Goal:** React frontend with force graph and traversal animation.
**Milestone:** Type "king" and watch traversal animate across the graph.

- React + Vite project setup
- Fetch `/graph` on load, render D3 force simulation
- Color nodes by HNSW layer
- Connect search bar to `POST /query`
- Traversal player: currentStep state, play/pause/step controls
- Node color logic based on step role (yellow/red/green/blue)

### Phase 4 — Comparison Mode + Polish (Week 3)
**Goal:** Side-by-side comparison panel + deployment.
**Milestone:** Project is live, comparison panel works, benchmark published in header.

- Comparison panel showing HNSW vs brute-force stats per query
- Node inspector panel on click
- Benchmark panel in header (recall@10, time comparison)
- Deploy FastAPI and React (Deployment target: Undecided)
- README with benchmark table
- 60-second demo recording

---

## 4. Module Breakdown

### Module 1: `embeddings.py`
**Purpose:** Load GloVe word vectors and provide vector utility functions. Single responsibility — nothing else.

**What it does:**
- Reads `glove.6B.50d.txt` line by line
- Parses each line into word + 50-dimensional float32 vector
- Keeps first 5,000 words (graph remains renderable)
- Provides `cosine_distance(a, b)` used throughout the system

**Workflow:**
```
glove.6B.50d.txt
    │
    ▼
load_glove(path, max_words=5000)
    │ For each line:
    │   words.append(parts[0])           → "king"
    │   vectors.append(parts[1:] as f32) → [0.50451, 0.68607, ...]
    │
    ▼
Returns (words: list[str], vectors: np.ndarray[5000, 50])
```

**Key functions:**
- `load_glove(path, max_words)` → `(words, vectors)`
- `cosine_distance(a, b)` → `float` — defined once here, imported everywhere
- `word_to_vector(word, words, vectors)` → `np.ndarray | None`

---

### Module 2: `hnsw.py`
**Purpose:** The core of the project. From-scratch HNSW implementation with step logging. Single responsibility — pure graph construction and search.

**What it does:**
- Maintains a hierarchical graph (layer 0 = dense/all nodes, layer 1+ = sparse/fewer nodes)
- Inserts vectors by assigning them to random levels using exponential distribution
- Searches by entering at the top layer and descending to layer 0
- Records every traversal step when `record_steps=True`

**Workflow — Insert:**
```
New vector arrives
    │
    ▼
_random_level() → assign entry level
  (most nodes: level 0, fewer: level 1, even fewer: level 2)
    │
    ▼
For each layer from max_level down to 0:
  _search_layer(query, entry_points, ef=1, layer)  ← greedy, 1 best neighbor
  At target level: ef=ef_construction (wider beam)
    │
    ▼
Add bidirectional edges to M nearest neighbors per layer
Prune any node exceeding M_max connections
    │
    ▼
Update entry_point if new node's level > current max_level
```

**Workflow — Search with step logging:**
```
Query vector + entry_point
    │
    ▼
Layers max_level → 1: greedy descent (always move closer)
  Record: { current, evaluating, distance, accepted=True/False, layer }
    │
    ▼
Layer 0: beam search with ef candidates in a max-heap
  For each candidate in beam:
    Evaluate all neighbors
    If closer than worst in beam → add, record accepted=True
    If worse → record accepted=False
    │
    ▼
Return top-k from beam + all recorded steps
```

**Class interface:**
```python
class HNSW:
    def __init__(self, M=16, ef_construction=200)
    def insert(self, vector: np.ndarray, node_id: int) -> None
    def query(self, vector: np.ndarray, k: int = 10,
              record_steps: bool = False) -> tuple[list, list[Step]]
    def _random_level(self) -> int
    def _search_layer(self, query, entry_points, ef, layer,
                      record_steps=False) -> list
    def _select_neighbors(self, candidates, M) -> list
```

**Step log entry:**
```python
{
    "current": int,      # node being processed
    "evaluating": int,   # neighbor being evaluated
    "distance": float,   # distance from query to evaluating node
    "accepted": bool,    # added to beam or rejected
    "layer": int         # which layer this hop is on
}
```

---

### Module 3: `benchmark.py`
**Purpose:** Measure and publish recall@10 vs brute-force. Kept separate from main.py — single responsibility.

**What it does:**
- Selects 50 random query vectors (seed=42 for reproducibility)
- Per query: runs HNSW and brute-force, computes overlap
- Returns recall@10 and average query times for both

**Workflow:**
```
50 random queries (seed=42)
    │
    ├── HNSW search → top-10 (approximate, fast)
    └── Brute-force → compute distance to all 5,000 → top-10 (exact, slow)
    │
    ▼
overlap = |HNSW results ∩ brute-force results| / 10
recall@10 = mean(overlap across 50 queries)
    │
    ▼
Return { recall_at_10, hnsw_avg_ms, brute_force_avg_ms }
```

---

### Module 4: `main.py` (FastAPI)
**Purpose:** REST API layer only. Does not contain business logic — delegates to `hnsw.py`, `embeddings.py`, `benchmark.py`.

**Endpoints:**

`POST /query { word: string }`
```
→ Lookup GloVe vector for word
→ HNSW search with record_steps=True
→ Brute-force search (always runs for comparison)
→ Return {
    steps: Step[],
    hnsw_results: [{word, distance}],
    brute_force_results: [{word, distance}],
    comparison: {
      hnsw_nodes_visited: int,
      brute_force_nodes_visited: int,  ← always 5000
      hnsw_time_ms: float,
      brute_force_time_ms: float,
      recall_this_query: float         ← overlap for this specific query
    }
  }
```

`GET /graph`
```
→ Return { nodes: [{id, word}], edges: [{source, target, layer}] }
```

`GET /benchmark`
```
→ Run benchmark.py on 50 queries
→ Return { recall_at_10, hnsw_avg_ms, brute_force_avg_ms }
```

---

### Module 5: `Graph.jsx`
**Purpose:** D3 force-directed graph canvas. Renders nodes and edges, colors nodes based on traversal state. UI only — no business logic.

**Node coloring logic:**
```
For each node, given steps[0..currentStep]:

Is it in final_results?         → Blue   (#3B82F6)
Was it "current" in any step?   → Yellow (#F59E0B)
Was it "evaluating" + accepted? → Green  (#10B981)
Was it "evaluating" + rejected? → Red    (#EF4444)
Default                         → Gray   (#E5E7EB)
```

**Workflow:**
```
Mount → fetch GET /graph → { nodes, edges }
    │
    ▼
D3 forceSimulation:
  forceLink(edges).distance(30)
  forceManyBody().strength(-50)
  forceCenter(width/2, height/2)
    │
    ▼
SVG drawn: lines for edges (thin/light for layer 0, thicker for layer 1+)
           circles for nodes
    │
    ▼
On each tick: update x,y positions of lines and circles
    │
    ▼
When currentStep prop changes:
  Recolor all nodes per coloring logic above
  Highlight the active edge (source → target of current step)
    │
    ▼
On node click: fire onNodeClick(nodeId) callback → NodeInspector
```

---

### Module 6: `TraversalPlayer.jsx`
**Purpose:** Controls traversal animation state. Single responsibility — manages currentStep, play/pause/speed. Passes state to Graph.jsx and ComparisonPanel.jsx.

**State:**
```
currentStep: number   (0 to steps.length)
isPlaying:   boolean
speed:       number   (ms per step, default 200ms)
steps:       Step[]   (received as prop)
```

**Workflow:**
```
User searches → parent fetches steps → passed as prop → reset to step 0
    │
Play:   setInterval(() => setCurrentStep(p => p + 1), speed)
Pause:  clearInterval
Step+:  setCurrentStep(p => Math.min(p + 1, steps.length - 1))
Step-:  setCurrentStep(p => Math.max(p - 1, 0))
Reset:  clearInterval + setCurrentStep(0)
    │
On each currentStep change:
  Pass to Graph.jsx (recolor nodes)
  Pass to ComparisonPanel.jsx (show stats up to this step)
  Show: "Layer 1 → evaluating 'monarch' → distance 0.31 → REJECTED"
```

---

### Module 7: `NodeInspector.jsx`
**Purpose:** Shows details when a node is clicked. Read-only display — no state mutation.

**What it displays:**
- Word label
- HNSW layer membership ("exists on layers 0, 1, 2")
- Neighbor words (derived from edges array)
- First 10 vector dimensions as mini bar chart
- Distance from current query (if a search has been run)

**Workflow:**
```
Graph.jsx fires onNodeClick(nodeId)
    │
    ▼
Look up word from nodes array
Find all edges where source or target = nodeId → neighbor list
If current search active: find distance in steps or results
    │
    ▼
Render panel: word, layer, neighbors, vector preview, distance
```

---

### Module 8: `ComparisonPanel.jsx` (new — key differentiator)
**Purpose:** Side-by-side comparison of HNSW vs brute-force for every query. This is the module that teaches the algorithm visually. No other tool shows this.

**What it displays:**
```
┌────────────────────────┬────────────────────────┐
│   YOUR HNSW            │   BRUTE FORCE          │
├────────────────────────┼────────────────────────┤
│ Nodes visited: 67      │ Nodes visited: 5,000   │
│ Time: 2.1ms            │ Time: 48.3ms           │
│ Results:               │ Results:               │
│  1. queen (0.18)       │  1. queen (0.18)  ✓   │
│  2. prince (0.24)      │  2. prince (0.24) ✓   │
│  3. royal (0.26)  ✗    │  3. royal (0.26)       │
│  ...                   │  ...                   │
├────────────────────────┴────────────────────────┤
│ Recall@10: 0.93   Speed gain: 23×               │
│ "HNSW visited 1.3% of nodes, got 93% right"     │
└─────────────────────────────────────────────────┘
```

**Result matching logic:**
- Mark HNSW results that also appear in brute-force with ✓
- Mark ones that don't appear as ✗ (missed)
- These misses are the "approximate" in ANN — showing them honestly is educational

**Workflow:**
```
Props: { hnsw_results, brute_force_results, comparison_stats }
    │
    ▼
Build matched result list:
  For each HNSW result: check if word appears in brute_force_results
  matched = true/false
    │
    ▼
Compute display stats:
  speedup = brute_force_time_ms / hnsw_time_ms
  nodes_pct = (hnsw_nodes_visited / 5000 * 100).toFixed(1)
    │
    ▼
Render two-column layout with stats footer
Update on every new search (receives new props)
```

---

## 5. DRY / SOLID / KISS Principles

### DRY (Don't Repeat Yourself)
- `cosine_distance()` defined once in `embeddings.py`. Imported by `hnsw.py`, `benchmark.py`, `main.py`. Never redefined.
- Brute-force search logic defined once (in `benchmark.py`). `main.py` imports it for the comparison endpoint rather than re-implementing.
- Node coloring logic defined once in a `getNodeColor(nodeId, steps, currentStep)` function. Used by both `Graph.jsx` canvas rendering and the step info panel.
- Step logging format defined once as a TypeScript interface `Step` on the frontend. Used by `TraversalPlayer`, `Graph`, and `ComparisonPanel`.

### SOLID
- **Single Responsibility:** `embeddings.py` only loads data. `hnsw.py` only does graph operations. `benchmark.py` only measures. `main.py` only handles HTTP. Each component has one reason to change.
- **Open/Closed:** HNSW class is open for extension (add a new distance metric by passing a `distance_fn` parameter) without modifying core traversal logic.
- **Interface Segregation:** `POST /query` returns everything the visualization needs in one call rather than requiring multiple requests. Frontend components receive only the props they need — `Graph` doesn't receive quiz data it doesn't use.
- **Dependency Inversion:** `main.py` depends on abstractions (`HNSW`, `load_glove`, `benchmark`) not on implementation details. Swap the distance function without touching the API layer.

### KISS (Keep It Simple)
- Start with M=16, ef_construction=200 (standard documented defaults). Do not tune until you have a failing benchmark.
- D3 force simulation with default parameters first. Tune repulsion/link distance only if the graph looks unreadable.
- No caching layer (Redis), no job queue (BullMQ), no containerization (Docker) for v1. Everything is stateless and in-memory — the simplest architecture that works.
- 5,000 words not 500,000. The algorithm is the point, not the scale.
- Build HNSW `query()` before `insert()`. Search on a random graph first, then implement insertion. One thing at a time.

---

## 6. Agent Skills Workflow (JSM Guide)

Use these skills when building VectorVault with an AI coding assistant.

```
/architect   → Run before HNSW implementation, before D3 visualization, before comparison mode
               Prompt: "/architect HNSW implementation with step logging and D3 visualization"
               Prevents: guessing on graph layer structure, wrong D3 data binding approach

/remember    → Save at end of every session, restore at start of next
  save         Critical: HNSW algorithm decisions, layer parameters, step log format
  restore      Without this: agent forgets M=16 parameter, step log format, what phase you're in

/review      → After HNSW is complete (before FastAPI)
               After D3 graph renders (before animation)
               After comparison panel is working (before deployment)
               Prompt: "/review The graph renders but node coloring isn't updating during traversal"

/recover     → When HNSW recall is unexpectedly low (< 0.70) — paste console output
               When D3 simulation freezes or nodes overlap completely
               When CORS errors block frontend from reaching FastAPI
               Golden rule: paste exact error, don't paraphrase

/imprint     → After Graph.jsx is complete (captures force graph pattern)
               After TraversalPlayer.jsx (captures control bar pattern)
               After ComparisonPanel.jsx (captures two-column stat panel pattern)
```

**Session discipline:**
- Never start coding without `/architect` for a new module
- Always `/remember save` at end of session even if it was short
- Run `/review` after each phase milestone before moving to next phase
- `/recover` within one failed corrective prompt — don't spiral

---

## 7. Tech Stack

| Technology | Purpose | Status | Reason |
|---|---|---|---|
| Python 3.13 | Core backend | USE | |
| NumPy | Vector math, cosine distance | USE | |
| FastAPI | REST API | USE | |
| Uvicorn | ASGI server | USE | |
| GloVe 50d (5,000 words) | Pre-computed embeddings | USE | ~65MB, fits on Mac |
| React 18 | Frontend | USE | |
| D3.js v7 | Force graph + animation | USE | Core visual differentiator |
| Vite | Build tool | USE | |
| Undecided | Deployment | USE | |
| TypeScript | Type safety | OPTIONAL | Add in v2 |
| hnswlib | Validate your recall@10 | OPTIONAL | Only for cross-checking |
| SIFT1M | Large benchmark dataset | SKIP | 512MB, too large |
| FAISS | Facebook ANN library | SKIP | Building your own |
| Three.js | 3D visualization | SKIP | 2D is clearer |
| PostgreSQL / Redis | Database / Cache | SKIP | Everything in-memory |
| Docker | Containerization | SKIP | Not needed |

---

## 8. File Structure

```
vectorvault/
├── backend/
│   ├── main.py            # FastAPI app — HTTP only, delegates to modules
│   ├── hnsw.py            # HNSW implementation — graph ops only
│   ├── embeddings.py      # GloVe loader + cosine_distance — data only
│   ├── benchmark.py       # recall@10 measurement — benchmarking only
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Graph.jsx             # D3 force graph + node coloring
│   │   │   ├── TraversalPlayer.jsx   # Play/pause/step animation controls
│   │   │   ├── NodeInspector.jsx     # Click-to-inspect panel
│   │   │   ├── ComparisonPanel.jsx   # HNSW vs brute-force side-by-side
│   │   │   └── BenchmarkHeader.jsx   # recall@10 + speedup always visible
│   │   ├── hooks/
│   │   │   └── useTraversal.js       # Fetches steps, manages traversal state
│   │   ├── utils/
│   │   │   └── nodeColor.js          # getNodeColor() — defined once, used everywhere
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
│
├── data/
│   └── .gitkeep           # GloVe file lives here, gitignored
│
├── .gitignore             # /data/*.txt
└── README.md
```

---

## 9. What to Benchmark and Publish

```markdown
## Benchmarks

| Method | Recall@10 | Avg query time | Nodes visited |
|---|---|---|---|
| VectorVault HNSW (M=16, ef=50) | 0.XX | ~Xms | ~XX of 5,000 |
| Brute-force exact search | 1.0 (baseline) | ~XXms | 5,000 of 5,000 |

Dataset: GloVe 6B, 5,000 words, 50 dimensions
Queries: 50 random words, k=10, seed=42
Reproduced with: `python benchmark.py --seed 42`
```

---

## 10. Lessons Learned (fill in after building)

```markdown
## Lessons Learned

### Why I chose this architecture
[Write after building: why in-memory over a real DB, why GloVe 50d over larger datasets,
why D3 force simulation over a manual layout]

### Trade-offs I made
[Write after building: M=16 vs higher M — what did recall vs speed look like,
5,000 words vs 50,000 — what broke at scale]

### What I'd improve in v2
[Write after building: TypeScript migration, add IVF index comparison,
allow uploading custom embeddings, add product quantization visualization]

### Biggest technical challenge
[Write after building: most likely either the D3 animation synchronization with
traversal steps, or getting HNSW insert to produce correct layer structure]
```

---

## 11. Interview Talking Points

- "I implemented HNSW from scratch — hierarchical graph structure, layer assignment using exponential distribution, beam search with candidate heaps. Not a library wrapper."
- "The key insight of HNSW: start at the top layer with few nodes for fast long-range elimination, then descend to layer 0 for precise local search."
- "My implementation achieves recall@10 of 0.92 with 23× speedup over brute-force on GloVe 50d."
- "The comparison panel shows exactly how many nodes HNSW visited versus brute-force. Visiting 67 of 5,000 nodes and getting 93% of the same answers teaches the algorithm better than any explanation."
- "This is the same core algorithm that Qdrant, Weaviate, and pgvector use internally. I wanted to understand it rather than just call it."
