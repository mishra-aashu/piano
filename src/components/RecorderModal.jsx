import React, { useState } from 'react';
import { Circle, Square, Play, Download, Trash2, Mic, Music } from 'lucide-react';

export default function RecorderModal({
  isOpen,
  onClose,
  isRecording,
  recordingTime,
  recordings,
  onStartRecord,
  onStopRecord,
  onPlayRecording,
  onDeleteRecording
}) {
  const [trackTitle, setTrackTitle] = useState('');

  if (!isOpen) return null;

  // Format seconds to mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleDownload = (rec) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(rec, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${rec.title.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content recorder-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Studio Performance Recorder</h3>
            <p className="modal-subtitle">Record your live piano playing, listen back, and export your compositions</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button">×</button>
        </div>

        {/* Current Recording Status Box */}
        <div className={`record-status-card ${isRecording ? 'recording' : ''}`}>
          <div className="record-status-indicator">
            {isRecording ? (
              <div className="recording-badge">
                <span className="rec-pulse-dot"></span>
                <span>RECORDING LIVE</span>
              </div>
            ) : (
              <span className="standby-badge">STANDBY</span>
            )}
            <span className="record-timer">{formatTime(recordingTime)}</span>
          </div>

          <div className="record-main-actions">
            {!isRecording ? (
              <button
                className="record-btn start-rec"
                onClick={onStartRecord}
                type="button"
              >
                <Circle size={18} fill="currentColor" />
                <span>Start Recording</span>
              </button>
            ) : (
              <button
                className="record-btn stop-rec"
                onClick={onStopRecord}
                type="button"
              >
                <Square size={18} fill="currentColor" />
                <span>Stop & Save</span>
              </button>
            )}
          </div>
        </div>

        {/* Recorded Tracks List */}
        <div className="recordings-list-section">
          <h4>Saved Recordings ({recordings.length})</h4>

          {recordings.length === 0 ? (
            <div className="empty-recordings-state">
              <Music size={32} className="empty-rec-icon" />
              <p>No tracks recorded yet. Hit record and play your masterpiece!</p>
            </div>
          ) : (
            <div className="recordings-items">
              {recordings.map((rec) => (
                <div key={rec.id} className="recording-item">
                  <div className="rec-item-info">
                    <span className="rec-item-title">{rec.title}</span>
                    <span className="rec-item-meta">
                      {rec.notes ? rec.notes.length : 0} notes • {formatTime(rec.duration || 0)} • {rec.date}
                    </span>
                  </div>

                  <div className="rec-item-actions">
                    <button
                      className="rec-action-icon play"
                      title="Play back recording"
                      onClick={() => {
                        onPlayRecording(rec);
                        onClose();
                      }}
                      type="button"
                    >
                      <Play size={15} fill="currentColor" />
                    </button>

                    <button
                      className="rec-action-icon download"
                      title="Download JSON track"
                      onClick={() => handleDownload(rec)}
                      type="button"
                    >
                      <Download size={15} />
                    </button>

                    <button
                      className="rec-action-icon delete"
                      title="Delete recording"
                      onClick={() => onDeleteRecording(rec.id)}
                      type="button"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
