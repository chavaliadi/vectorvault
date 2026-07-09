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


def test_unimplemented_raises():
    """Test that Phase 2B methods raise NotImplementedError in Phase 2A."""
    hnsw = HNSW()
    dummy_vec = get_mock_vector(0, 0.0)

    with pytest.raises(NotImplementedError):
        hnsw.insert(dummy_vec, 0)

    with pytest.raises(NotImplementedError):
        hnsw._random_level()

    with pytest.raises(NotImplementedError):
        hnsw._select_neighbors([], 16)
