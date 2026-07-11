import React from "react";

/**
 * GraphCanvas component.
 * Responsible for rendering the HNSW layers and traversal hops using D3 force layout.
 * Currently scaffolded as placeholder for Phase 4A.
 * 
 * Props
 * -----
 * graphData : Object | null
 *     Nodes and edges from the /graph API.
 * currentStep : Object | null
 *     The active search hop evaluation metadata.
 * hnswResults : Array
 *     Top-k neighbor results.
 * selectedNodeId : Number | null
 *     Currently inspected node.
 * onSelectNode : Function
 *     Click callback targeting a node ID.
 */
export default function GraphCanvas({
  graphData,
  currentStep,
  hnswResults,
  selectedNodeId,
  onSelectNode,
}) {
  return (
    <div className="graph-canvas-placeholder">
      <div className="placeholder-message">
        ⚙️ HNSW Force-Directed Graph Canvas [D3 Placeholder - Phase 4A]
      </div>
      <div className="placeholder-details">
        {graphData ? `Loaded ${graphData.nodes.length} nodes` : "No graph data loaded"}
        {selectedNodeId !== null && ` | Selected Node: #${selectedNodeId}`}
      </div>
    </div>
  );
}
