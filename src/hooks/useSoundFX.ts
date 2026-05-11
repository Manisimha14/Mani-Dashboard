import { useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

// Web Audio API sound engine - no files needed
class SoundEngine {
  private ctx: AudioContext | null = null;

  public getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private envelope(
    gainNode: GainNode,
    attackTime: number,
    holdTime: number,
    releaseTime: number,
    peak: number,
    ctx: AudioContext
  ) {
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(peak, now + attackTime);
    gainNode.gain.setValueAtTime(peak, now + attackTime + holdTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + attackTime + holdTime + releaseTime);
  }

  click(volume = 0.3) {
    try {
      const ctx = this.getCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
      this.envelope(gain, 0.001, 0.01, 0.04, volume, ctx);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    } catch (_) {}
  }

  success(volume = 0.4) {
    try {
      const ctx = this.getCtx();
      const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(volume, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.4);
      });
    } catch (_) {}
  }

  error(volume = 0.3) {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);
      this.envelope(gain, 0.01, 0.05, 0.15, volume * 0.5, ctx);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (_) {}
  }

  tick(volume = 0.1) {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 1200;
      this.envelope(gain, 0.001, 0.002, 0.02, volume, ctx);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch (_) {}
  }

  achievement(volume = 0.5) {
    try {
      const ctx = this.getCtx();
      const notes = [392, 523, 659, 784, 1047, 1319];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.08;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(volume * (1 - i * 0.1), t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.start(t);
        osc.stop(t + 0.5);
      });
    } catch (_) {}
  }

  sessionStart(volume = 0.4) {
    try {
      const ctx = this.getCtx();
      [330, 440, 550].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.15;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(volume, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.6);
      });
    } catch (_) {}
  }

  sessionEnd(volume = 0.5) {
    try {
      const ctx = this.getCtx();
      [784, 988, 1175, 1568].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.2;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(volume, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        osc.start(t);
        osc.stop(t + 1);
      });
    } catch (_) {}
  }

  whoosh(volume = 0.2) {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.2);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.4);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.2);
      
      this.envelope(gain, 0.1, 0.1, 0.2, volume, ctx);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (_) {}
  }
}

export const soundEngine = new SoundEngine();

export function useSoundFX() {
  const { pomodoroSettings } = useAppStore();
  const enabled = pomodoroSettings.soundEnabled;

  const play = useCallback((type: keyof SoundEngine, volume?: number) => {
    if (!enabled) return;
    
    // Resume context on play if needed
    const ctx = soundEngine.getCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (typeof (soundEngine as any)[type] === 'function') {
      (soundEngine as any)[type](volume);
    }
  }, [enabled]);

  return { play, soundEngine };
}
