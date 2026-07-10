"""Unit and integration tests for the FastAPI backend API endpoints."""

from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from backend.main import app


def test_api_graph_and_endpoints():
    """Test full endpoint lifecycle (graph retrieval, query routing, invalid args, benchmarks)."""
    with TestClient(app) as client:
        # 1. Test GET /graph
        resp_graph = client.get("/graph")
        assert resp_graph.status_code == 200
        graph_data = resp_graph.json()
        assert "nodes" in graph_data
        assert "edges" in graph_data

        # Should load first 5,000 words by default
        assert len(graph_data["nodes"]) == 5000

        # Validate Node attributes
        first_node = graph_data["nodes"][0]
        assert "id" in first_node
        assert "word" in first_node
        assert "layers" in first_node
        assert isinstance(first_node["layers"], list)
        assert 0 in first_node["layers"]  # Every node must exist in layer 0

        # Validate Edge attributes
        if len(graph_data["edges"]) > 0:
            first_edge = graph_data["edges"][0]
            assert "source" in first_edge
            assert "target" in first_edge
            assert "layer" in first_edge

        # 2. Test POST /query (valid word)
        query_payload = {"word": "king", "k": 5, "ef": 30}
        resp_query = client.post("/query", json=query_payload)
        assert resp_query.status_code == 200
        query_data = resp_query.json()
        assert "hnsw_results" in query_data
        assert "brute_force_results" in query_data
        assert "steps" in query_data
        assert "stats" in query_data

        # Check results schema and length
        hnsw_res = query_data["hnsw_results"]
        assert len(hnsw_res) == 5
        assert "id" in hnsw_res[0]
        assert "word" in hnsw_res[0]
        assert "distance" in hnsw_res[0]
        assert isinstance(hnsw_res[0]["id"], int)
        assert isinstance(hnsw_res[0]["word"], str)
        assert isinstance(hnsw_res[0]["distance"], float)

        # Check step schema
        steps = query_data["steps"]
        assert len(steps) > 0
        assert "current" in steps[0]
        assert "evaluating" in steps[0]
        assert "distance" in steps[0]
        assert "accepted" in steps[0]
        assert "layer" in steps[0]

        # Check stats metrics
        stats = query_data["stats"]
        assert stats["hnsw_visited"] > 0
        assert stats["brute_force_visited"] == 5000
        assert stats["recall"] >= 0.0
        assert stats["recall"] <= 1.0

        # 3. Test POST /query (unknown word)
        query_missing = {"word": "nonexistentword123", "k": 5, "ef": 30}
        resp_missing = client.post("/query", json=query_missing)
        assert resp_missing.status_code == 404
        assert "not found" in resp_missing.json()["detail"].lower()

        # 4. Test POST /query (invalid inputs)
        # Invalid k (negative)
        query_invalid_k = {"word": "king", "k": -1, "ef": 30}
        resp_invalid_k = client.post("/query", json=query_invalid_k)
        assert resp_invalid_k.status_code == 422

        # 5. Test GET /benchmark
        resp_bench = client.get("/benchmark")
        assert resp_bench.status_code == 200
        bench_data = resp_bench.json()
        assert "avg_hnsw_time_ms" in bench_data
        assert "avg_brute_force_time_ms" in bench_data
        assert "avg_recall" in bench_data
        assert bench_data["queries_run"] == 50


def test_api_startup_failure():
    """Test that missing GloVe dataset halts startup with FileNotFoundError."""
    # Mock load_glove to raise FileNotFoundError
    with patch(
        "backend.main.load_glove",
        side_effect=FileNotFoundError("Mocked file missing"),
    ):
        with pytest.raises(FileNotFoundError, match="GloVe dataset missing at"):
            with TestClient(app):
                pass
