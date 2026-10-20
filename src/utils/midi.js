// Web MIDI API Integration for Physical Keyboards

import { ALL_KEYS } from './musicTheory';

class MidiService {
  constructor() {
    this.midiAccess = null;
    this.isSupported = !!(navigator.requestMIDIAccess);
    this.connectedDevices = [];
    this.onNoteOn = null;
    this.onNoteOff = null;
    this.onSustain = null;
    this.onStatusChange = null;
  }

  async init(callbacks = {}) {
    this.onNoteOn = callbacks.onNoteOn || null;
    this.onNoteOff = callbacks.onNoteOff || null;
    this.onSustain = callbacks.onSustain || null;
    this.onStatusChange = callbacks.onStatusChange || null;

    if (!this.isSupported) {
      if (this.onStatusChange) {
        this.onStatusChange({ supported: false, devices: [] });
      }
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.updateDevices();

      this.midiAccess.onstatechange = () => {
        this.updateDevices();
      };

      return true;
    } catch (err) {
      console.warn('MIDI Access request denied or failed:', err);
      if (this.onStatusChange) {
        this.onStatusChange({ supported: true, error: err.message, devices: [] });
      }
      return false;
    }
  }

  updateDevices() {
    if (!this.midiAccess) return;

    this.connectedDevices = [];
    const inputs = this.midiAccess.inputs.values();

    for (const input of inputs) {
      if (input.state === 'connected') {
        this.connectedDevices.push({
          id: input.id,
          name: input.name || 'Unknown MIDI Device',
          manufacturer: input.manufacturer || 'Generic'
        });

        // Attach listener
        input.onmidimessage = (msg) => this.handleMidiMessage(msg);
      }
    }

    if (this.onStatusChange) {
      this.onStatusChange({
        supported: true,
        devices: this.connectedDevices
      });
    }
  }

  handleMidiMessage(event) {
    const [status, noteNumber, velocity] = event.data;
    const command = status >> 4;
    // const channel = status & 0xf;

    if (command === 9) {
      // Note On (if velocity > 0, else Note Off)
      const keyObj = ALL_KEYS.find(k => k.midi === noteNumber);
      if (!keyObj) return;

      if (velocity > 0) {
        if (this.onNoteOn) {
          const normVel = velocity / 127;
          this.onNoteOn(keyObj.name, keyObj.frequency, normVel);
        }
      } else {
        if (this.onNoteOff) {
          this.onNoteOff(keyObj.name);
        }
      }
    } else if (command === 8) {
      // Note Off
      const keyObj = ALL_KEYS.find(k => k.midi === noteNumber);
      if (keyObj && this.onNoteOff) {
        this.onNoteOff(keyObj.name);
      }
    } else if (command === 11) {
      // Control Change
      if (noteNumber === 64) {
        // Sustain Pedal (CC 64): >= 64 is down, < 64 is up
        const isDown = velocity >= 64;
        if (this.onSustain) {
          this.onSustain(isDown);
        }
      }
    }
  }
}

export const midiService = new MidiService();
