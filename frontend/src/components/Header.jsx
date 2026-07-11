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
        <span className="brand-tagline">Visualizing HNSW Search Traversal (Phase 4A Scaffold)</span>
      </div>

      <form className="header-search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Search placeholder..."
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          disabled={isLoading}
          className="search-input"
        />
        <button type="submit" disabled={isLoading} className="btn-search">
          Search
        </button>
      </form>

      <div className="header-benchmark-panel">
        <div className="benchmark-title">Benchmark Stats</div>
        <div className="benchmark-metrics-placeholder">
          {benchmarkStats ? "Stats Loaded" : "No Stats"}
        </div>
      </div>
    </header>
  );
}
