// Music Theory & Note Utilities

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const SOLFEGE_MAP = {
  'C': 'Do',
  'C#': 'Do#',
  'D': 'Re',
  'D#': 'Re#',
  'E': 'Mi',
  'F': 'Fa',
  'F#': 'Fa#',
  'G': 'Sol',
  'G#': 'Sol#',
  'A': 'La',
  'A#': 'La#',
  'B': 'Si'
};

// Generates 88-key piano notes from A0 to C8
export function generate88Keys() {
  const keys = [];
  const startMidi = 21; // A0
  const endMidi = 108;  // C8

  for (let midi = startMidi; midi <= endMidi; midi++) {
    const noteIndex = midi % 12;
    const noteNameWithoutOctave = NOTE_NAMES[(noteIndex + 12 - 0) % 12];
    const octave = Math.floor(midi / 12) - 1;
    const fullName = `${noteNameWithoutOctave}${octave}`;
    const isBlack = noteNameWithoutOctave.includes('#');
    const frequency = 440 * Math.pow(2, (midi - 69) / 12);

    keys.push({
      midi,
      name: fullName,
      pitch: noteNameWithoutOctave,
      octave,
      isBlack,
      frequency
    });
  }

  return keys;
}

export const ALL_KEYS = generate88Keys();

// Default 3-octave view (C3 to B5, or C3 to C6: 37 keys)
export function getKeyboardRange(startOctave = 3, numOctaves = 3) {
  // Returns keys starting from C[startOctave] up to C[startOctave + numOctaves]
  const startMidi = 12 * (startOctave + 1); // C(startOctave)
  const endMidi = startMidi + (numOctaves * 12); // up to C(startOctave + numOctaves)
  return ALL_KEYS.filter(k => k.midi >= startMidi && k.midi <= endMidi);
}

// QWERTY keyboard mappings for 2.5 - 3 octaves
// Primary middle range mappings (maps computer keyboard to notes based on center octave)
export const KEYBOARD_SHORTCUTS = {
  // Lower octave (e.g. Octave 3 or base)
  'KeyZ': { offset: 0, label: 'Z' },   // C
  'KeyS': { offset: 1, label: 'S' },   // C#
  'KeyX': { offset: 2, label: 'X' },   // D
  'KeyD': { offset: 3, label: 'D' },   // D#
  'KeyC': { offset: 4, label: 'C' },   // E
  'KeyV': { offset: 5, label: 'V' },   // F
  'KeyG': { offset: 6, label: 'G' },   // F#
  'KeyB': { offset: 7, label: 'B' },   // G
  'KeyH': { offset: 8, label: 'H' },   // G#
  'KeyN': { offset: 9, label: 'N' },   // A
  'KeyJ': { offset: 10, label: 'J' },  // A#
  'KeyM': { offset: 11, label: 'M' },  // B

  // Middle octave (e.g. Octave 4)
  'KeyQ': { offset: 12, label: 'Q' },  // C
  'Digit2': { offset: 13, label: '2' },// C#
  'KeyW': { offset: 14, label: 'W' },  // D
  'Digit3': { offset: 15, label: '3' },// D#
  'KeyE': { offset: 16, label: 'E' },  // E
  'KeyR': { offset: 17, label: 'R' },  // F
  'Digit5': { offset: 18, label: '5' },// F#
  'KeyT': { offset: 19, label: 'T' },  // G
  'Digit6': { offset: 20, label: '6' },// G#
  'KeyY': { offset: 21, label: 'Y' },  // A
  'Digit7': { offset: 22, label: '7' },// A#
  'KeyU': { offset: 23, label: 'U' },  // B

  // High octave (e.g. Octave 5)
  'KeyI': { offset: 24, label: 'I' },  // C
  'Digit9': { offset: 25, label: '9' },// C#
  'KeyO': { offset: 26, label: 'O' },  // D
  'Digit0': { offset: 27, label: '0' },// D#
  'KeyP': { offset: 28, label: 'P' },  // E
  'BracketLeft': { offset: 29, label: '[' }, // F
  'Equal': { offset: 30, label: '=' },       // F#
  'BracketRight': { offset: 31, label: ']' } // G
};

// Generates note name to keyboard shortcut mapping based on current base octave
export function getNoteToKeyMap(baseOctave = 3) {
  const map = {};
  const baseMidi = 12 * (baseOctave + 1);

  Object.entries(KEYBOARD_SHORTCUTS).forEach(([code, { offset, label }]) => {
    const targetMidi = baseMidi + offset;
    const keyObj = ALL_KEYS.find(k => k.midi === targetMidi);
    if (keyObj) {
      map[keyObj.name] = { code, label };
    }
  });

  return map;
}

