"""Hierarchical Navigable Small World (HNSW) algorithm implementation.

This module provides the HNSW class structure and algorithms for routing
queries down hierarchical proximity graphs.
"""

import heapq
import logging
import numpy as np

from backend.embeddings import cosine_distance

logger = logging.getLogger(__name__)

# Default algorithm parameters as defined in the development rules
DEFAULT_M = 16
DEFAULT_EF_CONSTRUCTION = 200
DEFAULT_EF_SEARCH = 50


class HNSW:
    """Hierarchical Navigable Small World index for approximate nearest neighbor search."""

    def __init__(
        self, M: int = DEFAULT_M, ef_construction: int = DEFAULT_EF_CONSTRUCTION
    ) -> None:
        """Initialize the HNSW index.

        Parameters
        ----------
        M : int, optional
            Number of bidirectional links to establish for each new node, by default 16.
        ef_construction : int, optional
            Size of the dynamic candidate list during construction, by default 200.
        """
        self.M = M
        self.ef_construction = ef_construction

        # Internal state structures
        self.vectors: dict[int, np.ndarray] = {}
        self.graphs: dict[int, dict[int, list[int]]] = {}
        self.max_level: int = -1
        self.entry_point: int | None = None

    def insert(self, vector: np.ndarray, node_id: int) -> None:
        """Insert a new vector into the HNSW index.

        Complexity: O(log N) expected time.

        Parameters
        ----------
        vector : np.ndarray
            The 50-dimensional embedding vector.
        node_id : int
            Unique identifier of the node (e.g. index in the word list).

        Raises
        ------
        NotImplementedError
            This method is not implemented in Phase 2A.
        """
        raise NotImplementedError("insert() is not implemented in Phase 2A.")

    def query(
        self,
        vector: np.ndarray,
        k: int = 10,
        ef: int = DEFAULT_EF_SEARCH,
        record_steps: bool = False,
    ) -> tuple[list[tuple[int, float]], list[dict]]:
        """Query the HNSW index to find the approximate top-k nearest neighbors.

        Complexity: O(log N) expected time.

        Parameters
        ----------
        vector : np.ndarray
            The query vector of shape (50,).
        k : int, optional
            The number of nearest neighbors to return, by default 10.
        ef : int, optional
            The size of the candidate pool during search, by default 50.
        record_steps : bool, optional
            Whether to log traversal steps for visualization, by default False.

        Returns
        -------
        tuple[list[tuple[int, float]], list[dict]]
            A tuple containing:
            - A list of (node_id, distance) tuples, sorted by distance ascending.
            - A list of step log entries representing the search trajectory.
        """
        steps_log: list[dict] = []

        if self.entry_point is None or not self.graphs:
            return [], []

        curr_obj = self.entry_point

        # Greedy routing down upper layers
        for layer in range(self.max_level, 0, -1):
            candidates = self._search_layer(
                query=vector,
                entry_points=[curr_obj],
                ef=1,
                layer=layer,
                record_steps=record_steps,
                steps_log=steps_log,
            )
            if candidates:
                curr_obj = candidates[0][0]

        # Beam search on Layer 0
        layer_0_results = self._search_layer(
            query=vector,
            entry_points=[curr_obj],
            ef=max(ef, k),
            layer=0,
            record_steps=record_steps,
            steps_log=steps_log,
        )

        return layer_0_results[:k], steps_log

    def _random_level(self) -> int:
        """Select a random level for a new node using exponential decay.

        Complexity: O(1) time.

        Returns
        -------
        int
            The level at which the node will be inserted.

        Raises
        ------
        NotImplementedError
            This method is not implemented in Phase 2A.
        """
        raise NotImplementedError("_random_level() is not implemented in Phase 2A.")

    def _search_layer(
        self,
        query: np.ndarray,
        entry_points: list[int],
        ef: int,
        layer: int,
        record_steps: bool = False,
        steps_log: list[dict] = None,
    ) -> list[tuple[int, float]]:
        """Search a single HNSW layer using beam search.

        Complexity: O(E * log(ef)) where E is the average degree of nodes.

        Parameters
        ----------
        query : np.ndarray
            The query vector of shape (50,).
        entry_points : list[int]
            The node IDs to start searching from.
        ef : int
            The number of closest candidates to track.
        layer : int
            The layer index being searched.
        record_steps : bool, optional
            Whether to log steps, by default False.
        steps_log : list[dict], optional
            Accumulating list of logged traversal steps across calls, by default None.

        Returns
        -------
        list[tuple[int, float]]
            List of (node_id, distance) candidates, sorted by distance ascending.
        """
        visited = set(entry_points)
        candidates: list[tuple[float, int]] = []  # Min-heap of (dist, node_id)
        results: list[tuple[float, int]] = []  # Max-heap of (-dist, node_id)

        # Initialize candidates and results with entry points
        for ep in entry_points:
            dist = cosine_distance(query, self.vectors[ep])
            heapq.heappush(candidates, (dist, ep))
            heapq.heappush(results, (-dist, ep))

        while candidates:
            curr_dist, curr_id = heapq.heappop(candidates)
            worst_dist = -results[0][0]

            if curr_dist > worst_dist and len(results) >= ef:
                break

            neighbors = self.graphs.get(layer, {}).get(curr_id, [])
            for nbr in neighbors:
                if nbr not in visited:
                    visited.add(nbr)
                    dist = cosine_distance(query, self.vectors[nbr])
                    worst_dist = -results[0][0]

                    if dist < worst_dist or len(results) < ef:
                        heapq.heappush(candidates, (dist, nbr))
                        heapq.heappush(results, (-dist, nbr))
                        if len(results) > ef:
                            heapq.heappop(results)
                        accepted = True
                    else:
                        accepted = False

                    if record_steps and steps_log is not None:
                        steps_log.append(
                            {
                                "current": int(curr_id),
                                "evaluating": int(nbr),
                                "distance": float(dist),
                                "accepted": accepted,
                                "layer": int(layer),
                            }
                        )

        # Sort and return results by distance ascending
        sorted_results = sorted(
            [(node_id, -neg_dist) for neg_dist, node_id in results],
            key=lambda x: x[1],
        )
        return sorted_results

    def _select_neighbors(
        self, candidates: list[tuple[int, float]], M: int
    ) -> list[int]:
        """Prune candidates to keep only the M nearest neighbors.

        Complexity: O(C log C) where C is the number of candidates.

        Parameters
        ----------
        candidates : list[tuple[int, float]]
            A list of (node_id, distance) tuples.
        M : int
            The maximum number of neighbors to select.

        Returns
        -------
        list[int]
            List of selected neighbor node IDs.

        Raises
        ------
        NotImplementedError
            This method is not implemented in Phase 2A.
        """
        raise NotImplementedError("_select_neighbors() is not implemented in Phase 2A.")
