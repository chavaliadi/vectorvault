import React, { useState } from "react";

export default function Header({ benchmarkStats, onSearch, isLoading }) {
  const [word, setWord] = useState("");
  const [k, setK] = useState(10);
  const [ef, setEf] = useState(50);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!word.trim()) return;
    onSearch(word.trim(), k, ef);
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <h1 className="brand-title">VectorVault</h1>
        <span className="brand-tagline">Visualizing HNSW Search Traversal</span>
      </div>

      <form className="header-search-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            placeholder="Type a word (e.g. king, computer, science)..."
            value={word}
            onChange={(e) => setWord(e.target.value)}
            disabled={isLoading}
            className="search-input"
          />
        </div>

        <div className="form-group size-small">
          <label htmlFor="k-input">k:</label>
          <input
            id="k-input"
            type="number"
            min="1"
            max="100"
            value={k}
            onChange={(e) => setK(parseInt(e.target.value) || 1)}
            disabled={isLoading}
            className="number-input"
          />
        </div>

        <div className="form-group size-small">
          <label htmlFor="ef-input">ef:</label>
          <input
            id="ef-input"
            type="number"
            min="1"
            max="500"
            value={ef}
            onChange={(e) => setEf(parseInt(e.target.value) || 1)}
            disabled={isLoading}
            className="number-input"
          />
        </div>

        <button type="submit" disabled={isLoading || !word.trim()} className="btn-search">
          {isLoading ? "Searching..." : "Search"}
        </button>
      </form>

      <div className="header-benchmark-panel">
        <div className="benchmark-title">Seeded Index Benchmark (N=5,000)</div>
        {benchmarkStats ? (
          <div className="benchmark-metrics">
            <div className="metric-item">
              <span className="metric-label">Avg HNSW:</span>
              <span className="metric-val">{benchmarkStats.avg_hnsw_time_ms.toFixed(3)} ms</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Avg Brute Force:</span>
              <span className="metric-val">{benchmarkStats.avg_brute_force_time_ms.toFixed(3)} ms</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Recall@10:</span>
              <span className="metric-val">{(benchmarkStats.avg_recall * 100).toFixed(1)}%</span>
            </div>
          </div>
        ) : (
          <div className="benchmark-loading">Loading benchmark metrics...</div>
        )}
      </div>
    </header>
  );
}
