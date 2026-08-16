"""Unit tests for the validation and parameter sweep module."""

import numpy as np
from backend.validate import run_hnswlib_validation, run_parameter_sweep


def test_hnswlib_validation_mock():
    """Test hnswlib cross-validation on synthetic vectors."""
    # Create synthetic dataset of 50 random vectors of shape (50, 50)
    rng = np.random.RandomState(42)
    words = [f"word_{i}" for i in range(50)]
    vectors = rng.randn(50, 50).astype(np.float32)

    stats = run_hnswlib_validation(
        words=words,
        vectors=vectors,
        num_queries=5,
        k=5,
        M=4,
        ef_construction=20,
        ef_search=10,
        seed=42,
        log_progress=False,
    )

    # Check key presence
    assert "vectorvault_recall" in stats
    assert "hnswlib_recall" in stats
    assert "avg_overlap" in stats
    assert "vectorvault_latency_ms" in stats
    assert "hnswlib_latency_ms" in stats
    assert stats["queries_run"] == 5

    # Check valid numeric bounds
    assert 0.0 <= stats["vectorvault_recall"] <= 1.0
    assert 0.0 <= stats["hnswlib_recall"] <= 1.0
    assert 0.0 <= stats["avg_overlap"] <= 1.0
    assert stats["vectorvault_latency_ms"] >= 0.0
    assert stats["hnswlib_latency_ms"] >= 0.0


def test_parameter_sweep_grid_completeness():
    """Test parameter sweep grid returns results for all specified M and ef combinations."""
    rng = np.random.RandomState(42)
    words = [f"word_{i}" for i in range(40)]
    vectors = rng.randn(40, 50).astype(np.float32)

    M_test = [4, 8]
    ef_test = [10, 20]

    sweep = run_parameter_sweep(
        words=words,
        vectors=vectors,
        M_values=M_test,
        ef_search_values=ef_test,
        num_queries=5,
        k=5,
        ef_construction=20,
        seed=42,
        log_progress=False,
    )

    # Check grid completeness
    assert len(sweep) == len(M_test) * len(ef_test)
    for m in M_test:
        for ef in ef_test:
            assert (m, ef) in sweep
            cell = sweep[(m, ef)]
            assert "recall" in cell
            assert "latency_ms" in cell
            assert 0.0 <= cell["recall"] <= 1.0
            assert cell["latency_ms"] >= 0.0
