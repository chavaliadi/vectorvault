import React from "react";

/**
 * ComparisonPanel component.
 * Responsible for rendering HNSW vs Brute Force metrics and results side-by-side.
 * 
 * Props
 * -----
 * hnswResults : Array
 * bruteForceResults : Array
 * stats : Object | null
 */
export default function ComparisonPanel({ hnswResults = [], bruteForceResults = [], stats }) {
  if (!stats) {
    return (
      <div className="comparison-panel-placeholder">
        <h3 className="section-title-placeholder">Search Performance Comparisons</h3>
        <div className="metrics-box-placeholder">
          No active search comparison run yet. Enter a word in the search bar above to query.
        </div>
      </div>
    );
  }

  const speedup = stats.hnsw_time_ms > 0 ? stats.brute_force_time_ms / stats.hnsw_time_ms : 0;

  return (
    <div className="comparison-panel-placeholder">
      <h3 className="section-title-placeholder">Search Performance Comparisons</h3>
      <div className="metrics-box-placeholder">
        <div style={{ marginBottom: "6px" }}>
          <strong>Recall@k:</strong> {(stats.recall * 100).toFixed(1)}%
        </div>
        <div style={{ marginBottom: "6px" }}>
          <strong>HNSW Latency:</strong> {stats.hnsw_time_ms.toFixed(3)} ms
        </div>
        <div style={{ marginBottom: "6px" }}>
          <strong>Brute Force Latency:</strong> {stats.brute_force_time_ms.toFixed(3)} ms
        </div>
        <div style={{ color: "var(--color-green)", fontWeight: 600 }}>
          HNSW is {speedup.toFixed(1)}x faster!
        </div>
      </div>

      <div className="results-columns-placeholder">
        <div className="results-column-mock">
          <h4 style={{ marginBottom: "8px", borderBottom: "1px solid var(--border-card)", paddingBottom: "4px" }}>HNSW Results</h4>
          <ul style={{ listStyleType: "none", paddingLeft: 0, fontSize: "13px" }}>
            {hnswResults.map((item, idx) => (
              <li key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span>{idx + 1}. {item.word}</span>
                <span style={{ fontFamily: "monospace", color: "var(--text-secondary)" }}>{item.distance.toFixed(3)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="results-column-mock">
          <h4 style={{ marginBottom: "8px", borderBottom: "1px solid var(--border-card)", paddingBottom: "4px" }}>Brute Force</h4>
          <ul style={{ listStyleType: "none", paddingLeft: 0, fontSize: "13px" }}>
            {bruteForceResults.map((item, idx) => (
              <li key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span>{idx + 1}. {item.word}</span>
                <span style={{ fontFamily: "monospace", color: "var(--text-secondary)" }}>{item.distance.toFixed(3)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
