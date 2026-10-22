/**
 * Audio Engine - Health & Vitality Hub
 * Bips sonores par Web Audio API & Synthèse vocale par Web Speech API (100% hors-ligne, sans assets lourds).
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.soundEnabled = true;
    this.voiceEnabled = true;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  }

  initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq = 440, duration = 0.15, type = 'sine') {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('[Audio] Erreur playTone:', e);
    }
  }

  beepCountdown() {
    this.playTone(660, 0.1, 'sine');
  }

  beepGo() {
    this.playTone(880, 0.35, 'triangle');
  }

  beepRest() {
    this.playTone(440, 0.3, 'sine');
  }

  beepVictory() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // Do, Mi, Sol, Do aigu
      notes.forEach((freq, idx) => {
        setTimeout(() => this.playTone(freq, 0.25, 'triangle'), idx * 160);
      });
    } catch (_) {}
  }

  speak(text) {
    if (!this.voiceEnabled || !this.synth) return;
    try {
      this.synth.cancel(); // Annule la parole précédente pour réactivité maximale
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      this.synth.speak(utterance);
    } catch (e) {
      console.warn('[Voice] Erreur speak:', e);
    }
  }
}

export const audioEngine = new AudioEngine();
