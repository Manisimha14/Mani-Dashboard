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
      
      oscillator.onended = () => {
        try {
          oscillator.disconnect();
          gain.disconnect();
        } catch (e) {
          console.warn('[SoundEngine Click Cleanup Error]', e);
        }
      };

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn('[SoundEngine Click Playback Error]', e);
    }
  }

  success(volume = 0.4) {
    try {
      const ctx = this.getCtx();
      const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
      let completedCount = 0;

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

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch (e) {
            console.warn('[SoundEngine Success Node Cleanup Error]', e);
          }
          completedCount++;
        };

        osc.start(t);
        osc.stop(t + 0.4);
      });
    } catch (e) {
      console.warn('[SoundEngine Success Playback Error]', e);
    }
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

      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch (e) {
          console.warn('[SoundEngine Error Cleanup Error]', e);
        }
      };

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('[SoundEngine Error Playback Error]', e);
    }
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

      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch (e) {
          console.warn('[SoundEngine Tick Cleanup Error]', e);
        }
      };

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.warn('[SoundEngine Tick Playback Error]', e);
    }
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

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch (e) {
            console.warn('[SoundEngine Achievement Node Cleanup Error]', e);
          }
        };

        osc.start(t);
        osc.stop(t + 0.5);
      });
    } catch (e) {
      console.warn('[SoundEngine Achievement Playback Error]', e);
    }
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

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch (e) {
            console.warn('[SoundEngine SessionStart Node Cleanup Error]', e);
          }
        };

        osc.start(t);
        osc.stop(t + 0.6);
      });
    } catch (e) {
      console.warn('[SoundEngine SessionStart Playback Error]', e);
    }
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

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch (e) {
            console.warn('[SoundEngine SessionEnd Node Cleanup Error]', e);
          }
        };

        osc.start(t);
        osc.stop(t + 1);
      });
    } catch (e) {
      console.warn('[SoundEngine SessionEnd Playback Error]', e);
    }
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

      osc.onended = () => {
        try {
          osc.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch (e) {
          console.warn('[SoundEngine Whoosh Cleanup Error]', e);
        }
      };

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('[SoundEngine Whoosh Playback Error]', e);
    }
  }

  private ambienceNodes: { source: any; gain: GainNode }[] = [];
  private masterAmbienceGain: GainNode | null = null;
  private ambienceType: string = 'none';

  stopAmbience() {
    this.ambienceNodes.forEach(node => {
      try {
        node.source.stop();
      } catch (_) {}
      try {
        node.source.disconnect();
      } catch (_) {}
      try {
        node.gain.disconnect();
      } catch (_) {}
    });
    this.ambienceNodes = [];
    if (this.masterAmbienceGain) {
      try {
        this.masterAmbienceGain.disconnect();
      } catch (_) {}
      this.masterAmbienceGain = null;
    }
    this.ambienceType = 'none';
  }

  setAmbienceVolume(vol: number) {
    if (this.masterAmbienceGain) {
      this.masterAmbienceGain.gain.setValueAtTime(vol * 0.5, this.getCtx().currentTime);
    }
  }

  startAmbience(type: string, volume: number) {
    this.stopAmbience();
    if (type === 'none') return;
    
    const ctx = this.getCtx();
    this.ambienceType = type;
    this.masterAmbienceGain = ctx.createGain();
    this.masterAmbienceGain.gain.setValueAtTime(volume * 0.5, ctx.currentTime);
    this.masterAmbienceGain.connect(ctx.destination);

    try {
      if (type === 'rain' || type === 'forest' || type === 'white_noise') {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          b6 = white * 0.115926;
          data[i] = pink * 0.11;
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        
        const filter = ctx.createBiquadFilter();
        if (type === 'rain') {
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(500, ctx.currentTime);
          filter.Q.setValueAtTime(0.8, ctx.currentTime);
          
          const lfo = ctx.createOscillator();
          lfo.frequency.value = 0.1;
          const lfoGain = ctx.createGain();
          lfoGain.gain.value = 150;
          lfo.connect(lfoGain);
          lfoGain.connect(filter.frequency);
          lfo.start();
          
          this.ambienceNodes.push({ source: lfo, gain: lfoGain });
        } else if (type === 'forest') {
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(800, ctx.currentTime);
          
          const lfo = ctx.createOscillator();
          lfo.frequency.value = 0.05;
          const lfoGain = ctx.createGain();
          lfoGain.gain.value = 250;
          lfo.connect(lfoGain);
          lfoGain.connect(filter.frequency);
          lfo.start();
          
          this.ambienceNodes.push({ source: lfo, gain: lfoGain });

          const birdInterval = setInterval(() => {
            if (this.ambienceType !== 'forest') {
              clearInterval(birdInterval);
              return;
            }
            if (Math.random() > 0.4) {
              const birdOsc = ctx.createOscillator();
              const birdGain = ctx.createGain();
              birdOsc.connect(birdGain);
              birdGain.connect(this.masterAmbienceGain!);
              
              birdOsc.type = 'sine';
              const baseFreq = 2000 + Math.random() * 1500;
              birdOsc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
              birdOsc.frequency.exponentialRampToValueAtTime(baseFreq + 800, ctx.currentTime + 0.15);
              
              birdGain.gain.setValueAtTime(0, ctx.currentTime);
              birdGain.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 0.05);
              birdGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
              
              birdOsc.start();
              birdOsc.stop(ctx.currentTime + 0.2);
            }
          }, 3500);
          
          this.ambienceNodes.push({ source: { stop: () => clearInterval(birdInterval), disconnect: () => {} }, gain: ctx.createGain() });
        } else {
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1000, ctx.currentTime);
        }
        
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(type === 'white_noise' ? 0.3 : 0.8, ctx.currentTime);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterAmbienceGain);
        noise.start();
        
        this.ambienceNodes.push({ source: noise, gain: noiseGain });
      } 
      else if (type === 'space') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const humGain = ctx.createGain();
        
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(55, ctx.currentTime);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(55.4, ctx.currentTime);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(90, ctx.currentTime);
        filter.Q.setValueAtTime(4, ctx.currentTime);
        
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.08;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 25;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
        
        humGain.gain.setValueAtTime(0.7, ctx.currentTime);
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(humGain);
        humGain.connect(this.masterAmbienceGain);
        
        osc1.start();
        osc2.start();
        
        this.ambienceNodes.push({ source: osc1, gain: humGain });
        this.ambienceNodes.push({ source: osc2, gain: humGain });
        this.ambienceNodes.push({ source: lfo, gain: lfoGain });
      }
      else if (type === 'cafe') {
        const frequencies = [110, 147, 165, 196, 220, 294];
        frequencies.forEach((freq) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          
          const chatterLfo = ctx.createOscillator();
          chatterLfo.frequency.value = 0.5 + Math.random() * 2;
          const chatterLfoGain = ctx.createGain();
          chatterLfoGain.gain.value = 0.15;
          chatterLfo.connect(chatterLfoGain);
          chatterLfoGain.connect(oscGain.gain);
          chatterLfo.start();
          
          oscGain.gain.setValueAtTime(0.1, ctx.currentTime);
          
          osc.connect(oscGain);
          oscGain.connect(this.masterAmbienceGain!);
          osc.start();
          
          this.ambienceNodes.push({ source: osc, gain: oscGain });
          this.ambienceNodes.push({ source: chatterLfo, gain: chatterLfoGain });
        });
      }
      else if (type === 'lofi') {
        const chordPads = [
          [261.63, 329.63, 392.00, 493.88],
          [349.23, 440.00, 523.25, 659.25],
          [293.66, 349.23, 440.00, 587.33]
        ];
        
        let chordIdx = 0;
        const playChord = () => {
          if (this.ambienceType !== 'lofi') return;
          const freqs = chordPads[chordIdx];
          chordIdx = (chordIdx + 1) % chordPads.length;
          
          freqs.forEach(freq => {
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            
            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.setValueAtTime(500, ctx.currentTime);
            
            osc.connect(lp);
            lp.connect(oscGain);
            oscGain.connect(this.masterAmbienceGain!);
            
            oscGain.gain.setValueAtTime(0, ctx.currentTime);
            oscGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1.5);
            oscGain.gain.setValueAtTime(0.08, ctx.currentTime + 4.5);
            oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 6.0);
            
            osc.start();
            osc.stop(ctx.currentTime + 6.0);
          });
        };
        
        playChord();
        const lofiInterval = setInterval(playChord, 7000);
        
        const crackleInterval = setInterval(() => {
          if (this.ambienceType !== 'lofi') {
            clearInterval(crackleInterval);
            return;
          }
          if (Math.random() > 0.4) {
            const clickOsc = ctx.createOscillator();
            const clickGain = ctx.createGain();
            clickOsc.connect(clickGain);
            clickGain.connect(this.masterAmbienceGain!);
            clickOsc.type = 'sawtooth';
            clickOsc.frequency.setValueAtTime(4000, ctx.currentTime);
            
            clickGain.gain.setValueAtTime(0, ctx.currentTime);
            clickGain.gain.linearRampToValueAtTime(0.006, ctx.currentTime + 0.001);
            clickGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.005);
            clickOsc.start();
            clickOsc.stop(ctx.currentTime + 0.01);
          }
        }, 1200);
        
        this.ambienceNodes.push({ source: { stop: () => { clearInterval(lofiInterval); clearInterval(crackleInterval); }, disconnect: () => {} }, gain: ctx.createGain() });
      }
      else if (type === 'keyboard') {
        const typeInterval = setInterval(() => {
          if (this.ambienceType !== 'keyboard') {
            clearInterval(typeInterval);
            return;
          }
          const numClicks = Math.floor(Math.random() * 3) + 1;
          for (let i = 0; i < numClicks; i++) {
            const t = ctx.currentTime + i * 0.12;
            const clickOsc = ctx.createOscillator();
            const clickGain = ctx.createGain();
            const clickFilter = ctx.createBiquadFilter();
            
            clickOsc.connect(clickFilter);
            clickFilter.connect(clickGain);
            clickGain.connect(this.masterAmbienceGain!);
            
            clickOsc.type = 'triangle';
            clickOsc.frequency.setValueAtTime(150 + Math.random() * 100, t);
            
            clickFilter.type = 'bandpass';
            clickFilter.frequency.setValueAtTime(1200 + Math.random() * 400, t);
            clickFilter.Q.setValueAtTime(8, t);
            
            clickGain.gain.setValueAtTime(0, t);
            clickGain.gain.linearRampToValueAtTime(0.12, t + 0.002);
            clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
            
            clickOsc.start(t);
            clickOsc.stop(t + 0.05);
          }
        }, 800);
        
        this.ambienceNodes.push({ source: { stop: () => clearInterval(typeInterval), disconnect: () => {} }, gain: ctx.createGain() });
      }
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
