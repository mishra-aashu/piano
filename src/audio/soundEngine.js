// High-Fidelity Web Audio Sound Engine for GrandVirtuoso Piano

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.analyser = null;
    this.reverbNode = null;
    this.dryGain = null;
    this.wetGain = null;
    this.dynamicsCompressor = null;

    this.activeVoices = new Map(); // key: noteName -> voice info
    this.sustainedVoices = new Set(); // voices waiting for sustain pedal release
    this.isSustainOn = false;
    this.currentInstrument = 'acoustic'; // 'acoustic', 'rhodes', 'synth', 'celesta', 'marimba', 'organ'
    this.volume = 0.8;
    this.reverbLevel = 0.35;
    this.isMuted = false;
  }

  // Initialize AudioContext on first user gesture
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.error('Web Audio API not supported in this browser.');
      return;
    }

    this.ctx = new AudioContextClass();

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

    // Dynamics Compressor (gentle studio mastering to prevent clipping)
    this.dynamicsCompressor = this.ctx.createDynamicsCompressor();
    this.dynamicsCompressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
    this.dynamicsCompressor.knee.setValueAtTime(10, this.ctx.currentTime);
    this.dynamicsCompressor.ratio.setValueAtTime(4, this.ctx.currentTime);
    this.dynamicsCompressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
    this.dynamicsCompressor.release.setValueAtTime(0.08, this.ctx.currentTime);

    // Analyser Node for Audio Visualizer
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.82;

    // Convolver Reverb with synthetic room impulse response
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.buildReverbImpulse(2.2, 2.0);

    // Wet / Dry Reverb routing
    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.setValueAtTime(1.0 - this.reverbLevel * 0.5, this.ctx.currentTime);

    this.wetGain = this.ctx.createGain();
    this.wetGain.gain.setValueAtTime(this.reverbLevel, this.ctx.currentTime);

    // Connect:
    // Voices -> (DryGain & ReverbNode -> WetGain) -> DynamicsCompressor -> MasterGain -> Analyser -> Destination
    this.reverbNode.connect(this.wetGain);

    this.dryGain.connect(this.dynamicsCompressor);
    this.wetGain.connect(this.dynamicsCompressor);

    this.dynamicsCompressor.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  // Generate synthetic stereo hall impulse response
  buildReverbImpulse(duration, decay) {
    const rate = this.ctx.sampleRate;
    const length = rate * duration;
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      // Exponential decay envelope with stereo spread
      const env = Math.pow(1 - n, decay);
      // Diffuse reflections
      left[i] = ((Math.random() * 2) - 1) * env;
      right[i] = ((Math.random() * 2) - 1) * env;
    }
    return impulse;
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.isMuted ? 0 : this.volume,
        this.ctx.currentTime,
        0.02
      );
    }
  }

  setReverbLevel(val) {
    this.reverbLevel = Math.max(0, Math.min(1, val));
    if (this.wetGain && this.dryGain && this.ctx) {
      this.wetGain.gain.setTargetAtTime(this.reverbLevel, this.ctx.currentTime, 0.03);
      this.dryGain.gain.setTargetAtTime(1.0 - this.reverbLevel * 0.4, this.ctx.currentTime, 0.03);
    }
  }

  setMute(mute) {
    this.isMuted = mute;
    this.setVolume(this.volume);
  }

  setInstrument(name) {
    this.currentInstrument = name;
  }

  setSustain(isDown) {
    this.isSustainOn = isDown;
    if (!isDown) {
      // Release all sustained voices
      const now = this.ctx ? this.ctx.currentTime : 0;
      this.sustainedVoices.forEach(voice => {
        this.dampVoice(voice, now);
      });
      this.sustainedVoices.clear();
    }
  }

  // Helper: hammer strike noise transient for acoustic piano
  createHammerTransient(now, noteFreq, velocity) {
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.025); // 25ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // Filter hammer transient around note's resonance
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(Math.min(3200, Math.max(400, noteFreq * 2)), now);
    filter.Q.setValueAtTime(2.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08 * velocity, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.dryGain);

    noiseSource.start(now);
    noiseSource.stop(now + 0.03);
  }

  playNote(noteName, freq, velocity = 0.8) {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Stop existing voice for same note if already playing
    if (this.activeVoices.has(noteName)) {
      this.stopNote(noteName, true);
    }

    let voice;
    switch (this.currentInstrument) {
      case 'acoustic':
        voice = this.playAcousticPiano(freq, velocity, now);
        break;
      case 'rhodes':
        voice = this.playRhodes(freq, velocity, now);
        break;
      case 'synth':
        voice = this.playSynth(freq, velocity, now);
        break;
      case 'celesta':
        voice = this.playCelesta(freq, velocity, now);
        break;
      case 'marimba':
        voice = this.playMarimba(freq, velocity, now);
        break;
      case 'organ':
        voice = this.playOrgan(freq, velocity, now);
        break;
      default:
        voice = this.playAcousticPiano(freq, velocity, now);
    }

    voice.noteName = noteName;
    voice.freq = freq;
    voice.startTime = now;
    voice.isKeyHeld = true;

    this.activeVoices.set(noteName, voice);
    return voice;
  }

  // 1. Acoustic Concert Grand Piano Synthesis
  playAcousticPiano(freq, velocity, now) {
    const voiceGain = this.ctx.createGain();
    voiceGain.connect(this.dryGain);
    voiceGain.connect(this.reverbNode);

    // Natural decay time calculation (low notes sustain longer)
    const baseDecay = Math.max(1.2, 5.0 - Math.log2(freq / 55) * 0.7);

    // Partials and relative amplitudes with slight inharmonicity
    const partials = [
      { ratio: 1.000, amp: 1.00, decayMult: 1.0 },
      { ratio: 2.001, amp: 0.58, decayMult: 0.85 },
      { ratio: 3.003, amp: 0.35, decayMult: 0.70 },
      { ratio: 4.006, amp: 0.22, decayMult: 0.55 },
      { ratio: 5.010, amp: 0.14, decayMult: 0.40 },
      { ratio: 6.015, amp: 0.08, decayMult: 0.30 }
    ];

    const nodes = [];

    // Filter to simulate soundboard body warmth
    const bodyFilter = this.ctx.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    const cutoffFreq = Math.min(12000, freq * 7 + 1000);
    bodyFilter.frequency.setValueAtTime(cutoffFreq, now);
    bodyFilter.frequency.exponentialRampToValueAtTime(cutoffFreq * 0.4, now + baseDecay);
    bodyFilter.connect(voiceGain);

    // Hammer transient
    this.createHammerTransient(now, freq, velocity);

    partials.forEach(p => {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * p.ratio, now);

      // Attack and decay envelope
      const attackTime = 0.004; // 4ms rapid hammer strike
      const decayTime = baseDecay * p.decayMult;

      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.exponentialRampToValueAtTime(p.amp * velocity * 0.4, now + attackTime);
      oscGain.gain.exponentialRampToValueAtTime(0.00001, now + attackTime + decayTime);

      osc.connect(oscGain);
      oscGain.connect(bodyFilter);

      osc.start(now);
      osc.stop(now + baseDecay + 0.5);

      nodes.push(osc, oscGain);
    });

    return {
      type: 'acoustic',
      voiceGain,
      nodes,
      releaseTime: 0.25
    };
  }

  // 2. Vintage Rhodes / Mark I Electric Piano
  playRhodes(freq, velocity, now) {
    const voiceGain = this.ctx.createGain();
    voiceGain.connect(this.dryGain);
    voiceGain.connect(this.reverbNode);

    // FM Synthesis: Carrier and Modulator for chime/tine bell
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, now);

    // Modulator at 14x frequency for signature Rhodes tine strike
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(freq * 4.0, now);

    const modIndex = 600 * velocity;
    modGain.gain.setValueAtTime(modIndex, now);
    modGain.gain.exponentialRampToValueAtTime(1, now + 0.4);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    // Warm sub-fundamental
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq, now);
    subGain.gain.setValueAtTime(0.2 * velocity, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

    // Tremolo LFO
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(4.5, now); // 4.5Hz tremolo
    lfoGain.gain.setValueAtTime(0.12, now);
    lfo.connect(lfoGain);

    const tremoloGain = this.ctx.createGain();
    tremoloGain.gain.setValueAtTime(0.85, now);
    lfoGain.connect(tremoloGain.gain);

    const ampGain = this.ctx.createGain();
    ampGain.gain.setValueAtTime(0.0001, now);
    ampGain.gain.linearRampToValueAtTime(0.45 * velocity, now + 0.008);
    ampGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

    carrier.connect(ampGain);
    subOsc.connect(ampGain);
    ampGain.connect(tremoloGain);
    tremoloGain.connect(voiceGain);

    carrier.start(now);
    modulator.start(now);
    subOsc.start(now);
    lfo.start(now);

    const stopTime = now + 3.5;
    carrier.stop(stopTime);
    modulator.stop(stopTime);
    subOsc.stop(stopTime);
    lfo.stop(stopTime);

    return {
      type: 'rhodes',
      voiceGain,
      nodes: [carrier, modulator, modGain, subOsc, subGain, lfo, lfoGain, tremoloGain, ampGain],
      releaseTime: 0.3
    };
  }

  // 3. 80s Analog Synth Lead / Brass
  playSynth(freq, velocity, now) {
    const voiceGain = this.ctx.createGain();
    voiceGain.connect(this.dryGain);
    voiceGain.connect(this.reverbNode);

    // Dual detuned sawtooth oscillators
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(freq, now);
    // Subtle detune for thickness (+/- 6 cents)
    osc1.detune.setValueAtTime(-6, now);
    osc2.frequency.setValueAtTime(freq, now);
    osc2.detune.setValueAtTime(7, now);

    // Resonant low-pass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(4.0, now);
    filter.frequency.setValueAtTime(freq * 1.5, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 6.5, now + 0.08);
    filter.frequency.exponentialRampToValueAtTime(freq * 2.2, now + 0.8);

    const ampGain = this.ctx.createGain();
    ampGain.gain.setValueAtTime(0.0001, now);
    ampGain.gain.linearRampToValueAtTime(0.35 * velocity, now + 0.012);
    ampGain.gain.exponentialRampToValueAtTime(0.18 * velocity, now + 0.4);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(ampGain);
    ampGain.connect(voiceGain);

    osc1.start(now);
    osc2.start(now);

    return {
      type: 'synth',
      voiceGain,
      nodes: [osc1, osc2, filter, ampGain],
      releaseTime: 0.28
    };
  }

  // 4. Music Box / Celesta
  playCelesta(freq, velocity, now) {
    const voiceGain = this.ctx.createGain();
    voiceGain.connect(this.dryGain);
    voiceGain.connect(this.reverbNode);

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(freq, now);
    // Metallic bell overtones
    osc2.frequency.setValueAtTime(freq * 3.76, now);

    const gain1 = this.ctx.createGain();
    const gain2 = this.ctx.createGain();

    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(0.5 * velocity, now + 0.003);
    gain1.gain.exponentialRampToValueAtTime(0.00001, now + 2.2);

    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.linearRampToValueAtTime(0.25 * velocity, now + 0.003);
    gain2.gain.exponentialRampToValueAtTime(0.00001, now + 0.45);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(voiceGain);
    gain2.connect(voiceGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.4);
    osc2.stop(now + 2.4);

    return {
      type: 'celesta',
      voiceGain,
      nodes: [osc1, osc2, gain1, gain2],
      releaseTime: 0.4
    };
  }

  // 5. Marimba
  playMarimba(freq, velocity, now) {
    const voiceGain = this.ctx.createGain();
    voiceGain.connect(this.dryGain);
    voiceGain.connect(this.reverbNode);

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 4.0, now); // 4th harmonic resonant strike

    const gain1 = this.ctx.createGain();
    const gain2 = this.ctx.createGain();

    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(0.6 * velocity, now + 0.002);
    gain1.gain.exponentialRampToValueAtTime(0.00001, now + 0.75);

    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.linearRampToValueAtTime(0.3 * velocity, now + 0.002);
    gain2.gain.exponentialRampToValueAtTime(0.00001, now + 0.12);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(voiceGain);
    gain2.connect(voiceGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.85);
    osc2.stop(now + 0.85);

    return {
      type: 'marimba',
      voiceGain,
      nodes: [osc1, osc2, gain1, gain2],
      releaseTime: 0.15
    };
  }

  // 6. Church Pipe Organ
  playOrgan(freq, velocity, now) {
    const voiceGain = this.ctx.createGain();
    voiceGain.connect(this.dryGain);
    voiceGain.connect(this.reverbNode);

    // Organ drawbars: 8', 4', 2 2/3', 2'
    const drawbars = [
      { mult: 0.5, amp: 0.3 }, // 16'
      { mult: 1.0, amp: 0.5 }, // 8'
      { mult: 2.0, amp: 0.35 },// 4'
      { mult: 3.0, amp: 0.2 }, // 2 2/3'
      { mult: 4.0, amp: 0.15 } // 2'
    ];

    const nodes = [];
    drawbars.forEach(d => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * d.mult, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(d.amp * velocity * 0.3, now + 0.02);

      osc.connect(gain);
      gain.connect(voiceGain);
      osc.start(now);
      nodes.push(osc, gain);
    });

    return {
      type: 'organ',
      voiceGain,
      nodes,
      releaseTime: 0.2
    };
  }

  stopNote(noteName, forceInstant = false) {
    if (!this.ctx) return;
    const voice = this.activeVoices.get(noteName);
    if (!voice) return;

    voice.isKeyHeld = false;

    // If sustain is held and not forceInstant, hold voice in sustainedVoices
    if (this.isSustainOn && !forceInstant) {
      this.sustainedVoices.add(voice);
      this.activeVoices.delete(noteName);
      return;
    }

    this.dampVoice(voice, this.ctx.currentTime, forceInstant);
    this.activeVoices.delete(noteName);
  }

  dampVoice(voice, now, instant = false) {
    if (!voice || !voice.voiceGain) return;

    const release = instant ? 0.02 : (voice.releaseTime || 0.25);
    try {
      voice.voiceGain.gain.cancelScheduledValues(now);
      voice.voiceGain.gain.setValueAtTime(voice.voiceGain.gain.value, now);
      voice.voiceGain.gain.exponentialRampToValueAtTime(0.00001, now + release);

      setTimeout(() => {
        if (voice.nodes) {
          voice.nodes.forEach(n => {
            try {
              if (n.stop) n.stop();
              if (n.disconnect) n.disconnect();
            } catch (e) {
              // ignore already stopped
            }
          });
        }
        if (voice.voiceGain && voice.voiceGain.disconnect) {
          try { voice.voiceGain.disconnect(); } catch (e) {}
        }
      }, (release + 0.05) * 1000);
    } catch (e) {
      // Audio context error guard
    }
  }

  stopAllNotes() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.activeVoices.forEach(voice => this.dampVoice(voice, now, true));
    this.sustainedVoices.forEach(voice => this.dampVoice(voice, now, true));
    this.activeVoices.clear();
    this.sustainedVoices.clear();
  }
}

export const soundEngine = new SoundEngine();
