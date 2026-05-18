import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Music, CloudRain, Wind, Coffee, Waves, X, Play, Pause } from 'lucide-react';

const SOUNDS = [
  { id: 'rain', label: 'Heavy Rain', icon: CloudRain, color: 'text-blue-400', freq: 400 },
  { id: 'wind', label: 'Mountain Wind', icon: Wind, color: 'text-slate-300', freq: 800 },
  { id: 'cafe', label: 'Quiet Cafe', icon: Coffee, color: 'text-amber-400', freq: 1200 },
  { id: 'waves', label: 'Deep Ocean', icon: Waves, color: 'text-cyan-400', freq: 200 },
];

export default function SoundscapeMixer() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  
  const audioCtx = useRef<AudioContext | null>(null);
  const noiseSource = useRef<AudioBufferSourceNode | null>(null);
  const gainNode = useRef<GainNode | null>(null);

  const toggleSound = (soundId: string) => {
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    
    if (activeSound === soundId) {
      stopSound();
    } else {
      stopSound();
      const sound = SOUNDS.find(s => s.id === soundId);
      if (sound) playAmbient(sound.freq);
      setActiveSound(soundId);
    }
  };

  const stopSound = () => {
    noiseSource.current?.stop();
    noiseSource.current = null;
    setActiveSound(null);
  };

  const playAmbient = (freq: number) => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.value = volume;
    gainNode.current = gain;

    source.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(ctx.destination);
    
    source.start();
    noiseSource.current = source;
  };

  useEffect(() => {
    if (gainNode.current) {
      gainNode.current.gain.value = volume;
    }
  }, [volume]);

  useEffect(() => {
    return () => stopSound();
  }, []);

  return (
    <div className="fixed md:bottom-6 md:right-6 bottom-24 right-4 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="glass-card p-6 w-72 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-bold text-white text-sm">Acoustic Focus</h4>
                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Ambient Engine</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/20 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {SOUNDS.map(sound => (
                <button
                  key={sound.id}
                  onClick={() => toggleSound(sound.id)}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
                    activeSound === sound.id
                      ? 'bg-violet-500/20 border-violet-500/50 text-white'
                      : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                  }`}
                >
                  <sound.icon size={20} className={activeSound === sound.id ? sound.color : ''} />
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-center">{sound.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex justify-between items-center text-[9px] font-black uppercase text-white/20 tracking-widest">
                <span>Output Volume</span>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
              />
            </div>
            
            {/* Animated Waveform when playing */}
            {activeSound && (
              <div className="absolute bottom-0 left-0 right-0 h-1 flex items-end gap-[2px] px-2 opacity-50">
                {Array.from({ length: 20 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [4, Math.random() * 20 + 4, 4] }}
                    transition={{ duration: 0.5 + Math.random(), repeat: Infinity }}
                    className="flex-1 bg-violet-500/30 rounded-t-sm"
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all ${
          activeSound 
            ? 'bg-violet-600 text-white shadow-glow-sm animate-pulse' 
            : 'bg-white/5 backdrop-blur-xl border border-white/10 text-white/40 hover:text-white'
        }`}
      >
        {activeSound ? <Volume2 size={20} /> : <Music size={20} />}
      </motion.button>
    </div>
  );
}
