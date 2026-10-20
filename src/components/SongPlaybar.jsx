import React from 'react';
import { Play, Pause, RotateCcw, X, BookOpen, Music, Zap } from 'lucide-react';

export default function SongPlaybar({
  song,
  isPlaying,
  currentTime,
  totalDuration,
  playbackSpeed,
  setPlaybackSpeed,
  onPlayPause,
  onRestart,
  onClose,
  isPracticeMode,
  setIsPracticeMode,
  practiceScore,
  practiceStreak
}) {
  if (!song) return null;

  const formatSecs = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="song-playbar-container">
      <div className="song-playbar-content">
        {/* Left: Song Info & Mode Toggle */}
        <div className="playbar-left">
          <div className="playbar-song-meta">
            <span className="playbar-song-title">{song.title}</span>
            <span className="playbar-song-composer">{song.composer}</span>
          </div>

          <div className="playbar-mode-toggle">
            <button
              className={`mode-btn ${!isPracticeMode ? 'active' : ''}`}
              onClick={() => setIsPracticeMode(false)}
              type="button"
            >
              <Music size={13} />
              <span>Watch</span>
            </button>
            <button
              className={`mode-btn ${isPracticeMode ? 'active' : ''}`}
              onClick={() => setIsPracticeMode(true)}
              type="button"
            >
              <BookOpen size={13} />
              <span>Practice Mode</span>
            </button>
          </div>
        </div>

        {/* Center: Transport Controls & Timeline */}
        <div className="playbar-center">
          <div className="playbar-controls">
            <button
              className="playbar-btn restart-btn"
              onClick={onRestart}
              title="Restart Song"
              type="button"
            >
              <RotateCcw size={15} />
            </button>

            <button
              className="playbar-btn main-play-btn"
              onClick={onPlayPause}
              title={isPlaying ? 'Pause' : 'Play'}
              type="button"
            >
              {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
            </button>

            {/* Speed Multiplier */}
            <div className="playbar-speed-group">
              {[0.5, 0.75, 1.0, 1.25].map(spd => (
                <button
                  key={spd}
                  className={`speed-pill ${playbackSpeed === spd ? 'active' : ''}`}
                  onClick={() => setPlaybackSpeed(spd)}
                  type="button"
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Timeline & Progress Bar */}
          <div className="playbar-timeline">
            <span className="timeline-time">{formatSecs(currentTime)}</span>
            <div className="timeline-bar-bg">
              <div
                className="timeline-bar-fill"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
            <span className="timeline-time">{formatSecs(totalDuration)}</span>
          </div>
        </div>

        {/* Right: Practice Stats & Close */}
        <div className="playbar-right">
          {isPracticeMode && (
            <div className="practice-stats-box">
              <div className="practice-stat-item">
                <span className="stat-label">SCORE</span>
                <span className="stat-value">{practiceScore}</span>
              </div>
              <div className="practice-stat-item streak">
                <Zap size={13} className="streak-icon" />
                <span className="stat-value">{practiceStreak}</span>
              </div>
            </div>
          )}

          <button
            className="playbar-close-btn"
            onClick={onClose}
            title="Exit Song"
            type="button"
          >
            <X size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
