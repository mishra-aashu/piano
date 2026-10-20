import React from 'react';
import { Sparkles, Music } from 'lucide-react';

export default function ChordBadge({ chord }) {
  if (!chord) {
    return (
      <div className="chord-badge-wrapper chord-idle">
        <Music size={14} className="chord-icon" />
        <span className="chord-idle-text">Play a chord...</span>
      </div>
    );
  }

  return (
    <div className="chord-badge-wrapper chord-detected">
      <Sparkles size={14} className="chord-sparkle-icon" />
      <div className="chord-content">
        <span className="chord-symbol">{chord.symbol}</span>
        <span className="chord-name">{chord.type}</span>
      </div>
      <div className="chord-notes-list">
        {chord.notes.map(n => (
          <span key={n} className="chord-note-pill">{n}</span>
        ))}
      </div>
    </div>
  );
}
