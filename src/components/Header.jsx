import React from 'react';
import {
  Volume2,
  VolumeX,
  Sliders,
  Disc,
  BookOpen,
  Settings,
  Waves,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import ChordBadge from './ChordBadge';

const INSTRUMENTS = [
  { id: 'acoustic', label: 'Grand Piano', icon: '🎹' },
  { id: 'rhodes', label: 'Vintage Rhodes', icon: '⚡' },
  { id: 'synth', label: '80s Synth', icon: '🎛️' },
  { id: 'celesta', label: 'Celesta', icon: '✨' },
  { id: 'marimba', label: 'Marimba', icon: '🪵' },
  { id: 'organ', label: 'Pipe Organ', icon: '⛪' }
];

export default function Header({
  instrument,
  setInstrument,
  volume,
  setVolume,
  isMuted,
  setIsMuted,
  reverbLevel,
  setReverbLevel,
  sustainOn,
  toggleSustain,
  baseOctave,
  shiftOctave,
  chord,
  isRecording,
  onOpenRecorder,
  onOpenSongs,
  onOpenMetronome,
  onOpenSettings,
  activeSong,
  isPracticeMode
}) {
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="piano-header">
      {/* Top Banner: Brand Logo & Status */}
      <div className="header-top-bar">
        <div className="brand-group">
          <div className="brand-logo-emblem">
            <span className="piano-keys-icon">🎹</span>
          </div>
          <div>
            <h1 className="brand-title">AURA GRAND VIRTUOSO</h1>
            <p className="brand-tagline">Concert Grand & Sound Synthesizer Workstation</p>
          </div>
        </div>

        {/* Live Detected Chord Badge in center */}
        <div className="header-center-chord">
          <ChordBadge chord={chord} />
        </div>

        {/* Action Buttons: Learn, Record, Metronome, Settings */}
        <div className="header-action-buttons">
          <button
            className={`studio-btn ${activeSong ? 'active-glow' : ''}`}
            onClick={onOpenSongs}
            type="button"
          >
            <BookOpen size={16} />
            <span>{isPracticeMode ? 'Practice: ' + (activeSong ? activeSong.title : 'Songs') : (activeSong ? activeSong.title : 'Song Library')}</span>
          </button>

          <button
            className={`studio-btn rec-btn ${isRecording ? 'recording-pulse' : ''}`}
            onClick={onOpenRecorder}
            type="button"
          >
            <Disc size={16} />
            <span>{isRecording ? 'Rec...' : 'Record'}</span>
          </button>

          <button
            className="studio-btn"
            onClick={onOpenMetronome}
            type="button"
          >
            <Waves size={16} />
            <span>Metronome</span>
          </button>

          <button
            className="studio-btn icon-only"
            onClick={onOpenSettings}
            title="Settings & Keyboard Guide"
            type="button"
          >
            <Settings size={17} />
          </button>

          <button
            className="studio-btn icon-only fullscreen-btn"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            type="button"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Second Row: Instrument Selector & Studio Knobs */}
      <div className="header-dock-row">
        {/* Instrument Switcher Tabs */}
        <div className="instrument-selector-group">
          {INSTRUMENTS.map(inst => (
            <button
              key={inst.id}
              className={`instrument-pill ${instrument === inst.id ? 'active' : ''}`}
              onClick={() => setInstrument(inst.id)}
              type="button"
            >
              <span className="instrument-icon">{inst.icon}</span>
              <span className="instrument-name">{inst.label}</span>
            </button>
          ))}
        </div>

        {/* Right Studio Controls: Octave Shift, Sustain Pedal, Volume, Reverb */}
        <div className="studio-hardware-controls">
          {/* Octave Shifter */}
          <div className="octave-control-box">
            <span className="control-label">OCTAVE</span>
            <div className="octave-button-group">
              <button
                className="octave-step-btn"
                onClick={() => shiftOctave(-1)}
                disabled={baseOctave <= 1}
                title="Shift Octave Down (-1)"
                type="button"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="octave-indicator">C{baseOctave}-C{baseOctave + 3}</span>
              <button
                className="octave-step-btn"
                onClick={() => shiftOctave(1)}
                disabled={baseOctave >= 5}
                title="Shift Octave Up (+1)"
                type="button"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Sustain Pedal Toggle */}
          <div className="pedal-control-box">
            <button
              className={`sustain-pedal-button ${sustainOn ? 'engaged' : ''}`}
              onClick={toggleSustain}
              title="Toggle Sustain Pedal (or hold Spacebar)"
              type="button"
            >
              <div className="pedal-brass-plate"></div>
              <span>SUSTAIN {sustainOn ? 'ON' : 'OFF'}</span>
              <span className="pedal-kbd-hint">SPACE</span>
            </button>
          </div>

          {/* Reverb Slider */}
          <div className="knob-control-box">
            <div className="knob-header">
              <span className="control-label">REVERB</span>
              <span className="control-val">{Math.round(reverbLevel * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={reverbLevel}
              onChange={e => setReverbLevel(parseFloat(e.target.value))}
              className="studio-slider"
            />
          </div>

          {/* Master Volume Slider */}
          <div className="knob-control-box">
            <div className="knob-header">
              <button
                className="mute-toggle-btn"
                onClick={() => setIsMuted(!isMuted)}
                type="button"
              >
                {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <span className="control-label">VOL</span>
              <span className="control-val">{isMuted ? 'MUTED' : `${Math.round(volume * 100)}%`}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={e => {
                if (isMuted) setIsMuted(false);
                setVolume(parseFloat(e.target.value));
              }}
              className="studio-slider"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
