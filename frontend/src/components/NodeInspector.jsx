import React from "react";

export default function NodeInspector({ nodeId, graphData, onSelectNode, onClose }) {
  if (nodeId === null || !graphData) return null;

  // Find node details
  const node = graphData.nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  // Find neighbor IDs at each active layer
  const neighborsByLayer = {};
  node.layers.forEach((layer) => {
    const neighbors = [];
    graphData.edges.forEach((edge) => {
      if (edge.layer === layer) {
        // D3 might parse source/target as object refs or plain IDs
        const srcId = edge.source.id !== undefined ? edge.source.id : edge.source;
        const dstId = edge.target.id !== undefined ? edge.target.id : edge.target;

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

  // Resolve word lookup for ID
  const getWordForId = (id) => {
    const found = graphData.nodes.find((n) => n.id === id);
    return found ? found.word : `Node #${id}`;
  };

  return (
    <div className="node-inspector">
      <div className="inspector-header">
        <h3 className="inspector-title">Node Inspector</h3>
        <button onClick={onClose} className="btn-close-inspector" title="Close Panel">
          ✖
        </button>
      </div>

      <div className="inspector-body">
        <div className="info-row">
          <span className="info-label">Word:</span>
          <span className="info-value text-word">{node.word}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Node ID:</span>
          <span className="info-value">{node.id}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Layers:</span>
          <span className="info-value text-layers">{node.layers.join(", ")}</span>
        </div>

        <div className="inspector-neighbors-section">
          <h4 className="neighbors-title">HNSW Adjacency Lists</h4>
          {node.layers.map((layer) => {
            const list = neighborsByLayer[layer] || [];
            return (
              <div key={layer} className="neighbors-layer-block">
                <div className="layer-tag">Layer {layer}</div>
                {list.length > 0 ? (
                  <div className="neighbors-tokens-grid">
                    {list.map((nbrId) => {
                      const word = getWordForId(nbrId);
                      return (
                        <button
                          key={nbrId}
                          onClick={() => onSelectNode(nbrId)}
                          className="neighbor-token-btn"
                          title={`Click to inspect '${word}'`}
                        >
                          {word}
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
