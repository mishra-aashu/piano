import React from 'react';
import { Keyboard, Sliders, Cable, Info, Music } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  labelMode,
  setLabelMode,
  visualizerMode,
  setVisualizerMode,
  midiDevices,
  isMidiSupported
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Settings & Keyboard Guide</h3>
            <p className="modal-subtitle">Customize key shortcuts, audio visualization, and external MIDI connections</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button">×</button>
        </div>

        <div className="settings-sections">
          {/* 1. Key Labels */}
          <div className="settings-card">
            <div className="settings-card-title">
              <Keyboard size={18} />
              <h4>Key Labeling Style</h4>
            </div>
            <div className="radio-pill-group">
              {[
                { id: 'keyboard', label: 'Computer Keys (Q, W, E...)' },
                { id: 'notes', label: 'Note Names (C4, D4...)' },
                { id: 'solfege', label: 'Solfège (Do, Re, Mi...)' },
                { id: 'none', label: 'Concert Clean (None)' }
              ].map(opt => (
                <button
                  key={opt.id}
                  className={`radio-pill-btn ${labelMode === opt.id ? 'active' : ''}`}
                  onClick={() => setLabelMode(opt.id)}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Audio Visualizer Style */}
          <div className="settings-card">
            <div className="settings-card-title">
              <Sliders size={18} />
              <h4>Audio Visualizer Style</h4>
            </div>
            <div className="radio-pill-group">
              {[
                { id: 'wave', label: 'Oscilloscope Waveform' },
                { id: 'spectrum', label: 'Harmonic Frequency Spectrum' }
              ].map(opt => (
                <button
                  key={opt.id}
                  className={`radio-pill-btn ${visualizerMode === opt.id ? 'active' : ''}`}
                  onClick={() => setVisualizerMode(opt.id)}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Physical Computer Keyboard Layout Reference */}
          <div className="settings-card keyboard-guide-card">
            <div className="settings-card-title">
              <Music size={18} />
              <h4>Computer Keyboard Layout Reference</h4>
            </div>
            <div className="key-guide-diagram">
              <div className="key-guide-row">
                <span className="key-guide-tag">Black Keys:</span>
                <div className="guide-keys-list black-list">
                  <span className="kbd-badge">2 (C#4)</span>
                  <span className="kbd-badge">3 (D#4)</span>
                  <span className="kbd-spacer"></span>
                  <span className="kbd-badge">5 (F#4)</span>
                  <span className="kbd-badge">6 (G#4)</span>
                  <span className="kbd-badge">7 (A#4)</span>
                </div>
              </div>
              <div className="key-guide-row">
                <span className="key-guide-tag">White Keys:</span>
                <div className="guide-keys-list white-list">
                  <span className="kbd-badge">Q (C4)</span>
                  <span className="kbd-badge">W (D4)</span>
                  <span className="kbd-badge">E (E4)</span>
                  <span className="kbd-badge">R (F4)</span>
                  <span className="kbd-badge">T (G4)</span>
                  <span className="kbd-badge">Y (A4)</span>
                  <span className="kbd-badge">U (B4)</span>
                  <span className="kbd-badge">I (C5)</span>
                </div>
              </div>
              <div className="key-guide-row">
                <span className="key-guide-tag">Pedal:</span>
                <div className="guide-keys-list">
                  <span className="kbd-badge wide">Spacebar (Hold for Sustain Pedal)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. MIDI Hardware Controller */}
          <div className="settings-card">
            <div className="settings-card-title">
              <Cable size={18} />
              <h4>Hardware MIDI Controller</h4>
            </div>
            {isMidiSupported ? (
              <div className="midi-status-box">
                {midiDevices.length > 0 ? (
                  <div className="midi-connected-list">
                    <span className="midi-badge online">● Online</span>
                    {midiDevices.map(d => (
                      <span key={d.id} className="midi-device-name">
                        {d.name} ({d.manufacturer})
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="midi-idle-msg">
                    No MIDI controllers detected. Connect any USB/Bluetooth MIDI keyboard or digital piano to play directly with physical velocity!
                  </p>
                )}
              </div>
            ) : (
              <p className="midi-idle-msg">Web MIDI is not supported on this browser version.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
