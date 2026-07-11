import React from "react";

/**
 * TraversalPlayer component.
 * Responsible for timeline seeking and animation play/pause loop intervals.
 * Scaffolded as placeholder for Phase 4A.
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
  return (
    <div className="traversal-player-placeholder">
      <div className="player-controls-row">
        <button onClick={onReset} className="btn-control-placeholder">⏮ Reset</button>
        <button onClick={onStepBack} className="btn-control-placeholder">◀ Back</button>
        <button onClick={onPlayPause} className="btn-control-placeholder">
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
        <button onClick={onStepForward} className="btn-control-placeholder">Forward ▶</button>
      </div>

      <div className="player-timeline-row">
        <span className="timeline-label">Step:</span>
        <input
          type="range"
          min="-1"
          max={totalSteps - 1}
          value={currentStepIdx}
          onChange={(e) => onSeek && onSeek(parseInt(e.target.value))}
          className="timeline-slider-placeholder"
        />
        <span className="timeline-counter">
          {currentStepIdx + 1} / {totalSteps}
        </span>
      </div>

      <div className="player-speed-row">
        <span>Interval: {playbackSpeed}ms</span>
        <button onClick={() => onChangeSpeed && onChangeSpeed(500)} className="btn-speed-placeholder">
          Set Speed (500ms)
        </button>
      </div>
    </div>
  );
}
