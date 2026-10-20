import React, { useEffect, useRef } from 'react';
import { soundEngine } from '../audio/soundEngine';

export default function AudioVisualizer({ mode = 'wave' }) {
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);

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

    const render = () => {
      animationFrameId.current = requestAnimationFrame(render);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      ctx.clearRect(0, 0, width, height);

      if (!soundEngine.analyser) {
        // Idle ambient line
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1.5;
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        return;
      }

      if (mode === 'spectrum') {
        const bufferLength = soundEngine.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        soundEngine.analyser.getByteFrequencyData(dataArray);

        const barCount = 48;
        const barWidth = width / barCount;
        const step = Math.floor(bufferLength / barCount / 2);

        for (let i = 0; i < barCount; i++) {
          const val = dataArray[i * step] / 255;
          const barHeight = Math.max(3, val * (height - 6));
          const x = i * barWidth;
          const y = height - barHeight;

          // Gradient
          const gradient = ctx.createLinearGradient(0, height, 0, 0);
          gradient.addColorStop(0, 'rgba(168, 85, 247, 0.2)');
          gradient.addColorStop(0.6, 'rgba(236, 72, 153, 0.8)');
          gradient.addColorStop(1, 'rgba(251, 191, 36, 1)');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x + 1.5, y, barWidth - 3, barHeight, [2, 2, 0, 0]);
          ctx.fill();
        }
      } else {
        // Smooth Oscilloscope wave
        const bufferLength = soundEngine.analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        soundEngine.analyser.getByteTimeDomainData(dataArray);

        // Check if there is actual sound activity
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += Math.abs(dataArray[i] - 128);
        }
        const isActive = sum > 80;

        ctx.lineWidth = isActive ? 2.5 : 1.2;
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#38bdf8');
        gradient.addColorStop(0.5, '#c084fc');
        gradient.addColorStop(1, '#f472b6');

        ctx.strokeStyle = isActive ? gradient : 'rgba(255, 255, 255, 0.12)';
        ctx.shadowColor = isActive ? 'rgba(192, 132, 252, 0.6)' : 'transparent';
        ctx.shadowBlur = isActive ? 8 : 0;

        ctx.beginPath();
        const sliceWidth = width / (bufferLength - 1);
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', resize);
    };
  }, [mode]);

  return (
    <div className="audio-visualizer-container">
      <canvas ref={canvasRef} className="audio-visualizer-canvas" />
    </div>
  );
}
