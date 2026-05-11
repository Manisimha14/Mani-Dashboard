import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';
import type { WeatherType } from '../hooks/useWeather';

interface SoundscapeProps {
  type: WeatherType;
}

export default function Soundscape({ type }: SoundscapeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtx = useRef<AudioContext | null>(null);
  const noiseSource = useRef<AudioBufferSourceNode | null>(null);

  const toggleSound = () => {
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    
    if (isPlaying) {
      noiseSource.current?.stop();
      setIsPlaying(false);
    } else {
      playAmbient();
      setIsPlaying(true);
    }
  };

  const playAmbient = () => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate brown noise for rain/wind
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // volume adjustment
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = type === 'rainy' ? 400 : 800;

    source.connect(lowpass);
    lowpass.connect(ctx.destination);
    
    source.start();
    noiseSource.current = source;
  };

  useEffect(() => {
    return () => {
      noiseSource.current?.stop();
    };
  }, []);

  return (
    <div className="fixed bottom-6 left-[380px] z-50">
      <button
        onClick={toggleSound}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full glass-card border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all ${isPlaying ? 'bg-violet-600/20 text-violet-400 border-violet-500/50' : 'text-white/40 hover:text-white'}`}
      >
        {isPlaying ? <Volume2 size={12} /> : <VolumeX size={12} />}
        <span>{isPlaying ? `${type} soundscape active` : 'Ambient Soundscape'}</span>
      </button>
    </div>
  );
}
