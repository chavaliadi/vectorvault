import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import GraphCanvas from "./components/GraphCanvas";
import TraversalPlayer from "./components/TraversalPlayer";
import ComparisonPanel from "./components/ComparisonPanel";
import NodeInspector from "./components/NodeInspector";

import { fetchGraph, fetchBenchmark, searchWord } from "./utils/api";

/**
 * Root App component.
 * Acts as the centralized state owner.
 * Connected to backend endpoints for Graph, Benchmark, and Search in Phase 4C.
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

  // Playback timer loop logic using useEffect interval
  useEffect(() => {
    if (!isPlaying || !queryResponse || !queryResponse.steps) return;
    const total = queryResponse.steps.length;
    if (total === 0) {
      setIsPlaying(false);
      return;
    }

    const intervalId = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev >= total - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, playbackSpeed);

    return () => clearInterval(intervalId);
  }, [isPlaying, playbackSpeed, queryResponse]);

  // Search query handler using searchWord() API helper
  const handleSearch = async (word) => {
    try {
      setIsLoading(true);
      setError(null);
      setIsPlaying(false);
      setCurrentStepIdx(-1);
      setQueryResponse(null);

      const response = await searchWord(word, 10, 50); // Default k=10, ef=50
      setQueryResponse(response);
    } catch (err) {
      setError(err.message || "Query search failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // Traversal Playback handlers updating only indices and state variables
  const handlePlayPause = () => {
    if (!queryResponse || !queryResponse.steps || queryResponse.steps.length === 0) return;
    const total = queryResponse.steps.length;
    if (currentStepIdx >= total - 1) {
      setCurrentStepIdx(-1);
    }
    setIsPlaying(!isPlaying);
  };

  const handleStepForward = () => {
    if (!queryResponse || !queryResponse.steps) return;
    const total = queryResponse.steps.length;
    setCurrentStepIdx((prev) => Math.min(prev + 1, total - 1));
  };

  const handleStepBack = () => {
    setCurrentStepIdx((prev) => Math.max(prev - 1, -1));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIdx(-1);
  };

  const handleSeek = (idx) => {
    setCurrentStepIdx(idx);
  };

  const handleChangeSpeed = (ms) => {
    setPlaybackSpeed(ms);
  };

  const handleSelectNode = (nodeId) => {
    setSelectedNodeId(nodeId);
  };

  const totalSteps = queryResponse && queryResponse.steps ? queryResponse.steps.length : 0;
  const hnswResults = queryResponse ? queryResponse.hnsw_results : [];
  const bruteForceResults = queryResponse ? queryResponse.brute_force_results : [];
  const comparisonStats = queryResponse ? queryResponse.stats : null;
  const currentStep = queryResponse && queryResponse.steps && currentStepIdx >= 0 ? queryResponse.steps[currentStepIdx] : null;

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
          Processing...
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
                onSelectNode={handleSelectNode}
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
