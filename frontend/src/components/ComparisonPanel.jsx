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
      <div className="comparison-panel-card">
        <h3 className="section-title">Search Performance Comparisons</h3>
        <div className="metrics-box">
          No active search comparison run yet. Enter a word in the search bar above to query.
        </div>
      </div>
    );
  }

  const speedup = stats.hnsw_time_ms > 0 ? stats.brute_force_time_ms / stats.hnsw_time_ms : 0;

  return (
    <div className="comparison-panel-card">
      <h3 className="section-title">Search Performance Comparisons</h3>
      <div className="metrics-box">
        <div className="comparison-metric-item">
          <strong>Recall@k:</strong> {(stats.recall * 100).toFixed(1)}%
        </div>
        <div className="comparison-metric-item">
          <strong>HNSW Latency:</strong> {stats.hnsw_time_ms.toFixed(3)} ms
        </div>
        <div className="comparison-metric-item">
          <strong>Brute Force Latency:</strong> {stats.brute_force_time_ms.toFixed(3)} ms
        </div>
        <div className="speedup-highlight">
          HNSW is {speedup.toFixed(1)}x faster!
        </div>
      </div>

      <div className="results-columns">
        <div className="results-column">
          <h4 className="results-column-title">HNSW Results</h4>
          <ul className="results-list">
            {hnswResults.map((item, idx) => (
              <li key={idx} className="results-list-item">
                <span>{idx + 1}. {item.word}</span>
                <span className="results-distance">{item.distance.toFixed(3)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="results-column">
          <h4 className="results-column-title">Brute Force</h4>
          <ul className="results-list">
            {bruteForceResults.map((item, idx) => (
              <li key={idx} className="results-list-item">
                <span>{idx + 1}. {item.word}</span>
                <span className="results-distance">{item.distance.toFixed(3)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