// Chord Recognition System
const CHORD_DEFINITIONS = [
  { name: 'Major', symbol: '', intervals: [0, 4, 7] },
  { name: 'Minor', symbol: 'm', intervals: [0, 3, 7] },
  { name: 'Diminished', symbol: 'dim', intervals: [0, 3, 6] },
  { name: 'Augmented', symbol: 'aug', intervals: [0, 4, 8] },
  { name: 'Suspended 4th', symbol: 'sus4', intervals: [0, 5, 7] },
  { name: 'Suspended 2nd', symbol: 'sus2', intervals: [0, 2, 7] },
  { name: 'Major 7th', symbol: 'maj7', intervals: [0, 4, 7, 11] },
  { name: 'Dominant 7th', symbol: '7', intervals: [0, 4, 7, 10] },
  { name: 'Minor 7th', symbol: 'm7', intervals: [0, 3, 7, 10] },
  { name: 'Half Diminished 7th', symbol: 'm7b5', intervals: [0, 3, 6, 10] },
  { name: 'Diminished 7th', symbol: 'dim7', intervals: [0, 3, 6, 9] },
  { name: 'Minor-Major 7th', symbol: 'm(maj7)', intervals: [0, 3, 7, 11] },
  { name: 'Major 6th', symbol: '6', intervals: [0, 4, 7, 9] },
  { name: 'Minor 6th', symbol: 'm6', intervals: [0, 3, 7, 9] },
  { name: 'Add 9', symbol: 'add9', intervals: [0, 4, 7, 14] },
  { name: 'Minor Add 9', symbol: 'm(add9)', intervals: [0, 3, 7, 14] },
  { name: 'Major 9th', symbol: 'maj9', intervals: [0, 4, 7, 11, 14] },
  { name: 'Dominant 9th', symbol: '9', intervals: [0, 4, 7, 10, 14] },
  { name: 'Minor 9th', symbol: 'm9', intervals: [0, 3, 7, 10, 14] },
  { name: 'Fifth / Power Chord', symbol: '5', intervals: [0, 7] }
];

export function detectChord(activeNotes) {
  if (!activeNotes || activeNotes.length < 2) return null;

  // Extract unique pitch classes (0-11) and lowest note as bass
  const midiNumbers = activeNotes
    .map(name => {
      const match = ALL_KEYS.find(k => k.name === name);
      return match ? match.midi : null;
    })
    .filter(m => m !== null)
    .sort((a, b) => a - b);

  if (midiNumbers.length < 2) return null;

  const bassMidi = midiNumbers[0];
  const bassNoteIndex = bassMidi % 12;
  const bassPitch = NOTE_NAMES[bassNoteIndex];

  // Unique pitch classes
  const pitchClasses = Array.from(new Set(midiNumbers.map(m => m % 12)));

  // Try each pitch class as potential root
  for (const root of pitchClasses) {
    const rootName = NOTE_NAMES[root];
    // Calculate normalized intervals relative to this root
    const intervals = pitchClasses
      .map(pc => (pc - root + 12) % 12)
      .sort((a, b) => a - b);

    for (const chordDef of CHORD_DEFINITIONS) {
      const defIntervalsMod12 = Array.from(new Set(chordDef.intervals.map(i => i % 12))).sort((a, b) => a - b);

      if (intervals.length === defIntervalsMod12.length &&
          intervals.every((val, idx) => val === defIntervalsMod12[idx])) {
        const isSlashChord = root !== bassNoteIndex;
        return {
          root: rootName,
          type: chordDef.name,
          symbol: `${rootName}${chordDef.symbol}${isSlashChord ? '/' + bassPitch : ''}`,
          formula: chordDef.intervals.join('-'),
          notes: activeNotes
        };
      }
    }
  }

  // Fallback for intervals (e.g. Tritone, Octave)
  if (midiNumbers.length === 2) {
    const interval = Math.abs(midiNumbers[1] - midiNumbers[0]) % 12;
    const intervalNames = {
      1: 'Minor 2nd',
      2: 'Major 2nd',
      3: 'Minor 3rd',
      4: 'Major 3rd',
      5: 'Perfect 4th',
      6: 'Tritone',
      7: 'Perfect 5th',
      8: 'Minor 6th',
      9: 'Major 6th',
      10: 'Minor 7th',
      11: 'Major 7th',
      0: 'Octave'
    };
    return {
      root: bassPitch,
      type: intervalNames[interval] || 'Interval',
      symbol: `${bassPitch} ${intervalNames[interval] || ''}`,
      notes: activeNotes
    };
  }

  return null;
}
