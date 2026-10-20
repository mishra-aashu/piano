import React, { useEffect, useRef } from 'react';

// Rainbow/warm gradient color for notes according to octave/pitch
const PITCH_COLORS = {
  'C': '#ef4444',
  'C#': '#f97316',
  'D': '#f59e0b',
  'D#': '#eab308',
  'E': '#84cc16',
  'F': '#10b981',
  'F#': '#06b6d4',
  'G': '#0ea5e9',
  'G#': '#3b82f6',
  'A': '#6366f1',
  'A#': '#8b5cf6',
  'B': '#ec4899'
};

export default function WaterfallVisualizer({
  activeSong,
  songTime,
  isSongPlaying,
  isPracticeMode,
  waitingNote,
  activeNotes,
  keyBoundsMap, // map of noteName -> { left, width, isBlack }
  onNoteTrigger
}) {
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);
  const particlesRef = useRef([]);

  // Trigger particles when activeNotes change
  useEffect(() => {
    if (!keyBoundsMap) return;
    activeNotes.forEach(noteName => {
      const bounds = keyBoundsMap[noteName];
      if (bounds) {
        // Spawn 3-5 particles
        for (let i = 0; i < 4; i++) {
          particlesRef.current.push({
            x: bounds.left + bounds.width / 2 + (Math.random() * 16 - 8),
            y: 0, // at bottom relative to hitline
            vx: (Math.random() - 0.5) * 2,
            vy: -(Math.random() * 3 + 2),
            radius: Math.random() * 3.5 + 2,
            alpha: 1.0,
            color: bounds.isBlack ? '#c084fc' : '#38bdf8'
          });
        }
      }
    });
  }, [activeNotes, keyBoundsMap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const speed = 140; // pixels per second of fall
    const leadTime = 2.4; // seconds of notes shown ahead of current time

    const render = () => {
      animationFrameId.current = requestAnimationFrame(render);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      ctx.clearRect(0, 0, width, height);

      // Background subtle vertical lane guides for white keys
      if (keyBoundsMap) {
        Object.values(keyBoundsMap).forEach(b => {
          if (!b.isBlack) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
            ctx.fillRect(b.left, 0, b.width, height);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.lineWidth = 1;
            ctx.strokeRect(b.left, 0, b.width, height);
          }
        });
      }

      // Hitline glow at bottom
      const hitlineY = height - 2;
      const hitGradient = ctx.createLinearGradient(0, hitlineY - 8, 0, height);
      hitGradient.addColorStop(0, 'rgba(56, 189, 248, 0)');
      hitGradient.addColorStop(1, 'rgba(56, 189, 248, 0.25)');
      ctx.fillStyle = hitGradient;
      ctx.fillRect(0, hitlineY - 16, width, 16);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, hitlineY);
      ctx.lineTo(width, hitlineY);
      ctx.stroke();

      // Render falling notes if song is loaded
      if (activeSong && activeSong.notes && keyBoundsMap) {
        const currentTime = songTime;

        activeSong.notes.forEach(noteObj => {
          const bounds = keyBoundsMap[noteObj.note];
          if (!bounds) return;

          // Note timeline
          const timeUntilHit = noteObj.time - currentTime;
          const duration = noteObj.duration || 0.4;

          // Only render notes within view window
          if (timeUntilHit < leadTime && timeUntilHit + duration > -0.2) {
            // Note bottom reaches hitline at timeUntilHit = 0
            const noteBottomY = hitlineY - (timeUntilHit * speed);
            const noteHeight = Math.max(16, duration * speed);
            const noteTopY = noteBottomY - noteHeight;

            // Clamped coordinates
            const x = bounds.left + (bounds.isBlack ? 2 : 4);
            const w = Math.max(8, bounds.width - (bounds.isBlack ? 4 : 8));
            const y = noteTopY;
            const h = noteHeight;

            // Pick note color
            const pitch = noteObj.note.replace(/[0-9]/g, '');
            const baseColor = PITCH_COLORS[pitch] || '#38bdf8';

            // Highlighting if waiting for this note in practice mode
            const isWaiting = isPracticeMode && waitingNote === noteObj.note && Math.abs(timeUntilHit) < 0.2;

            ctx.save();
            ctx.shadowColor = isWaiting ? '#f59e0b' : baseColor;
            ctx.shadowBlur = isWaiting ? 16 : 8;

            // Rounded bar with glossy gradient
            const noteGradient = ctx.createLinearGradient(x, y, x + w, y + h);
            noteGradient.addColorStop(0, isWaiting ? '#fef08a' : baseColor);
            noteGradient.addColorStop(1, isWaiting ? '#d97706' : baseColor + 'cc');

            ctx.fillStyle = noteGradient;
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, [6, 6, 6, 6]);
            ctx.fill();

            // Note inner border
            ctx.strokeStyle = isWaiting ? '#fff' : 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = isWaiting ? 2 : 1;
            ctx.stroke();

            // Note label
            if (h > 24) {
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 11px Outfit, sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(noteObj.note, x + w / 2, y + h / 2);
            }

            ctx.restore();
          }
        });
      }

      // Render Active Key Rising Light Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.025;

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, hitlineY + p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', resize);
    };
  }, [activeSong, songTime, isSongPlaying, isPracticeMode, waitingNote, keyBoundsMap]);

  return (
    <div className="waterfall-canvas-container">
      <canvas ref={canvasRef} className="waterfall-canvas" />
      {isPracticeMode && waitingNote && (
        <div className="practice-prompt-badge">
          <span className="pulse-dot"></span>
          <span>Press <strong>{waitingNote}</strong></span>
        </div>
      )}
    </div>
  );
}
