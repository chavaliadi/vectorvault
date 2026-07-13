import React from "react";

/**
 * NodeInspector component.
 * Responsible for showing details of a selected node and listing neighbor IDs on click.
 * 
 * Props
 * -----
 * nodeId : Number | null
 *     The ID of the currently selected node.
 * graphData : Object | null
 *     The graph data with nodes and edges.
 * words : Array
 *     Array of words mapped by node ID.
 * onSelectNode : Function
 *     Callback to update selectedNodeId.
 * onClose : Function
 *     Callback to clear selection.
 */
export default function NodeInspector({ nodeId, graphData, words, onSelectNode, onClose }) {
  if (nodeId === null || !graphData) {
    return <div className="inspector-empty-placeholder">Select a node to inspect...</div>;
  }

  // Find node details
  const node = graphData.nodes.find((n) => n.id === nodeId);
  if (!node) {
    return (
      <div className="node-inspector-placeholder">
        <div className="inspector-header-placeholder">
          <h4>Node Inspector</h4>
          <button onClick={onClose} className="btn-close-inspector-placeholder">✖</button>
        </div>
        <div className="inspector-body-placeholder">
          <p>Node #{nodeId} not found in the graph.</p>
        </div>
      </div>
    );
  }

  // Find neighbors by layer
  const neighborsByLayer = {};
  node.layers.forEach((layer) => {
    const neighbors = [];
    graphData.edges.forEach((edge) => {
      if (edge.layer === layer) {
        const srcId = typeof edge.source === "object" ? edge.source.id : edge.source;
        const dstId = typeof edge.target === "object" ? edge.target.id : edge.target;

        if (srcId === nodeId) {
          neighbors.push(dstId);
        } else if (dstId === nodeId) {
          neighbors.push(srcId);
        }
      }
    });
    // Remove duplicates and sort
    neighborsByLayer[layer] = [...new Set(neighbors)].sort((a, b) => a - b);
  });

  const getWordForId = (id) => {
    if (words && words[id]) return words[id];
    const foundNode = graphData.nodes.find((n) => n.id === id);
    return foundNode ? foundNode.word : `Node #${id}`;
  };

  return (
    <div className="node-inspector-placeholder">
      <div className="inspector-header-placeholder">
        <h4 className="section-title-placeholder">Node Inspector</h4>
        <button onClick={onClose} className="btn-close-inspector-placeholder">✖</button>
      </div>

      <div className="inspector-body-placeholder">
        <div className="inspector-row">
          <strong>Word:</strong> <span className="text-highlight">{node.word}</span>
        </div>
        <div className="inspector-row">
          <strong>Node ID:</strong> #{node.id}
        </div>
        <div className="inspector-row">
          <strong>Layers:</strong> {node.layers.join(", ")}
        </div>

        <div className="neighbors-section">
          <h5>Adjacency Neighbors</h5>
          {node.layers.map((layer) => {
            const list = neighborsByLayer[layer] || [];
            return (
              <div key={layer} className="neighbors-layer-block">
                <div className="neighbors-layer-tag">Layer {layer}</div>
                {list.length > 0 ? (
                  <div className="neighbors-chips-grid">
                    {list.map((nbrId) => {
                      const word = getWordForId(nbrId);
                      return (
                        <button
                          key={nbrId}
                          onClick={() => onSelectNode && onSelectNode(nbrId)}
                          className="neighbor-chip-btn"
                          title={`Inspect ${word}`}
                        >
                          {word} (#{nbrId})
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="neighbors-empty">No connections on this layer.</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
