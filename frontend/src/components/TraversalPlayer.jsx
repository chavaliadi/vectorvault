import React from "react";

export default function TraversalPlayer({
  currentStepIdx,
  totalSteps,
  isPlaying,
  playbackSpeed,
  onPlayPause,
  onStepForward,
  onStepBack,
  onReset,
  onSeek,
  onChangeSpeed,
}) {
  const isCompleted = currentStepIdx === totalSteps - 1;
  const isStart = currentStepIdx === -1;

  return (
    <div className="traversal-player">
      <div className="player-controls-row">
        <button className="btn-control" onClick={onReset} title="Reset Animation">
          ⏮ Reset
        </button>

        <button className="btn-control" onClick={onStepBack} disabled={isStart} title="Step Back">
          ◀ Back
        </button>

        <button className="btn-control btn-play-pause" onClick={onPlayPause} title={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>

        <button className="btn-control" onClick={onStepForward} disabled={isCompleted || totalSteps === 0} title="Step Forward">
          Forward ▶
        </button>
      </div>

      <div className="player-timeline-row">
        <span className="timeline-label">Step:</span>
        <input
          type="range"
          min="-1"
          max={totalSteps - 1}
          value={currentStepIdx}
          onChange={(e) => onSeek(parseInt(e.target.value))}
          disabled={totalSteps === 0}
          className="timeline-slider"
        />
        <span className="timeline-counter">
          {currentStepIdx + 1} / {totalSteps}
        </span>
      </div>

      <div className="player-speed-row">
        <span className="speed-label">Playback Interval:</span>
        <button
          className={`btn-speed ${playbackSpeed === 1000 ? "active" : ""}`}
          onClick={() => onChangeSpeed(1000)}
        >
          Slow (1.0s)
        </button>
        <button
          className={`btn-speed ${playbackSpeed === 500 ? "active" : ""}`}
          onClick={() => onChangeSpeed(500)}
        >
          Normal (0.5s)
        </button>
        <button
          className={`btn-speed ${playbackSpeed === 200 ? "active" : ""}`}
          onClick={() => onChangeSpeed(200)}
        >
          Fast (0.2s)
        </button>
      </div>
    </div>
  );
}
