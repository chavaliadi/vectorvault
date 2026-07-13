import React, { useState } from "react";

/**
 * Header component.
 * Responsible for rendering the search bar input controls and global benchmark metrics.
 * 
 * Props
 * -----
 * benchmarkStats : Object | null
 *     Seeded average statistics from index benchmarks.
 * onSearch : Function
 *     Triggered on query submit.
 * isLoading : Boolean
 *     Whether query is in flight.
 */
export default function Header({ benchmarkStats, onSearch, isLoading }) {
  const [searchVal, setSearchVal] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchVal.trim() && onSearch) {
      onSearch(searchVal.trim());
    }
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <h1 className="brand-title">VectorVault</h1>
        <span className="brand-tagline">Visualizing HNSW Search Traversal</span>
      </div>

      <form className="header-search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter query word (e.g., science)..."
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          disabled={isLoading}
          className="search-input"
        />
        <button type="submit" disabled={isLoading} className="btn-search">
          {isLoading ? "Searching..." : "Search"}
        </button>
      </form>

      <div className="header-benchmark-panel">
        <div className="benchmark-title">Benchmark Stats</div>
        {benchmarkStats ? (
          <div className="benchmark-metrics" style={{ display: "flex", gap: "12px", fontSize: "12px", color: "var(--text-secondary)" }}>
            <span>HNSW: <strong>{benchmarkStats.avg_hnsw_time_ms.toFixed(2)}ms</strong></span>
            <span>BF: <strong>{benchmarkStats.avg_brute_force_time_ms.toFixed(2)}ms</strong></span>
            <span>Recall: <strong>{(benchmarkStats.avg_recall * 100).toFixed(1)}%</strong></span>
          </div>
        ) : (
          <div className="benchmark-metrics-placeholder" style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            No Stats Loaded
          </div>
        )}
      </div>
    </header>
  );
}
