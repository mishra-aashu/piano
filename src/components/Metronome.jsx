import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Plus, Minus, Volume2 } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

export default function Metronome({ isOpen, onClose }) {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [currentBeat, setCurrentBeat] = useState(0);

  const timerRef = useRef(null);
  const tapTimesRef = useRef([]);

  // Tap Tempo calculation
  const handleTapTempo = () => {
    const now = Date.now();
    tapTimesRef.current.push(now);

    // Keep only last 4 taps
    if (tapTimesRef.current.length > 4) {
      tapTimesRef.current.shift();
    }

    if (tapTimesRef.current.length >= 2) {
      const intervals = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      if (calculatedBpm >= 40 && calculatedBpm <= 240) {
        setBpm(calculatedBpm);
      }
    }
  };

  // Play click sound using soundEngine AudioContext
  const playClick = (isAccent) => {
    soundEngine.init();
    if (!soundEngine.ctx) return;

    const ctx = soundEngine.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isAccent ? 1300 : 880, ctx.currentTime);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  };

  // Metronome tick loop
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      setCurrentBeat(0);
      return;
    }

    const intervalMs = (60 / bpm) * 1000;
    let beat = 0;

    const tick = () => {
      const isAccent = beat === 0;
      playClick(isAccent);
      setCurrentBeat(beat);
      beat = (beat + 1) % beatsPerBar;
    };

    tick();
    timerRef.current = setInterval(tick, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, bpm, beatsPerBar]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content metronome-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Studio Metronome</h3>
          <button className="modal-close-btn" onClick={onClose} type="button">×</button>
        </div>

        <div className="metronome-body">
          {/* Visual Beat Indicator Dots */}
          <div className="metronome-beats-indicator">
            {Array.from({ length: beatsPerBar }).map((_, i) => (
              <div
                key={i}
                className={`beat-dot ${isPlaying && currentBeat === i ? (i === 0 ? 'accent' : 'active') : ''}`}
              />
            ))}
          </div>

          {/* BPM Display */}
          <div className="bpm-display-group">
            <span className="bpm-number">{bpm}</span>
            <span className="bpm-label">BPM</span>
          </div>

          {/* BPM Slider */}
          <div className="metronome-slider-group">
            <button
              className="bpm-adjust-btn"
              onClick={() => setBpm(b => Math.max(40, b - 1))}
              type="button"
            >
              <Minus size={16} />
            </button>
            <input
              type="range"
              min="40"
              max="240"
              value={bpm}
              onChange={e => setBpm(Number(e.target.value))}
              className="bpm-slider"
            />
            <button
              className="bpm-adjust-btn"
              onClick={() => setBpm(b => Math.min(240, b + 1))}
              type="button"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Time Signature Buttons */}
          <div className="time-signature-selector">
            {[
              { val: 2, label: '2/4' },
              { val: 3, label: '3/4' },
              { val: 4, label: '4/4' },
              { val: 6, label: '6/8' }
            ].map(ts => (
              <button
                key={ts.val}
                className={`time-sig-btn ${beatsPerBar === ts.val ? 'active' : ''}`}
                onClick={() => setBeatsPerBar(ts.val)}
                type="button"
              >
                {ts.label}
              </button>
            ))}
          </div>

          {/* Tap Tempo & Start / Stop */}
          <div className="metronome-action-row">
            <button
              className="tap-tempo-btn"
              onClick={handleTapTempo}
              type="button"
            >
              TAP TEMPO
            </button>

            <button
              className={`metronome-toggle-btn ${isPlaying ? 'playing' : ''}`}
              onClick={() => setIsPlaying(p => !p)}
              type="button"
            >
              {isPlaying ? (
                <>
                  <Square size={16} fill="currentColor" />
                  <span>STOP</span>
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" />
                  <span>START</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
