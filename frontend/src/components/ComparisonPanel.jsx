import React from "react";

export default function ComparisonPanel({ hnswResults = [], bruteForceResults = [], stats }) {
  if (!stats) {
    return (
      <div className="comparison-panel-empty">
        <div className="empty-message">
          💡 Enter a word in the search bar above to begin. Watch the HNSW graph search path execute step-by-step and compare its performance directly against an exact brute-force search.
        </div>
      </div>
    );
  }

  const speedup = stats.hnsw_time_ms > 0 ? stats.brute_force_time_ms / stats.hnsw_time_ms : 0;

  return (
    <div className="comparison-panel">
      <h2 className="panel-section-title">Query Comparisons</h2>

      {/* Comparison Statistics Table */}
      <div className="stats-grid">
        <div className="stats-card">
          <div className="stats-card-header">Search Recall</div>
          <div className="stats-card-value">{(stats.recall * 100).toFixed(0)}%</div>
          <div className="stats-card-label">Recall@k overlap</div>
        </div>

        <div className="stats-card highlight-green">
          <div className="stats-card-header">Speedup Factor</div>
          <div className="stats-card-value">{speedup.toFixed(1)}x</div>
          <div className="stats-card-label">Faster than brute force</div>
        </div>
      </div>

      <table className="stats-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>HNSW Search</th>
            <th>Brute Force</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Nodes Visited</strong>
            </td>
            <td>
              <span className="text-highlight">{stats.hnsw_visited}</span> / 5,000 (
              {((stats.hnsw_visited / 5000) * 100).toFixed(1)}%)
            </td>
            <td>5,000 / 5,000 (100%)</td>
          </tr>
          <tr>
            <td>
              <strong>Query Latency</strong>
            </td>
            <td>
              <span className="text-highlight">{stats.hnsw_time_ms.toFixed(3)} ms</span>
            </td>
            <td>{stats.brute_force_time_ms.toFixed(3)} ms</td>
          </tr>
        </tbody>
      </table>

      {/* Side-by-Side Results Table */}
      <h2 className="panel-section-title mt-6">Nearest Neighbor Results</h2>
      <div className="results-comparison-grid">
        {/* HNSW Columns */}
        <div className="results-column">
          <h3 className="results-column-title">HNSW Search</h3>
          <ol className="results-list">
            {hnswResults.map((res, idx) => (
              <li key={idx} className="results-item">
                <span className="results-word">{res.word}</span>
                <span className="results-dist">{res.distance.toFixed(4)}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Brute Force Columns */}
        <div className="results-column">
          <h3 className="results-column-title">Brute Force (Exact)</h3>
          <ol className="results-list">
            {bruteForceResults.map((res, idx) => (
              <li key={idx} className="results-item">
                <span className="results-word">{res.word}</span>
                <span className="results-dist">{res.distance.toFixed(4)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
