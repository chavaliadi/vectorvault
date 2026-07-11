import React from "react";

/**
 * NodeInspector component.
 * Responsible for showing details of a selected node and listing neighbor IDs on click.
 * Scaffolded as placeholder for Phase 4A.
 * 
 * Props
 * -----
 * nodeId : Number | null
 * graphData : Object | null
 * words : Array
 * onClose : Function
 */
export default function NodeInspector({ nodeId, graphData, words, onClose }) {
  if (nodeId === null) {
    return <div className="inspector-empty-placeholder">Select a node to inspect...</div>;
  }

  return (
    <div className="node-inspector-placeholder">
      <div className="inspector-header-placeholder">
        <h4>Node Inspector</h4>
        <button onClick={onClose} className="btn-close-inspector-placeholder">✖</button>
      </div>

      <div className="inspector-body-placeholder">
        <p>Selected Node ID: #{nodeId}</p>
        <p>Word Lookup: {words && words[nodeId] ? words[nodeId] : `Word #${nodeId}`}</p>
        <p>Neighbors block details will populate here.</p>
      </div>
    </div>
  );
}
