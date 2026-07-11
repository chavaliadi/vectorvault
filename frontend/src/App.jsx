import React, { useState } from "react";
import Header from "./components/Header";
import GraphCanvas from "./components/GraphCanvas";
import TraversalPlayer from "./components/TraversalPlayer";
import ComparisonPanel from "./components/ComparisonPanel";
import NodeInspector from "./components/NodeInspector";

/**
 * Root App component.
 * Acts as the centralized state owner for the visualization frontend.
 * Placeholder structure for Phase 4A.
 */
export default function App() {
  // Scaffolding placeholder state
  const [graphData, setGraphData] = useState(null);
  const [benchmarkStats, setBenchmarkStats] = useState(null);
  const [queryResponse, setQueryResponse] = useState(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(500);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mock search query triggered from search bar input
  const handleSearch = (word) => {
    setIsLoading(true);
    setError(null);
    console.log(`Mock search requested for: ${word}`);
    // Simulate lookup without API fetches
    setTimeout(() => {
      setIsLoading(false);
      // Setup mock empty response structures
      setQueryResponse({
        hnsw_results: [],
        brute_force_results: [],
        steps: [],
        stats: {
          hnsw_visited: 0,
          brute_force_visited: 5000,
          hnsw_time_ms: 0.0,
          brute_force_time_ms: 0.0,
          recall: 0.0,
        },
      });
    }, 500);
  };

  // Mock playback control triggers
  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleStepForward = () => setCurrentStepIdx((prev) => prev + 1);
  const handleStepBack = () => setCurrentStepIdx((prev) => Math.max(prev - 1, -1));
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIdx(-1);
  };
  const handleSeek = (idx) => setCurrentStepIdx(idx);
  const handleChangeSpeed = (ms) => setPlaybackSpeed(ms);

  const totalSteps = queryResponse && queryResponse.steps ? queryResponse.steps.length : 0;
  const hnswResults = queryResponse ? queryResponse.hnsw_results : [];
  const bruteForceResults = queryResponse ? queryResponse.brute_force_results : [];
  const comparisonStats = queryResponse ? queryResponse.stats : null;
  const currentStep = queryResponse && currentStepIdx >= 0 ? queryResponse.steps[currentStepIdx] : null;

  return (
    <div className="app-container">
      <Header
        benchmarkStats={benchmarkStats}
        onSearch={handleSearch}
        isLoading={isLoading}
      />

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {isLoading && <div className="loader-placeholder">Loading...</div>}

      <main className="app-main-grid">
        {/* Left Column - Traversal Visualizer */}
        <section className="column-visualizer panel-card">
          <div className="panel-header">
            <h2 className="panel-title">Graph Routing Visualization</h2>
          </div>
          
          <GraphCanvas
            graphData={graphData}
            currentStep={currentStep}
            hnswResults={hnswResults}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />

          <TraversalPlayer
            currentStepIdx={currentStepIdx}
            totalSteps={totalSteps}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            onPlayPause={handlePlayPause}
            onStepForward={handleStepForward}
            onStepBack={handleStepBack}
            onReset={handleReset}
            onSeek={handleSeek}
            onChangeSpeed={handleChangeSpeed}
          />
        </section>

        {/* Right Column - Sideline Panels */}
        <section className="column-sidebar">
          <div className="panel-card scrollable">
            {selectedNodeId !== null ? (
              <NodeInspector
                nodeId={selectedNodeId}
                graphData={graphData}
                words={[]}
                onClose={() => setSelectedNodeId(null)}
              />
            ) : (
              <ComparisonPanel
                hnswResults={hnswResults}
                bruteForceResults={bruteForceResults}
                stats={comparisonStats}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
