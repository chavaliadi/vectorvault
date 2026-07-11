import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import GraphCanvas from "./components/GraphCanvas";
import TraversalPlayer from "./components/TraversalPlayer";
import ComparisonPanel from "./components/ComparisonPanel";
import NodeInspector from "./components/NodeInspector";

import { fetchGraph, fetchBenchmark } from "./utils/api";

/**
 * Root App component.
 * Acts as the centralized state owner.
 * Connected to backend endpoints for Graph and Benchmark fetching in Phase 4B.
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch initial graph structure and benchmark stats on startup
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const [graph, stats] = await Promise.all([fetchGraph(), fetchBenchmark()]);
        setGraphData(graph);
        setBenchmarkStats(stats);
      } catch (err) {
        setError(err.message || "Failed to connect to backend server.");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Search query handler (Search logic not implemented in Phase 4B)
  const handleSearch = (word) => {
    console.log(`Search requested for: ${word} (Not implemented in Phase 4B)`);
  };

  // Traversal Playback handlers (Playback logic not implemented in Phase 4B)
  const handlePlayPause = () => {};
  const handleStepForward = () => {};
  const handleStepBack = () => {};
  const handleReset = () => {};
  const handleSeek = (idx) => {};
  const handleChangeSpeed = (ms) => {};

  const handleSelectNode = (nodeId) => {
    setSelectedNodeId(nodeId);
  };

  const totalSteps = 0;
  const hnswResults = [];
  const bruteForceResults = [];
  const comparisonStats = null;
  const currentStep = null;

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

      {isLoading && (
        <div className="loader-placeholder">
          Loading graph structure and benchmark stats...
        </div>
      )}

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
            onSelectNode={handleSelectNode}
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
                words={graphData ? graphData.nodes.map((n) => n.word) : []}
                onClose={() => handleSelectNode(null)}
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
