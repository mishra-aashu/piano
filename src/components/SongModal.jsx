import React, { useState } from 'react';
import { SONGS } from '../utils/songs';
import { Play, BookOpen, Clock, Music2, CheckCircle2, Upload } from 'lucide-react';

export default function SongModal({
  isOpen,
  onClose,
  currentSong,
  onSelectSong,
  onStartPractice,
  onStartPlay
}) {
  const [filterDifficulty, setFilterDifficulty] = useState('All');

  if (!isOpen) return null;

  const filteredSongs = SONGS.filter(song => {
    if (filterDifficulty === 'All') return true;
    return song.difficulty === filterDifficulty;
  });

  // Custom song upload handler (JSON format)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.notes && Array.isArray(parsed.notes)) {
          const customSong = {
            id: `custom-${Date.now()}`,
            title: parsed.title || file.name.replace('.json', ''),
            composer: parsed.composer || 'Custom Upload',
            difficulty: 'Custom',
            bpm: parsed.bpm || 120,
            keySignature: parsed.keySignature || 'Unknown',
            description: 'Custom imported piano arrangement.',
            notes: parsed.notes
          };
          onSelectSong(customSong);
          onClose();
        } else {
          alert('Invalid song file format. Must contain a "notes" array.');
        }
      } catch (err) {
        alert('Could not parse song JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content song-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Concert Repertoire & Learn</h3>
            <p className="modal-subtitle">Select a masterpiece to watch on the waterfall visualizer or practice interactively</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button">×</button>
        </div>

        {/* Filter Tabs */}
        <div className="song-filter-tabs">
          {['All', 'Beginner', 'Intermediate', 'Advanced'].map(diff => (
            <button
              key={diff}
              className={`filter-tab ${filterDifficulty === diff ? 'active' : ''}`}
              onClick={() => setFilterDifficulty(diff)}
              type="button"
            >
              {diff}
            </button>
          ))}
        </div>

        {/* Song List */}
        <div className="song-cards-grid">
          {filteredSongs.map(song => {
            const isSelected = currentSong && currentSong.id === song.id;

            return (
              <div
                key={song.id}
                className={`song-card ${isSelected ? 'selected' : ''}`}
              >
                <div className="song-card-header">
                  <div>
                    <h4 className="song-card-title">{song.title}</h4>
                    <span className="song-card-composer">{song.composer}</span>
                  </div>
                  <span className={`difficulty-pill ${song.difficulty.toLowerCase()}`}>
                    {song.difficulty}
                  </span>
                </div>

                <p className="song-card-desc">{song.description}</p>

                <div className="song-card-meta">
                  <span><Clock size={13} /> {song.bpm} BPM</span>
                  <span><Music2 size={13} /> {song.keySignature}</span>
                  <span>{song.notes.length} notes</span>
                </div>

                <div className="song-card-actions">
                  <button
                    className="song-action-btn watch-btn"
                    onClick={() => {
                      onSelectSong(song);
                      onStartPlay(song);
                      onClose();
                    }}
                    type="button"
                  >
                    <Play size={14} fill="currentColor" />
                    <span>Watch & Listen</span>
                  </button>

                  <button
                    className="song-action-btn practice-btn"
                    onClick={() => {
                      onSelectSong(song);
                      onStartPractice(song);
                      onClose();
                    }}
                    type="button"
                  >
                    <BookOpen size={14} />
                    <span>Practice Mode</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Import JSON track */}
        <div className="song-modal-footer">
          <label className="import-song-label">
            <Upload size={14} />
            <span>Import Custom Song (JSON)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
