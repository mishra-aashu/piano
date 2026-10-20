import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { soundEngine } from './audio/soundEngine';
import {
  ALL_KEYS,
  getKeyboardRange,
  getNoteToKeyMap,
  KEYBOARD_SHORTCUTS,
  detectChord
} from './utils/musicTheory';
import { midiService } from './utils/midi';
import Header from './components/Header';
import PianoKeyboard from './components/PianoKeyboard';
import WaterfallVisualizer from './components/WaterfallVisualizer';
import AudioVisualizer from './components/AudioVisualizer';
import SongPlaybar from './components/SongPlaybar';
import SongModal from './components/SongModal';
import RecorderModal from './components/RecorderModal';
import Metronome from './components/Metronome';
import SettingsModal from './components/SettingsModal';
import './App.css';

export default function App() {
  // Sound & Instrument settings
  const [instrument, setInstrumentState] = useState('acoustic');
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [reverbLevel, setReverbLevelState] = useState(0.35);
  const [sustainOn, setSustainOn] = useState(false);

  // Keyboard navigation & visual settings
  const [baseOctave, setBaseOctave] = useState(3); // C3 to C6
  const [labelMode, setLabelMode] = useState('keyboard'); // 'keyboard', 'notes', 'solfege', 'none'
  const [visualizerMode, setVisualizerMode] = useState('spectrum'); // 'spectrum' | 'wave'

  // Active playing keys & chord recognition
  const [activeNotes, setActiveNotes] = useState(new Set());
  const activeNotesRef = useRef(new Set());
  activeNotesRef.current = activeNotes;

  // Key bounds map for Waterfall visualizer alignment
  const [keyBoundsMap, setKeyBoundsMap] = useState({});

  // Modals state
  const [isSongModalOpen, setIsSongModalOpen] = useState(false);
  const [isRecorderModalOpen, setIsRecorderModalOpen] = useState(false);
  const [isMetronomeOpen, setIsMetronomeOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // MIDI status
  const [midiDevices, setMidiDevices] = useState([]);
  const [isMidiSupported, setIsMidiSupported] = useState(true);

  // Song playback & Practice engine
  const [activeSong, setActiveSong] = useState(null);
  const [isSongPlaying, setIsSongPlaying] = useState(false);
  const [songTime, setSongTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [waitingNote, setWaitingNote] = useState(null);
  const [practiceScore, setPracticeScore] = useState(0);
  const [practiceStreak, setPracticeStreak] = useState(0);

  // Performance Recorder state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedNotes, setRecordedNotes] = useState([]);
  const [recordings, setRecordings] = useState(() => {
    try {
      const saved = localStorage.getItem('grandvirtuoso_recordings');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const recordStartTimeRef = useRef(0);
  const recordTimerRef = useRef(null);

  // Visible keys for current octave range (3 full octaves = 37 keys)
  const visibleKeys = useMemo(() => getKeyboardRange(baseOctave, 3), [baseOctave]);
  const keyShortcuts = useMemo(() => getNoteToKeyMap(baseOctave), [baseOctave]);

  // Detected chord
  const currentChord = useMemo(() => {
    return detectChord(Array.from(activeNotes));
  }, [activeNotes]);

  // Instrument switcher
  const setInstrument = (name) => {
    setInstrumentState(name);
    soundEngine.setInstrument(name);
  };

  const setVolume = (val) => {
    setVolumeState(val);
    soundEngine.setVolume(val);
  };

  const setReverbLevel = (val) => {
    setReverbLevelState(val);
    soundEngine.setReverbLevel(val);
  };

  const toggleSustain = () => {
    setSustainOn(prev => {
      const next = !prev;
      soundEngine.setSustain(next);
      return next;
    });
  };

  const shiftOctave = (delta) => {
    setBaseOctave(prev => Math.max(1, Math.min(5, prev + delta)));
  };

  // Play Note handler
  const handleNoteDown = useCallback((noteName, freq, velocity = 0.8) => {
    soundEngine.playNote(noteName, freq, velocity);

    setActiveNotes(prev => {
      const next = new Set(prev);
      next.add(noteName);
      return next;
    });

    // Handle performance recording
    if (isRecording) {
      const elapsed = (Date.now() - recordStartTimeRef.current) / 1000;
      setRecordedNotes(prev => [
        ...prev,
        { note: noteName, time: elapsed, duration: 0.4, velocity }
      ]);
    }

    // Handle practice mode note hit
    if (isPracticeMode && waitingNote && noteName === waitingNote) {
      setWaitingNote(null);
      setPracticeScore(s => s + 100);
      setPracticeStreak(st => st + 1);
    }
  }, [isRecording, isPracticeMode, waitingNote]);

  // Stop Note handler
  const handleNoteUp = useCallback((noteName) => {
    soundEngine.stopNote(noteName);

    setActiveNotes(prev => {
      const next = new Set(prev);
      next.delete(noteName);
      return next;
    });
  }, []);

  // Web MIDI setup
  useEffect(() => {
    midiService.init({
      onNoteOn: (noteName, freq, vel) => handleNoteDown(noteName, freq, vel),
      onNoteOff: (noteName) => handleNoteUp(noteName),
      onSustain: (isDown) => {
        setSustainOn(isDown);
        soundEngine.setSustain(isDown);
      },
      onStatusChange: (status) => {
        setIsMidiSupported(status.supported);
        if (status.devices) setMidiDevices(status.devices);
      }
    });
  }, [handleNoteDown, handleNoteUp]);

  // Physical Computer Keyboard Event Listeners
  useEffect(() => {
    const heldKeys = new Set();

    const handleKeyDown = (e) => {
      // Ignore if user is inside a form input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      // Sustain Pedal via Spacebar
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) {
          setSustainOn(true);
          soundEngine.setSustain(true);
        }
        return;
      }

      // Check if code matches piano keyboard mapping
      const shortcut = KEYBOARD_SHORTCUTS[e.code];
      if (shortcut && !heldKeys.has(e.code)) {
        e.preventDefault();
        heldKeys.add(e.code);

        // Find target note
        const targetMidi = 12 * (baseOctave + 1) + shortcut.offset;
        const keyObj = ALL_KEYS.find(k => k.midi === targetMidi);
        if (keyObj) {
          handleNoteDown(keyObj.name, keyObj.frequency, 0.85);
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSustainOn(false);
        soundEngine.setSustain(false);
        return;
      }

      const shortcut = KEYBOARD_SHORTCUTS[e.code];
      if (shortcut && heldKeys.has(e.code)) {
        e.preventDefault();
        heldKeys.delete(e.code);

        const targetMidi = 12 * (baseOctave + 1) + shortcut.offset;
        const keyObj = ALL_KEYS.find(k => k.midi === targetMidi);
        if (keyObj) {
          handleNoteUp(keyObj.name);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [baseOctave, handleNoteDown, handleNoteUp]);

  // Song playback loop
  const triggeredNotesRef = useRef(new Set());
  const lastFrameTimeRef = useRef(null);

  useEffect(() => {
    if (!activeSong || !isSongPlaying) {
      lastFrameTimeRef.current = null;
      return;
    }

    let reqId;

    const loop = (timestamp) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }

      const delta = (timestamp - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = timestamp;

      // If in practice mode and currently waiting for user to strike a note, don't advance time
      if (isPracticeMode && waitingNote) {
        reqId = requestAnimationFrame(loop);
        return;
      }

      setSongTime(prevTime => {
        const nextTime = prevTime + delta * playbackSpeed;

        // Check for upcoming notes in current window
        activeSong.notes.forEach((n, idx) => {
          const noteKey = `${idx}-${n.time}`;

          if (isPracticeMode) {
            // Check if note reached hitline
            if (nextTime >= n.time && !triggeredNotesRef.current.has(noteKey)) {
              triggeredNotesRef.current.add(noteKey);
              setWaitingNote(n.note);
            }
          } else {
            // Auto play mode
            if (prevTime <= n.time && nextTime > n.time && !triggeredNotesRef.current.has(noteKey)) {
              triggeredNotesRef.current.add(noteKey);
              const keyObj = ALL_KEYS.find(k => k.name === n.note);
              if (keyObj) {
                soundEngine.playNote(n.note, keyObj.frequency, 0.8);
                // Visual key press simulation
                setActiveNotes(s => new Set(s).add(n.note));
                setTimeout(() => {
                  soundEngine.stopNote(n.note);
                  setActiveNotes(s => {
                    const copy = new Set(s);
                    copy.delete(n.note);
                    return copy;
                  });
                }, (n.duration || 0.35) * 1000);
              }
            }
          }
        });

        // Check if song finished
        const lastNote = activeSong.notes[activeSong.notes.length - 1];
        const songDuration = (lastNote ? lastNote.time + (lastNote.duration || 1) : 10) + 1.5;

        if (nextTime >= songDuration) {
          setIsSongPlaying(false);
          // Victory confetti!
          try {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 }
            });
          } catch {}
          return 0;
        }

        return nextTime;
      });

      reqId = requestAnimationFrame(loop);
    };

    reqId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(reqId);
    };
  }, [activeSong, isSongPlaying, playbackSpeed, isPracticeMode, waitingNote]);

  // Restart song
  const restartSong = () => {
    triggeredNotesRef.current.clear();
    setWaitingNote(null);
    setSongTime(0);
    setIsSongPlaying(true);
    setPracticeScore(0);
    setPracticeStreak(0);
  };

  // Close active song
  const closeSong = () => {
    setIsSongPlaying(false);
    setActiveSong(null);
    setWaitingNote(null);
    triggeredNotesRef.current.clear();
  };

  // Start / Stop Recorder
  const startRecording = () => {
    soundEngine.init();
    setIsRecording(true);
    setRecordingTime(0);
    setRecordedNotes([]);
    recordStartTimeRef.current = Date.now();

    recordTimerRef.current = setInterval(() => {
      setRecordingTime(Math.floor((Date.now() - recordStartTimeRef.current) / 1000));
    }, 1000);
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    clearInterval(recordTimerRef.current);

    const duration = (Date.now() - recordStartTimeRef.current) / 1000;
    const newTrack = {
      id: `rec-${Date.now()}`,
      title: `Grand Piano Session ${recordings.length + 1}`,
      composer: 'Live Performer',
      bpm: 120,
      duration,
      date: new Date().toLocaleDateString(),
      notes: recordedNotes
    };

    const updated = [newTrack, ...recordings];
    setRecordings(updated);
    try {
      localStorage.setItem('grandvirtuoso_recordings', JSON.stringify(updated));
    } catch {}
  };

  const deleteRecording = (id) => {
    const updated = recordings.filter(r => r.id !== id);
    setRecordings(updated);
    try {
      localStorage.setItem('grandvirtuoso_recordings', JSON.stringify(updated));
    } catch {}
  };

  const playRecordedTrack = (track) => {
    setActiveSong(track);
    setIsPracticeMode(false);
    triggeredNotesRef.current.clear();
    setSongTime(0);
    setIsSongPlaying(true);
  };

  return (
    <div className="piano-app-root">
      {/* Studio Header Bar */}
      <Header
        instrument={instrument}
        setInstrument={setInstrument}
        volume={volume}
        setVolume={setVolume}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        reverbLevel={reverbLevel}
        setReverbLevel={setReverbLevel}
        sustainOn={sustainOn}
        toggleSustain={toggleSustain}
        baseOctave={baseOctave}
        shiftOctave={shiftOctave}
        chord={currentChord}
        isRecording={isRecording}
        onOpenRecorder={() => setIsRecorderModalOpen(true)}
        onOpenSongs={() => setIsSongModalOpen(true)}
        onOpenMetronome={() => setIsMetronomeOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        activeSong={activeSong}
        isPracticeMode={isPracticeMode}
      />

      {/* Main Studio Stage */}
      <main className="piano-stage">
        {/* Waterfall Synthesia Visualizer / Ambient visualizer area */}
        <div className="stage-visualizer-area">
          <WaterfallVisualizer
            activeSong={activeSong}
            songTime={songTime}
            isSongPlaying={isSongPlaying}
            isPracticeMode={isPracticeMode}
            waitingNote={waitingNote}
            activeNotes={activeNotes}
            keyBoundsMap={keyBoundsMap}
          />

          {/* Integrated Real-time Audio Oscilloscope / Spectrum */}
          <div className="audio-visualizer-overlay">
            <AudioVisualizer mode={visualizerMode} />
          </div>
        </div>

        {/* Interactive Piano Keyboard */}
        <div className="stage-keyboard-area">
          <PianoKeyboard
            visibleKeys={visibleKeys}
            activeNotes={activeNotes}
            waitingNote={waitingNote}
            labelMode={labelMode}
            keyShortcuts={keyShortcuts}
            onNoteDown={handleNoteDown}
            onNoteUp={handleNoteUp}
            onKeyBoundsUpdate={setKeyBoundsMap}
          />
        </div>

        {/* Active Song Transport Playbar */}
        {activeSong && (
          <SongPlaybar
            song={activeSong}
            isPlaying={isSongPlaying}
            currentTime={songTime}
            totalDuration={
              activeSong.notes && activeSong.notes.length > 0
                ? activeSong.notes[activeSong.notes.length - 1].time + 1.5
                : 30
            }
            playbackSpeed={playbackSpeed}
            setPlaybackSpeed={setPlaybackSpeed}
            onPlayPause={() => setIsSongPlaying(p => !p)}
            onRestart={restartSong}
            onClose={closeSong}
            isPracticeMode={isPracticeMode}
            setIsPracticeMode={setIsPracticeMode}
            practiceScore={practiceScore}
            practiceStreak={practiceStreak}
          />
        )}
      </main>

      {/* Modals */}
      <SongModal
        isOpen={isSongModalOpen}
        onClose={() => setIsSongModalOpen(false)}
        currentSong={activeSong}
        onSelectSong={(song) => {
          setActiveSong(song);
          triggeredNotesRef.current.clear();
          setSongTime(0);
        }}
        onStartPlay={(song) => {
          setIsPracticeMode(false);
          setIsSongPlaying(true);
        }}
        onStartPractice={(song) => {
          setIsPracticeMode(true);
          setIsSongPlaying(true);
        }}
      />

      <RecorderModal
        isOpen={isRecorderModalOpen}
        onClose={() => setIsRecorderModalOpen(false)}
        isRecording={isRecording}
        recordingTime={recordingTime}
        recordings={recordings}
        onStartRecord={startRecording}
        onStopRecord={stopRecording}
        onPlayRecording={playRecordedTrack}
        onDeleteRecording={deleteRecording}
      />

      <Metronome
        isOpen={isMetronomeOpen}
        onClose={() => setIsMetronomeOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        labelMode={labelMode}
        setLabelMode={setLabelMode}
        visualizerMode={visualizerMode}
        setVisualizerMode={setVisualizerMode}
        midiDevices={midiDevices}
        isMidiSupported={isMidiSupported}
      />
    </div>
  );
}
