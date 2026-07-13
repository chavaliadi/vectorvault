import React from "react";

/**
 * TraversalPlayer component.
 * Responsible for rendering timeline seeking and animation playback speed controls.
 * React-only state modification, holds no graph or traversal logic.
 * 
 * Props
 * -----
 * currentStepIdx : Number
 * totalSteps : Number
 * isPlaying : Boolean
 * playbackSpeed : Number
 * onPlayPause : Function
 * onStepForward : Function
 * onStepBack : Function
 * onReset : Function
 * onSeek : Function
 * onChangeSpeed : Function
 */
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
    <div className="traversal-player-placeholder">
      <div className="player-controls-row">
        <button onClick={onReset} className="btn-control-placeholder" title="Reset Traversal">
          ⏮ Reset
        </button>
        <button onClick={onStepBack} disabled={isStart} className="btn-control-placeholder" title="Step Back">
          ◀ Back
        </button>
        <button onClick={onPlayPause} disabled={totalSteps === 0} className="btn-control-placeholder btn-play-pause-placeholder" title={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
        <button onClick={onStepForward} disabled={isCompleted || totalSteps === 0} className="btn-control-placeholder" title="Step Forward">
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
          onChange={(e) => onSeek && onSeek(parseInt(e.target.value))}
          disabled={totalSteps === 0}
          className="timeline-slider-placeholder"
        />
        <span className="timeline-counter">
          {currentStepIdx + 1} / {totalSteps}
        </span>
      </div>

      <div className="player-speed-row">
        <span>Interval:</span>
        <button
          onClick={() => onChangeSpeed && onChangeSpeed(1000)}
          className={`btn-speed-placeholder ${playbackSpeed === 1000 ? "active" : ""}`}
        >
          Slow (1.0s)
        </button>
        <button
          onClick={() => onChangeSpeed && onChangeSpeed(500)}
          className={`btn-speed-placeholder ${playbackSpeed === 500 ? "active" : ""}`}
        >
          Normal (0.5s)
        </button>
        <button
          onClick={() => onChangeSpeed && onChangeSpeed(200)}
          className={`btn-speed-placeholder ${playbackSpeed === 200 ? "active" : ""}`}
        >
          Fast (0.2s)
        </button>
      </div>
    </div>
  );
}
