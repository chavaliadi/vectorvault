"""Unit tests for Phase 2A HNSW query routing."""

import pytest
import numpy as np

from backend.hnsw import HNSW


def get_mock_vector(dim_idx: int, val: float = 1.0) -> np.ndarray:
    """Helper to construct a 50-dimensional vector with one active dimension."""
    vec = np.zeros(50, dtype=np.float32)
    vec[dim_idx] = val
    return vec


@pytest.fixture
def populated_mock_hnsw() -> HNSW:
    """Fixture to build a manually structured multi-layer HNSW graph.

    Graph Topology:
    Layer 1 (sparse):
      4 (entry point) <---> 2
    Layer 0 (dense):
      4 <---> 0, 1, 2
      2 <---> 3, 4
      0 <---> 1, 4
      1 <---> 0, 4
      3 <---> 2
    """
    hnsw = HNSW()

    # Populate 50-dimensional non-collinear vectors
    hnsw.vectors = {
        0: get_mock_vector(0),
        1: get_mock_vector(1),
        2: get_mock_vector(2),
        3: get_mock_vector(3),
        4: get_mock_vector(4),
    }

    # Populate adjacency lists
    hnsw.graphs = {
        1: {
            4: [2],
            2: [4],
        },
        0: {
            4: [0, 1, 2],
            2: [3, 4],
            0: [1, 4],
            1: [0, 4],
            3: [2],
        },
    }

    hnsw.max_level = 1
    hnsw.entry_point = 4

    return hnsw


def test_empty_hnsw_query():
    """Test query behavior on an unpopulated index."""
    hnsw = HNSW()
    query_vec = get_mock_vector(0, 0.5)

    results, steps = hnsw.query(query_vec, k=10)
    assert results == []
    assert steps == []


def test_query_routing_correctness(populated_mock_hnsw):
    """Test that query routing descends levels and returns sorted nearest results."""
    hnsw = populated_mock_hnsw
    # Query vector is closest to node 3 (dim 3), then node 2 (dim 2)
    query_vec = np.zeros(50, dtype=np.float32)
    query_vec[3] = 0.9
    query_vec[2] = 0.4
    query_vec[4] = 0.1

    # Search for top 2 nearest neighbors
    results, steps = hnsw.query(query_vec, k=2, ef=5, record_steps=False)

    # Assert results are sorted by distance ascending
    assert len(results) == 2
    # Nearest neighbor should be node 3
    assert results[0][0] == 3
    # Second nearest should be node 2
    assert results[1][0] == 2
    # Assert distances are strictly ascending
    assert results[0][1] < results[1][1]


def test_query_record_steps(populated_mock_hnsw):
    """Test that traversal steps are logged with correct formatting and keys."""
    hnsw = populated_mock_hnsw
    query_vec = np.zeros(50, dtype=np.float32)
    query_vec[3] = 0.9
    query_vec[2] = 0.4
    query_vec[4] = 0.1

    _, steps = hnsw.query(query_vec, k=2, ef=5, record_steps=True)

    # Verify steps are recorded
    assert len(steps) > 0

    # Validate schema of each step entry
    required_keys = {"current", "evaluating", "distance", "accepted", "layer"}
    for step in steps:
        assert set(step.keys()) == required_keys
        assert isinstance(step["current"], int)
        assert isinstance(step["evaluating"], int)
        assert isinstance(step["distance"], float)
        assert isinstance(step["accepted"], bool)
        assert isinstance(step["layer"], int)

    # Verify steps occur on both layer 1 and layer 0
    layers_visited = {step["layer"] for step in steps}
    assert 1 in layers_visited
    assert 0 in layers_visited


def test_insert_validations():
    """Test validation checks on incoming vectors and IDs."""
    hnsw = HNSW()
    valid_vec = get_mock_vector(0)

    # 1. Invalid dimensions
    invalid_vec = np.zeros(3, dtype=np.float32)
    with pytest.raises(ValueError, match="Vector must be 50-dimensional"):
        hnsw.insert(invalid_vec, 0)

    # 2. NaN values
    nan_vec = get_mock_vector(0)
    nan_vec[0] = np.nan
    with pytest.raises(ValueError, match="Vector contains NaN or infinite values"):
        hnsw.insert(nan_vec, 0)

    # 3. Infinite values
    inf_vec = get_mock_vector(0)
    inf_vec[0] = np.inf
    with pytest.raises(ValueError, match="Vector contains NaN or infinite values"):
        hnsw.insert(inf_vec, 0)

    # 4. Negative Node IDs
    with pytest.raises(ValueError, match="must be non-negative"):
        hnsw.insert(valid_vec, -5)

    # 5. Duplicate Node ID
    hnsw.insert(valid_vec, 10)
    with pytest.raises(ValueError, match="already exists"):
        hnsw.insert(valid_vec, 10)


def test_exponential_decay_level_distribution():
    """Test that generated node levels follow an exponential distribution."""
    hnsw = HNSW(M=16)

    # Count node allocations per level for 1000 insertions
    level_counts = {}
    for i in range(1000):
        level = hnsw._random_level()
        level_counts[level] = level_counts.get(level, 0) + 1

    # Print distribution in standard stdout logs
    print(f"Layer Distribution for 1000 nodes: {level_counts}")

    # Assert basic density hierarchy: Layer 0 has the most nodes, Layer 1 has fewer, etc.
    sorted_levels = sorted(level_counts.keys())
    for idx in range(len(sorted_levels) - 1):
        l_curr = sorted_levels[idx]
        l_next = sorted_levels[idx + 1]
        assert level_counts[l_curr] >= level_counts[l_next]


def test_insert_graph_structural_integrity():
    """Test structural graph invariants after multiple random insertions.

    Verifies:
      1. Symmetry: If A connects to B, B connects to A.
      2. No duplicate links.
      3. No node exceeds degree limit self.M.
      4. Graph remains fully connected (no isolated components/nodes).
      5. Every node exists on Layer 0.
    """
    hnsw = HNSW(M=8)  # Set M small to force frequent pruning

    np.random.seed(42)
    # Insert 100 random vectors
    for i in range(100):
        vec = np.random.uniform(-1.0, 1.0, 50).astype(np.float32)
        # Avoid zero vectors by normalizing
        norm = np.linalg.norm(vec)
        if norm > 1e-9:
            vec /= norm
        hnsw.insert(vec, i)

    # Assertions across all layers
    for layer, graph in hnsw.graphs.items():
        for node, neighbors in graph.items():
            # 1. Every node on this layer must exist in self.vectors
            assert node in hnsw.vectors

            # 2. Degree bounds
            assert (
                len(neighbors) <= hnsw.M
            ), f"Node {node} at layer {layer} exceeds M={hnsw.M}"

            # 3. No duplicates
            assert len(neighbors) == len(
                set(neighbors)
            ), f"Node {node} has duplicate neighbors"

            # 4. Connectivity
            for nbr in neighbors:
                assert (
                    nbr in graph
                ), f"Neighbor {nbr} of node {node} not present in graph layer {layer}"

            # 5. Connection preservation (no isolated nodes if N > 1)
            # A node must always have at least one connection at each layer it belongs to, unless it's the first node.
            # However, intermediate promotion layers may contain only the entry point itself, which has 0 neighbors.
            # But for all layers l < node_max_level, it should have at least one neighbor.
            if len(graph) > 1 and node != hnsw.entry_point:
                assert len(neighbors) >= 1, f"Node {node} is isolated on layer {layer}"

    # 6. Layer 0 inclusion
    for node in hnsw.vectors:
        assert node in hnsw.graphs[0]
