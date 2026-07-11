import React from "react";

/**
 * ComparisonPanel component.
 * Responsible for rendering HNSW vs Brute Force metrics and results side-by-side.
 * Scaffolded as placeholder for Phase 4A.
 * 
 * Props
 * -----
 * hnswResults : Array
 * bruteForceResults : Array
 * stats : Object | null
 */
export default function ComparisonPanel({ hnswResults, bruteForceResults, stats }) {
  return (
    <div className="comparison-panel-placeholder">
      <h3 className="section-title-placeholder">Search Performance Comparisons (Placeholder)</h3>
      <div className="metrics-box-placeholder">
        {stats ? (
          <div>
            Recall: {stats.recall} | Speedup: {stats.hnsw_time_ms} ms vs {stats.brute_force_time_ms} ms
          </div>
        ) : (
          <div>No active search comparison run yet.</div>
        )}
      </div>

      <div className="results-columns-placeholder">
        <div className="results-column-mock">
          <h4>HNSW Hits ({hnswResults ? hnswResults.length : 0})</h4>
        </div>
        <div className="results-column-mock">
          <h4>Brute Force ({bruteForceResults ? bruteForceResults.length : 0})</h4>
        </div>
      </div>
    </div>
  );
}
