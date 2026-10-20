import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { SOLFEGE_MAP } from '../utils/musicTheory';

export default function PianoKeyboard({
  visibleKeys,
  activeNotes,
  waitingNote,
  labelMode, // 'notes' | 'keyboard' | 'solfege' | 'none'
  keyShortcuts, // map of noteName -> { code, label }
  onNoteDown,
  onNoteUp,
  onKeyBoundsUpdate
}) {
  const keyboardRef = useRef(null);
  const pointerStateRef = useRef({ isDown: false, activeNote: null, pointerId: null });
  const keyElementsRef = useRef(new Map());

  // Split keys into white and black
  const whiteKeys = useMemo(() => visibleKeys.filter(k => !k.isBlack), [visibleKeys]);
  const blackKeys = useMemo(() => visibleKeys.filter(k => k.isBlack), [visibleKeys]);

  // Compute key positions and notify parent for waterfall visualizer
  const updateKeyBounds = useCallback(() => {
    if (!keyboardRef.current) return;
    const keyboardRect = keyboardRef.current.getBoundingClientRect();
    const boundsMap = {};

    keyElementsRef.current.forEach((el, noteName) => {
      if (el) {
        const rect = el.getBoundingClientRect();
        boundsMap[noteName] = {
          left: rect.left - keyboardRect.left,
          width: rect.width,
          top: rect.top - keyboardRect.top,
          height: rect.height,
          isBlack: noteName.includes('#')
        };
      }
    });

    if (onKeyBoundsUpdate && Object.keys(boundsMap).length > 0) {
      onKeyBoundsUpdate(boundsMap);
    }
  }, [onKeyBoundsUpdate]);

  useEffect(() => {
    updateKeyBounds();
    window.addEventListener('resize', updateKeyBounds);
    const observer = new ResizeObserver(() => updateKeyBounds());
    if (keyboardRef.current) {
      observer.observe(keyboardRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateKeyBounds);
      observer.disconnect();
    };
  }, [visibleKeys, updateKeyBounds]);

  // Handle glissando (sliding across keys with mouse/touch down)
  const handlePointerDown = (note, e) => {
    pointerStateRef.current.isDown = true;
    pointerStateRef.current.activeNote = note.name;
    pointerStateRef.current.pointerId = e.pointerId;
    onNoteDown(note.name, note.frequency);
  };

  const handlePointerUp = () => {
    if (pointerStateRef.current.isDown && pointerStateRef.current.activeNote) {
      onNoteUp(pointerStateRef.current.activeNote);
    }
    pointerStateRef.current.isDown = false;
    pointerStateRef.current.activeNote = null;
  };

  const handlePointerMove = (e) => {
    if (!pointerStateRef.current.isDown) return;

    // Find the element currently under pointer
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const keyEl = target ? target.closest('[data-note]') : null;

    if (keyEl) {
      const noteName = keyEl.getAttribute('data-note');
      if (noteName && noteName !== pointerStateRef.current.activeNote) {
        // Released previous note
        if (pointerStateRef.current.activeNote) {
          onNoteUp(pointerStateRef.current.activeNote);
        }
        // Play new note
        const keyObj = visibleKeys.find(k => k.name === noteName);
        if (keyObj) {
          pointerStateRef.current.activeNote = noteName;
          onNoteDown(noteName, keyObj.frequency);
        }
      }
    }
  };

  // Helper to format key label
  const renderKeyLabel = (keyObj) => {
    if (labelMode === 'none') return null;

    let text = '';
    let subText = '';

    if (labelMode === 'notes') {
      text = keyObj.name;
    } else if (labelMode === 'keyboard') {
      const shortcut = keyShortcuts[keyObj.name];
      text = shortcut ? shortcut.label : '';
      subText = keyObj.pitch;
    } else if (labelMode === 'solfege') {
      text = `${SOLFEGE_MAP[keyObj.pitch]}${keyObj.octave}`;
    }

    if (!text && !subText) return null;

    return (
      <div className={`key-label ${keyObj.isBlack ? 'label-black' : 'label-white'}`}>
        <span className="key-label-primary">{text}</span>
        {subText && <span className="key-label-sub">{subText}</span>}
      </div>
    );
  };

  // Compute position of black key relative to its neighboring white keys
  const getBlackKeyStyle = (blackKey) => {
    // Find the preceding white key in visibleKeys
    const whiteIndex = whiteKeys.findIndex(wk => wk.midi === blackKey.midi - 1);
    if (whiteIndex === -1) return { display: 'none' };

    const totalWhite = whiteKeys.length;
    // Standard piano black key offset ratio:
    // C# sits ~ 60% of C
    // D# sits ~ 72% of D
    // F# sits ~ 58% of F
    // G# sits ~ 67% of G
    // A# sits ~ 72% of A
    let offsetFactor = 0.65;
    if (blackKey.pitch === 'C#') offsetFactor = 0.60;
    if (blackKey.pitch === 'D#') offsetFactor = 0.72;
    if (blackKey.pitch === 'F#') offsetFactor = 0.58;
    if (blackKey.pitch === 'G#') offsetFactor = 0.66;
    if (blackKey.pitch === 'A#') offsetFactor = 0.73;

    const leftPercent = ((whiteIndex + offsetFactor) / totalWhite) * 100;
    const widthPercent = (1 / totalWhite) * 62; // 62% of a white key width

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`
    };
  };

  return (
    <div
      className="piano-keyboard-wrapper"
      onPointerLeave={handlePointerUp}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      {/* Fallboard with red felt damper lining and ambient light strip */}
      <div className="piano-fallboard">
        <div className="fallboard-wood-grain"></div>
        <div className="fallboard-felt-strip"></div>
        <div className="fallboard-led-glow"></div>
      </div>

      <div className="piano-keyboard-container" ref={keyboardRef}>
        {/* White Keys Row */}
        <div className="white-keys-layer">
          {whiteKeys.map(keyObj => {
            const isActive = activeNotes.has(keyObj.name);
            const isWaiting = waitingNote === keyObj.name;

            return (
              <button
                key={keyObj.name}
                data-note={keyObj.name}
                ref={el => keyElementsRef.current.set(keyObj.name, el)}
                className={`piano-key white-key ${isActive ? 'active' : ''} ${isWaiting ? 'waiting' : ''}`}
                onPointerDown={(e) => handlePointerDown(keyObj, e)}
                type="button"
                aria-label={`Key ${keyObj.name}`}
              >
                {/* 3D Key Surface and Bevel */}
                <div className="key-highlight"></div>
                <div className="key-light-pulse"></div>
                {renderKeyLabel(keyObj)}
              </button>
            );
          })}
        </div>

        {/* Black Keys Layer */}
        <div className="black-keys-layer">
          {blackKeys.map(keyObj => {
            const isActive = activeNotes.has(keyObj.name);
            const isWaiting = waitingNote === keyObj.name;
            const style = getBlackKeyStyle(keyObj);

            return (
              <button
                key={keyObj.name}
                data-note={keyObj.name}
                ref={el => keyElementsRef.current.set(keyObj.name, el)}
                style={style}
                className={`piano-key black-key ${isActive ? 'active' : ''} ${isWaiting ? 'waiting' : ''}`}
                onPointerDown={(e) => handlePointerDown(keyObj, e)}
                type="button"
                aria-label={`Key ${keyObj.name}`}
              >
                <div className="black-key-top"></div>
                <div className="black-key-ridge"></div>
                <div className="key-light-pulse"></div>
                {renderKeyLabel(keyObj)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Front rail trim */}
      <div className="piano-front-rail">
        <div className="front-rail-brass"></div>
      </div>
    </div>
  );
}
