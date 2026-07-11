import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import GraphCanvas from "./components/GraphCanvas";
import TraversalPlayer from "./components/TraversalPlayer";
import ComparisonPanel from "./components/ComparisonPanel";
import NodeInspector from "./components/NodeInspector";

import { fetchGraph, fetchBenchmark, searchWord } from "./utils/api";

export default function App() {
  // Global Graph & Index Metrics State
  const [graphData, setGraphData] = useState(null);
  const [benchmarkStats, setBenchmarkStats] = useState(null);

  // Search Query & Animation Traversal State
  const [queryResponse, setQueryResponse] = useState(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(500); // 0.5s default

  // Interaction State
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Initial mounting fetch to load graph coordinates and stats
  useEffect(() => {
    async function initApp() {
      try {
        setIsLoading(true);
        const [graph, stats] = await Promise.all([fetchGraph(), fetchBenchmark()]);
        setGraphData(graph);
        setBenchmarkStats(stats);
      } catch (err) {
        setError("Failed to connect to backend server. Make sure FastAPI server is running.");
      } finally {
        setIsLoading(false);
      }
    }
    initApp();
  }, []);

  // 2. Playback animation interval loop
  useEffect(() => {
    if (!isPlaying || !queryResponse) return;

    const totalSteps = queryResponse.steps.length;
    if (currentStepIdx >= totalSteps - 1) {
      setIsPlaying(false);
      return;
    }

    const intervalId = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev >= totalSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, playbackSpeed);

    return () => clearInterval(intervalId);
  }, [isPlaying, currentStepIdx, playbackSpeed, queryResponse]);

  // 3. Search action trigger
  const handleSearch = async (word, k, ef) => {
    try {
      setIsLoading(true);
      setError(null);
      setIsPlaying(false);
      setCurrentStepIdx(-1);
      setQueryResponse(null);

      const response = await searchWord(word, k, ef);
      setQueryResponse(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Playback handlers
  const handlePlayPause = () => {
    if (!queryResponse) return;
    if (currentStepIdx >= queryResponse.steps.length - 1) {
      // Re-start from beginning if finished
      setCurrentStepIdx(-1);
    }
    setIsPlaying(!isPlaying);
  };

  const handleStepForward = () => {
    if (!queryResponse || isPlaying) return;
    setCurrentStepIdx((prev) => Math.min(prev + 1, queryResponse.steps.length - 1));
  };

  const handleStepBack = () => {
    if (!queryResponse || isPlaying) return;
    setCurrentStepIdx((prev) => Math.max(prev - 1, -1));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIdx(-1);
  };

  const handleSeek = (idx) => {
    if (!queryResponse) return;
    setIsPlaying(false);
    setCurrentStepIdx(idx);
  };

  const handleChangeSpeed = (ms) => {
    setPlaybackSpeed(ms);
  };

  // Active step coordinates for visualization
  const currentStep =
    queryResponse && currentStepIdx >= 0 ? queryResponse.steps[currentStepIdx] : null;

  const totalSteps = queryResponse ? queryResponse.steps.length : 0;
  const hnswResults = queryResponse ? queryResponse.hnsw_results : [];
  const bruteForceResults = queryResponse ? queryResponse.brute_force_results : [];
  const comparisonStats = queryResponse ? queryResponse.stats : null;

  return (
    <div className="app-container">
      <Header
        benchmarkStats={benchmarkStats}
        onSearch={handleSearch}
        isLoading={isLoading}
      />

      {error && (
        <div className="error-banner">
          <span className="error-message">⚠️ {error}</span>
          <button className="btn-close-error" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}

      {isLoading && (
        <div className="loader-overlay">
          <div className="loader-content">
            <div className="spinner"></div>
            <div className="loader-text">Constructing Index & Routing Query...</div>
          </div>
        </div>
      )}

      <main className="app-main-grid">
        {/* Left Column - Traversal Visualizer */}
        <section className="column-visualizer panel-card">
          <div className="panel-header">
            <h2 className="panel-title">HNSW Routing Traversal</h2>
            {currentStep && (
              <div className="panel-subtitle">
                Active Layer: <span className="badge-layer">Layer {currentStep.layer}</span>
              </div>
            )}
          </div>
          <GraphCanvas
            graphData={graphData}
            currentStep={currentStep}
            currentStepIdx={currentStepIdx}
            steps={queryResponse?.steps || []}
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

        {/* Right Column - Comparison Stats & Node Inspector */}
        <section className="column-sidebar">
          {selectedNodeId !== null ? (
            <div className="panel-card scrollable">
              <NodeInspector
                nodeId={selectedNodeId}
                graphData={graphData}
                onSelectNode={setSelectedNodeId}
                onClose={() => setSelectedNodeId(null)}
              />
            </div>
          ) : (
            <div className="panel-card scrollable">
              <ComparisonPanel
                hnswResults={hnswResults}
                bruteForceResults={bruteForceResults}
                stats={comparisonStats}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
