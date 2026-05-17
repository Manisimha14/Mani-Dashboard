import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Music, Volume2, VolumeX, Sparkles, Play, Pause, RefreshCw, 
  Wind, CloudRain, Shield, Activity, Compass, Zap, Heart, Eye, Hand, Ear, Smile
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SoundLayer {
  id: string;
  name: string;
  desc: string;
  icon: any;
  volume: number;
  active: boolean;
  color: string;
}

export default function Ambient() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Sound layers state
  const [layers, setLayers] = useState<SoundLayer[]>([
    {
      id: 'om',
      name: 'Sacred Om Resonance',
      desc: 'Deep chest resonance synthesized at 136.1Hz for cosmic stress relief',
      icon: Heart,
      volume: 0.55,
      active: false,
      color: 'from-amber-500 to-orange-500',
    },
    {
      id: 'binaural',
      name: 'Focus Frequency (40Hz)',
      desc: 'Real Gamma waves synthesized to trigger deep cerebral focus',
      icon: Zap,
      volume: 0.45,
      active: false,
      color: 'from-violet-500 to-indigo-500',
    },
    {
      id: 'brownian',
      name: 'Cosmic Pink Noise',
      desc: 'Procedural continuous deep noise blocks representing star dust',
      icon: Compass,
      volume: 0.4,
      active: false,
      color: 'from-fuchsia-500 to-purple-500',
    },
    {
      id: 'wind',
      name: 'Zen Wind Sweeper',
      desc: 'Live resonant filter sweeping simulating atmospheric gusts',
      icon: Wind,
      volume: 0.3,
      active: false,
      color: 'from-cyan-500 to-blue-500',
    },
    {
      id: 'rain',
      name: 'Ocean Rain',
      desc: 'Synthesized high-pass micro-crackles of relaxing rain droplets',
      icon: CloudRain,
      volume: 0.2,
      active: false,
      color: 'from-rose-500 to-pink-500',
    },
  ]);

  // Guided breathing states
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');
  const [breathingTimer, setBreathingTimer] = useState(4);
  const [breathCount, setBreathCount] = useState(0);

  // Interactive Mindfulness States
  const [activeDestressTab, setActiveDestressTab] = useState<'grounding' | 'release'>('grounding');
  const [groundingStep, setGroundingStep] = useState(0);
  const [groundingInputs, setGroundingInputs] = useState<string[]>(['', '', '', '', '']);
  const [racingThought, setRacingThought] = useState('');
  const [isThoughtReleased, setIsThoughtReleased] = useState(false);

  // Web Audio API refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Audio node refs
  const leftOscRef = useRef<OscillatorNode | null>(null);
  const rightOscRef = useRef<OscillatorNode | null>(null);
  const binauralGainRef = useRef<GainNode | null>(null);
  
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const noiseGainRef = useRef<GainNode | null>(null);

  const windSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const windFilterRef = useRef<BiquadFilterNode | null>(null);
  const windGainRef = useRef<GainNode | null>(null);
  const windOscRef = useRef<OscillatorNode | null>(null);

  const rainSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const rainGainRef = useRef<GainNode | null>(null);

  // OM Synth refs
  const omOscRef = useRef<OscillatorNode | null>(null);
  const omSubOscRef = useRef<OscillatorNode | null>(null);
  const omGainRef = useRef<GainNode | null>(null);
  const omFormantFilterRef = useRef<BiquadFilterNode | null>(null);
  const omIntervalRef = useRef<any>(null);

  // Canvas visualizer ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── 1. Breathing Cycle Loop ────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setBreathingTimer(prev => {
        if (prev <= 1) {
          // Phase transitions
          if (breathingPhase === 'inhale') {
            setBreathingPhase('hold1');
            return 4;
          } else if (breathingPhase === 'hold1') {
            setBreathingPhase('exhale');
            return 4;
          } else if (breathingPhase === 'exhale') {
            setBreathingPhase('hold2');
            return 4;
          } else {
            setBreathingPhase('inhale');
            setBreathCount(c => c + 1);
            return 4;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [breathingPhase]);

  // ── 2. Particle & Sacred Mandala Visualizer ───────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio);

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    window.addEventListener('resize', handleResize);

    // Particle field initialization
    const particles = Array.from({ length: 45 }).map(() => ({
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * Math.min(width, height) * 0.35 + 20,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
      speed: (Math.random() * 0.005 + 0.001) * (Math.random() > 0.5 ? 1 : -1),
    }));

    let mandalaRotation = 0;

    const render = () => {
      ctx.fillStyle = 'rgba(9, 10, 22, 0.2)';
      ctx.fillRect(0, 0, width, height);

      const omLayer = layers.find(l => l.id === 'om');
      const isOmActive = omLayer?.active && isPlaying;
      
      const activeLayers = layers.filter(l => l.active && isPlaying);
      const totalVolume = activeLayers.reduce((sum, l) => sum + l.volume, 0);
      const energyMultiplier = 1 + totalVolume * 1.6;

      ctx.save();
      ctx.translate(width / 2, height / 2);

      if (isOmActive) {
        // ── Drawing a Sacred Lotus Mandala (Synergizes with OM resonance waves) ──
        mandalaRotation += 0.004 * energyMultiplier;
        ctx.rotate(mandalaRotation);

        const breathingPulse = breathingPhase === 'inhale' 
          ? (4 - breathingTimer) * 0.1 
          : breathingPhase === 'exhale' 
            ? breathingTimer * 0.1 
            : 0.2;

        const maxRadius = Math.min(width, height) * 0.32 * (1 + breathingPulse);
        const petalCount = 8;

        for (let j = 0; j < 3; j++) {
          const petalRadius = maxRadius * (1 - j * 0.25);
          ctx.beginPath();
          for (let i = 0; i < petalCount; i++) {
            const angle = (i * Math.PI * 2) / petalCount;
            const nextAngle = ((i + 1) * Math.PI * 2) / petalCount;
            const midAngle = (angle + nextAngle) / 2;

            const xStart = Math.cos(angle) * (petalRadius * 0.35);
            const yStart = Math.sin(angle) * (petalRadius * 0.35);
            const xEnd = Math.cos(nextAngle) * (petalRadius * 0.35);
            const yEnd = Math.sin(nextAngle) * (petalRadius * 0.35);

            const cpX = Math.cos(midAngle) * petalRadius;
            const cpY = Math.sin(midAngle) * petalRadius;

            ctx.moveTo(xStart, yStart);
            ctx.quadraticCurveTo(cpX, cpY, xEnd, yEnd);
          }
          
          ctx.strokeStyle = j === 0 
            ? 'rgba(245, 158, 11, 0.25)' 
            : j === 1 
              ? 'rgba(167, 139, 250, 0.18)' 
              : 'rgba(244, 63, 94, 0.12)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Concentric geometric rings
        ctx.beginPath();
        ctx.arc(0, 0, maxRadius * 0.2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.stroke();
      } else {
        // ── Normal Orbiting Particle Field ──
        particles.forEach(p => {
          p.angle += p.speed * energyMultiplier;
          const x = Math.cos(p.angle) * p.radius;
          const y = Math.sin(p.angle) * p.radius;

          ctx.beginPath();
          ctx.arc(x, y, p.size * (isPlaying ? 1.4 : 1), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(167, 139, 250, ${p.alpha * (isPlaying ? 1.6 : 1)})`;
          ctx.fill();
        });
      }

      ctx.restore();

      // Glowing singularity background
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        15 * energyMultiplier,
        width / 2,
        height / 2,
        130 * energyMultiplier
      );
      gradient.addColorStop(0, isOmActive ? 'rgba(245, 158, 11, 0.08)' : 'rgba(139, 92, 246, 0.06)');
      gradient.addColorStop(1, 'rgba(9, 10, 22, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, layers, breathingPhase, breathingTimer]);

  // ── 3. Web Audio Synthesis Engines ──────────────────────────────────────────
  
  const initAudio = () => {
    if (audioCtxRef.current) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtxRef.current = new AudioContextClass();
  };

  // Live Procedural OM Chanting Synthesizer (Formant Vowel Modeling at 136.1Hz)
  const startOmChant = (ctx: AudioContext, vol: number) => {
    if (omOscRef.current) return;

    // Triangle osc at 136.1Hz (Anahata Heart Chakra frequency)
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 136.1;

    // chest sine oscillator at 68.05Hz (half octave sub-harmonic)
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.value = 68.05;

    // Vowel tract filter sweep
    const formantFilter = ctx.createBiquadFilter();
    formantFilter.type = 'bandpass';
    formantFilter.Q.value = 4.5;
    formantFilter.frequency.value = 500;

    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.55;

    const subGain = ctx.createGain();
    subGain.gain.value = 0.45;

    osc.connect(oscGain);
    subOsc.connect(subGain);

    const vocalBus = ctx.createGain();
    oscGain.connect(vocalBus);
    subGain.connect(vocalBus);

    const filterGain = ctx.createGain();
    vocalBus.connect(formantFilter).connect(filterGain);

    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0, ctx.currentTime);

    filterGain.connect(mainGain).connect(ctx.destination);

    osc.start();
    subOsc.start();

    omOscRef.current = osc;
    omSubOscRef.current = subOsc;
    omGainRef.current = mainGain;
    omFormantFilterRef.current = formantFilter;

    // envelope loop (8s breathing chant cycles)
    const cycle = 8;
    const automateChant = () => {
      if (!omGainRef.current || !omFormantFilterRef.current) return;
      const t = ctx.currentTime;

      omGainRef.current.gain.cancelScheduledValues(t);
      omFormantFilterRef.current.frequency.cancelScheduledValues(t);

      // vocal chant envelope
      omGainRef.current.gain.setValueAtTime(0, t);
      omGainRef.current.gain.linearRampToValueAtTime(vol * 0.55, t + 2.5);
      omGainRef.current.gain.setValueAtTime(vol * 0.55, t + 5.0);
      omGainRef.current.gain.linearRampToValueAtTime(0, t + cycle - 0.5);

      // vowel sweep from open "Ah" (550Hz) down to humming nasality "Mmm" (180Hz)
      omFormantFilterRef.current.frequency.setValueAtTime(550, t);
      omFormantFilterRef.current.frequency.exponentialRampToValueAtTime(180, t + 4.5);
    };

    automateChant();
    const intervalId = setInterval(automateChant, cycle * 1000);
    omIntervalRef.current = intervalId;
  };

  const stopOmChant = () => {
    try {
      omOscRef.current?.stop();
      omSubOscRef.current?.stop();
      if (omIntervalRef.current) clearInterval(omIntervalRef.current);
    } catch {}
    omOscRef.current = null;
    omSubOscRef.current = null;
    omGainRef.current = null;
    omFormantFilterRef.current = null;
    omIntervalRef.current = null;
  };

  // Binaural Focus 40Hz
  const startBinaural = (ctx: AudioContext, vol: number) => {
    if (leftOscRef.current) return;

    const leftOsc = ctx.createOscillator();
    const rightOsc = ctx.createOscillator();
    
    leftOsc.frequency.value = 200;
    rightOsc.frequency.value = 240;

    const leftPanner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const rightPanner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    
    if (leftPanner && rightPanner) {
      leftPanner.pan.value = -1;
      rightPanner.pan.value = 1;
    }

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(vol * 0.18, ctx.currentTime);

    if (leftPanner && rightPanner) {
      leftOsc.connect(leftPanner).connect(gainNode);
      rightOsc.connect(rightPanner).connect(gainNode);
    } else {
      leftOsc.connect(gainNode);
      rightOsc.connect(gainNode);
    }
    
    gainNode.connect(ctx.destination);

    leftOsc.start();
    rightOsc.start();

    leftOscRef.current = leftOsc;
    rightOscRef.current = rightOsc;
    binauralGainRef.current = gainNode;
  };

  const stopBinaural = () => {
    try {
      leftOscRef.current?.stop();
      rightOscRef.current?.stop();
    } catch {}
    leftOscRef.current = null;
    rightOscRef.current = null;
    binauralGainRef.current = null;
  };

  const createNoiseBuffer = (ctx: AudioContext) => {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let lastOut = 0.0;
    
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }
    return buffer;
  };

  const startBrownian = (ctx: AudioContext, vol: number) => {
    if (noiseSourceRef.current) return;

    const source = ctx.createBufferSource();
    source.buffer = createNoiseBuffer(ctx);
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(vol * 0.25, ctx.currentTime);

    source.connect(filter).connect(gainNode).connect(ctx.destination);
    source.start();

    noiseSourceRef.current = source;
    noiseGainRef.current = gainNode;
  };

  const stopBrownian = () => {
    try {
      noiseSourceRef.current?.stop();
    } catch {}
    noiseSourceRef.current = null;
    noiseGainRef.current = null;
  };

  const startWind = (ctx: AudioContext, vol: number) => {
    if (windSourceRef.current) return;

    const source = ctx.createBufferSource();
    source.buffer = createNoiseBuffer(ctx);
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 8.0;
    filter.frequency.value = 400;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(vol * 0.12, ctx.currentTime);

    const sweepOsc = ctx.createOscillator();
    sweepOsc.frequency.value = 0.08;
    
    const sweepGain = ctx.createGain();
    sweepGain.gain.value = 250;

    sweepOsc.connect(sweepGain).connect(filter.frequency);
    
    source.connect(filter).connect(gainNode).connect(ctx.destination);
    
    sweepOsc.start();
    source.start();

    windSourceRef.current = source;
    windFilterRef.current = filter;
    windGainRef.current = gainNode;
    windOscRef.current = sweepOsc;
  };

  const stopWind = () => {
    try {
      windSourceRef.current?.stop();
      windOscRef.current?.stop();
    } catch {}
    windSourceRef.current = null;
    windFilterRef.current = null;
    windGainRef.current = null;
    windOscRef.current = null;
  };

  const startRain = (ctx: AudioContext, vol: number) => {
    if (rainSourceRef.current) return;

    const source = ctx.createBufferSource();
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = white * 0.2;
    }
    
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(vol * 0.08, ctx.currentTime);

    source.connect(filter).connect(gainNode).connect(ctx.destination);
    source.start();

    rainSourceRef.current = source;
    rainGainRef.current = gainNode;
  };

  const stopRain = () => {
    try {
      rainSourceRef.current?.stop();
    } catch {}
    rainSourceRef.current = null;
    rainGainRef.current = null;
  };

  const syncAudioNodes = () => {
    if (!isPlaying) {
      stopAllSynthNodes();
      return;
    }

    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    layers.forEach(layer => {
      if (layer.active) {
        if (layer.id === 'om') {
          startOmChant(ctx, layer.volume);
        } else if (layer.id === 'binaural') {
          startBinaural(ctx, layer.volume);
          binauralGainRef.current?.gain.setValueAtTime(layer.volume * 0.18, ctx.currentTime);
        } else if (layer.id === 'brownian') {
          startBrownian(ctx, layer.volume);
          noiseGainRef.current?.gain.setValueAtTime(layer.volume * 0.25, ctx.currentTime);
        } else if (layer.id === 'wind') {
          startWind(ctx, layer.volume);
          windGainRef.current?.gain.setValueAtTime(layer.volume * 0.12, ctx.currentTime);
        } else if (layer.id === 'rain') {
          startRain(ctx, layer.volume);
          rainGainRef.current?.gain.setValueAtTime(layer.volume * 0.08, ctx.currentTime);
        }
      } else {
        if (layer.id === 'om') stopOmChant();
        else if (layer.id === 'binaural') stopBinaural();
        else if (layer.id === 'brownian') stopBrownian();
        else if (layer.id === 'wind') stopWind();
        else if (layer.id === 'rain') stopRain();
      }
    });
  };

  const stopAllSynthNodes = () => {
    stopOmChant();
    stopBinaural();
    stopBrownian();
    stopWind();
    stopRain();
  };

  useEffect(() => {
    syncAudioNodes();
    return () => stopAllSynthNodes();
  }, [isPlaying, layers]);

  const applyPreset = (presetName: string) => {
    initAudio();
    setActivePreset(presetName);
    setIsPlaying(true);

    setLayers(prev => {
      return prev.map(l => {
        if (presetName === 'focus') {
          return { ...l, active: l.id === 'binaural' || l.id === 'brownian', volume: l.id === 'binaural' ? 0.65 : 0.4 };
        }
        if (presetName === 'nature') {
          return { ...l, active: l.id === 'wind' || l.id === 'rain', volume: l.id === 'wind' ? 0.45 : 0.35 };
        }
        if (presetName === 'zen') {
          return { ...l, active: l.id === 'om' || l.id === 'wind', volume: l.id === 'om' ? 0.65 : 0.4 };
        }
        return l;
      });
    });

    toast.success(`Active Mix: ${presetName === 'focus' ? 'Deep Work Frequency' : presetName === 'nature' ? 'Zen Rain Canopy' : 'Sacred Om & Wind Meditation'}`);
  };

  const handleVolumeChange = (id: string, vol: number) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, volume: vol } : l));
    setActivePreset(null);
  };

  const toggleLayer = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, active: !l.active } : l));
    setActivePreset(null);
  };

  // Grounding Step Controller
  const handleGroundingNext = (stepIndex: number) => {
    if (stepIndex === 4) {
      setGroundingStep(5);
      toast.success('✨ Somatic grounding complete. Balance restored.');
    } else {
      setGroundingStep(stepIndex + 1);
    }
  };

  const resetGrounding = () => {
    setGroundingStep(0);
    setGroundingInputs(['', '', '', '', '']);
  };

  const triggerMistRelease = () => {
    if (!racingThought.trim()) return;
    setIsThoughtReleased(true);
    setTimeout(() => {
      setRacingThought('');
      setIsThoughtReleased(false);
      toast.success('🍃 Thought dissipated. Focus clear.');
    }, 4500);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Header Panel */}
      <div>
        <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/40">
          FLOWSCAPE STUDIO
        </h1>
        <p className="text-xs font-semibold text-white/30 uppercase tracking-[0.2em] mt-1">
          Interactive Binaural beat, Om chanting & Mindfulness sanctuary
        </p>
      </div>

      {/* Main Grid Splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left 2 Cols: Sound board and Visualizer */}
        <div className="lg:col-span-2 space-y-6">

          {/* Particle & Sacred Mandala Visualizer */}
          <div className="h-64 rounded-2xl border border-white/5 bg-slate-950 relative overflow-hidden flex flex-col justify-between p-5">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            
            <div className="relative z-10 flex items-center justify-between">
              <span className="text-[9px] font-black font-mono tracking-widest text-white/40 uppercase bg-white/[0.03] border border-white/5 px-2.5 py-1 rounded-md">
                {layers.find(l => l.id === 'om')?.active && isPlaying 
                  ? '☸️ Sacred Geometry Mandala' 
                  : '🌌 Ambient Space visualizer'}
              </span>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-[9px] font-mono text-amber-400 font-bold uppercase tracking-wider">Procedural Synthesis Active</span>
              </div>
            </div>

            {/* Play controls */}
            <div className="relative z-10 flex items-center gap-4">
              <button
                onClick={() => {
                  initAudio();
                  setIsPlaying(!isPlaying);
                }}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isPlaying 
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg' 
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-700/20'
                }`}
              >
                {isPlaying ? <VolumeX size={20} /> : <Play size={20} className="ml-1" />}
              </button>
              <div>
                <div className="text-xs font-bold text-white uppercase tracking-wider">
                  {isPlaying ? 'SOUND CANOPY BROADCASTING' : 'STUDIO MUTED'}
                </div>
                <div className="text-[10px] text-white/40 font-mono mt-0.5">
                  {isPlaying ? 'Mixing active synthesizers on high-precision Web Audio layer' : 'Click play to initialize browser oscillator engines'}
                </div>
              </div>
            </div>
          </div>

          {/* Sound Mixer Layers */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                DYNAMIC OSCILLATOR MIXER
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => applyPreset('focus')}
                  className={`text-[9px] font-black px-2.5 py-1 border rounded-md uppercase tracking-wider transition-all ${activePreset === 'focus' ? 'bg-violet-600 border-violet-500 text-white' : 'bg-white/[0.02] border-white/5 text-white/40 hover:text-white'}`}
                >
                  Focus Frequency
                </button>
                <button
                  onClick={() => applyPreset('nature')}
                  className={`text-[9px] font-black px-2.5 py-1 border rounded-md uppercase tracking-wider transition-all ${activePreset === 'nature' ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-white/[0.02] border-white/5 text-white/40 hover:text-white'}`}
                >
                  Nature Canopy
                </button>
                <button
                  onClick={() => applyPreset('zen')}
                  className={`text-[9px] font-black px-2.5 py-1 border rounded-md uppercase tracking-wider transition-all ${activePreset === 'zen' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-white/[0.02] border-white/5 text-white/40 hover:text-white'}`}
                >
                  Sacred Chanting
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {layers.map(layer => {
                const IconComp = layer.icon;
                return (
                  <div
                    key={layer.id}
                    className={`bg-white/[0.01] border p-4 rounded-xl flex flex-col justify-between transition-all duration-200 ${
                      layer.active && isPlaying 
                        ? 'border-amber-500/25 bg-gradient-to-br from-amber-950/[0.05] to-transparent' 
                        : 'border-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${layer.color} flex items-center justify-center text-white`}>
                          <IconComp size={14} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{layer.name}</div>
                          <div className="text-[9px] text-white/30 mt-0.5">{layer.desc}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleLayer(layer.id)}
                        className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase transition-all ${
                          layer.active 
                            ? 'bg-amber-600 border-amber-500 text-white' 
                            : 'bg-white/[0.02] border-white/5 text-white/30 hover:text-white'
                        }`}
                      >
                        {layer.active ? 'ACTIVE' : 'MUTED'}
                      </button>
                    </div>

                    {/* Volume Slider */}
                    <div className="mt-4 flex items-center gap-3">
                      <Volume2 size={12} className="text-white/20" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={layer.volume}
                        disabled={!layer.active}
                        onChange={(e) => handleVolumeChange(layer.id, Number(e.target.value))}
                        className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      />
                      <span className="text-[9px] font-mono text-white/40 w-6 text-right">
                        {Math.round(layer.volume * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive De-Stress Center */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                🧘 MINDFULNESS SANCTUARY & DE-STRESS CENTER
              </h3>
              <div className="flex bg-white/[0.03] p-1 border border-white/5 rounded-lg">
                <button
                  onClick={() => setActiveDestressTab('grounding')}
                  className={`text-[9px] font-black px-3 py-1 rounded-md uppercase tracking-wider transition-all ${activeDestressTab === 'grounding' ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400' : 'text-white/30 hover:text-white'}`}
                >
                  Somatic Grounding
                </button>
                <button
                  onClick={() => setActiveDestressTab('release')}
                  className={`text-[9px] font-black px-3 py-1 rounded-md uppercase tracking-wider transition-all ${activeDestressTab === 'release' ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400' : 'text-white/30 hover:text-white'}`}
                >
                  Thought Dissipation
                </button>
              </div>
            </div>

            <div className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl min-h-[170px] flex flex-col justify-between">
              {activeDestressTab === 'grounding' ? (
                <div>
                  {groundingStep === 0 && (
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <Eye size={13} className="text-amber-400" /> Somatic 5-4-3-2-1 Grounding
                      </div>
                      <p className="text-[10px] text-white/40 leading-relaxed font-mono">
                        A clinical method to interrupt anxiety and stress-induced freeze states. Focus on your environment.
                      </p>
                      <button
                        onClick={() => setGroundingStep(1)}
                        className="text-[9px] font-black uppercase tracking-wider px-4 py-2 bg-amber-500 text-slate-950 font-mono rounded-lg hover:bg-amber-400 transition-all mt-2"
                      >
                        Begin Grounding
                      </button>
                    </div>
                  )}

                  {groundingStep === 1 && (
                    <div className="space-y-4">
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>👁️ Formulate 5 things you can SEE right now:</span>
                        <span className="text-[10px] text-amber-400/60 font-mono font-bold">1 / 5</span>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Glowing text on my screen, grain of office desk..."
                        value={groundingInputs[0]}
                        onChange={(e) => setGroundingInputs(prev => [e.target.value, prev[1], prev[2], prev[3], prev[4]])}
                        className="input-glass w-full px-3 py-2 text-xs"
                      />
                      <button
                        disabled={!groundingInputs[0].trim()}
                        onClick={() => handleGroundingNext(1)}
                        className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-md disabled:opacity-40 disabled:hover:bg-white/5"
                      >
                        Next Anchor
                      </button>
                    </div>
                  )}

                  {groundingStep === 2 && (
                    <div className="space-y-4">
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>🤚 Formulate 4 things you can TOUCH:</span>
                        <span className="text-[10px] text-amber-400/60 font-mono font-bold">2 / 5</span>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Plastic keycap texture, soft cotton sweater..."
                        value={groundingInputs[1]}
                        onChange={(e) => setGroundingInputs(prev => [prev[0], e.target.value, prev[2], prev[3], prev[4]])}
                        className="input-glass w-full px-3 py-2 text-xs"
                      />
                      <button
                        disabled={!groundingInputs[1].trim()}
                        onClick={() => handleGroundingNext(2)}
                        className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-md disabled:opacity-40"
                      >
                        Next Anchor
                      </button>
                    </div>
                  )}

                  {groundingStep === 3 && (
                    <div className="space-y-4">
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>👂 Formulate 3 things you can HEAR:</span>
                        <span className="text-[10px] text-amber-400/60 font-mono font-bold">3 / 5</span>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Atmospheric winds sweeping, distant traffic hum..."
                        value={groundingInputs[2]}
                        onChange={(e) => setGroundingInputs(prev => [prev[0], prev[1], e.target.value, prev[3], prev[4]])}
                        className="input-glass w-full px-3 py-2 text-xs"
                      />
                      <button
                        disabled={!groundingInputs[2].trim()}
                        onClick={() => handleGroundingNext(3)}
                        className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-md disabled:opacity-40"
                      >
                        Next Anchor
                      </button>
                    </div>
                  )}

                  {groundingStep === 4 && (
                    <div className="space-y-4">
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>👃 Formulate 2 things you can SMELL/TREAT:</span>
                        <span className="text-[10px] text-amber-400/60 font-mono font-bold">4 / 5</span>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Brewed coffee aroma, fresh clean air..."
                        value={groundingInputs[3]}
                        onChange={(e) => setGroundingInputs(prev => [prev[0], prev[1], prev[2], e.target.value, prev[4]])}
                        className="input-glass w-full px-3 py-2 text-xs"
                      />
                      <button
                        disabled={!groundingInputs[3].trim()}
                        onClick={() => handleGroundingNext(4)}
                        className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-md disabled:opacity-40"
                      >
                        Complete Grounding
                      </button>
                    </div>
                  )}

                  {groundingStep === 5 && (
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <Smile size={14} /> Grounding Achieved.
                      </div>
                      <div className="text-[10px] text-white/50 leading-relaxed font-mono space-y-1">
                        <div>• Saw: <span className="text-white/80">{groundingInputs[0]}</span></div>
                        <div>• Felt: <span className="text-white/80">{groundingInputs[1]}</span></div>
                        <div>• Heard: <span className="text-white/80">{groundingInputs[2]}</span></div>
                        <div>• Smelled: <span className="text-white/80">{groundingInputs[3]}</span></div>
                      </div>
                      <button
                        onClick={resetGrounding}
                        className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 border border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/[0.03] text-white/60 hover:text-white rounded-md transition-all mt-2"
                      >
                        Recalibrate Grounding
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-white">Racing Thought Mental Stack Release</div>
                  <p className="text-[10px] text-white/40 leading-relaxed font-mono">
                    Type out a negative or stressing block cluttering your mind. Click to release and watch it dissipate like smoke.
                  </p>
                  <div className="space-y-3 relative">
                    <AnimatePresence>
                      {!isThoughtReleased ? (
                        <motion.textarea
                          key="textarea"
                          exit={{ opacity: 0, filter: 'blur(10px)', y: -10 }}
                          transition={{ duration: 4 }}
                          value={racingThought}
                          onChange={(e) => setRacingThought(e.target.value)}
                          className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs font-mono h-16 resize-none focus:outline-none focus:border-amber-500/50"
                          placeholder="e.g. My heart rate is up because of this algorithmic issue..."
                        />
                      ) : (
                        <motion.div
                          initial={{ opacity: 1 }}
                          animate={{ opacity: [1, 0.4, 0.1, 0] }}
                          transition={{ duration: 4.5 }}
                          className="h-16 text-xs italic font-mono text-amber-200/50 flex items-center justify-center filter blur-[1.5px]"
                        >
                          "{racingThought}" dissipating into silent energy...
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!isThoughtReleased && (
                      <button
                        disabled={!racingThought.trim()}
                        onClick={triggerMistRelease}
                        className="text-[9px] font-black uppercase tracking-wider px-4 py-2 bg-amber-500 text-slate-950 font-mono rounded-lg hover:bg-amber-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        🍃 Release into Cosmos
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Col: Guided Box Breathing Regulator */}
        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
            STUDY BREATHING REGULATOR
          </h3>

          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-between min-h-[360px] text-center relative overflow-hidden">
            
            {/* Ambient Background breathing light */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                animate={{
                  scale: breathingPhase === 'inhale' ? 1.6 : breathingPhase === 'exhale' ? 0.95 : 1.3,
                  opacity: breathingPhase === 'inhale' ? 0.08 : 0.03,
                }}
                transition={{ duration: 4, ease: 'easeInOut' }}
                className={`w-60 h-60 rounded-full blur-[80px] ${
                  breathingPhase === 'inhale' 
                    ? 'bg-amber-500' 
                    : breathingPhase === 'exhale' 
                      ? 'bg-emerald-500' 
                      : 'bg-orange-500'
                }`}
              />
            </div>

            <div>
              <div className="text-[10px] font-black font-mono tracking-wider text-white/20 uppercase">
                Guided Box Breathing
              </div>
              <p className="text-[9px] text-white/40 mt-1 max-w-[200px]">
                Calm the nervous system and build core cognitive clarity
              </p>
            </div>

            {/* Breathing Circle Visualizer */}
            <div className="my-8 relative w-36 h-36 flex items-center justify-center">
              <motion.div
                animate={{
                  scale: breathingPhase === 'inhale' ? 1.25 : breathingPhase === 'exhale' ? 0.85 : 1.1,
                }}
                transition={{ duration: 4, ease: 'easeInOut' }}
                className={`w-32 h-32 rounded-full border flex flex-col items-center justify-center transition-colors duration-[1000ms] ${
                  breathingPhase === 'inhale' 
                    ? 'border-amber-500 bg-amber-500/10' 
                    : breathingPhase === 'exhale' 
                      ? 'border-emerald-500 bg-emerald-500/10' 
                      : 'border-orange-500 bg-orange-500/10'
                }`}
              >
                <div className="text-lg font-black uppercase tracking-widest text-white mt-1">
                  {breathingTimer}
                </div>
                <div className="text-[8px] font-black font-mono tracking-widest text-white/30 uppercase mt-0.5">
                  seconds
                </div>
              </motion.div>

              {/* Ping glow */}
              <span className="absolute inset-0 rounded-full border border-white/5 animate-ping" />
            </div>

            {/* Instruction Readout */}
            <div className="space-y-1">
              <div className={`text-sm font-black uppercase tracking-wider transition-colors ${
                breathingPhase === 'inhale' 
                  ? 'text-amber-400' 
                  : breathingPhase === 'exhale' 
                    ? 'text-emerald-400' 
                    : 'text-orange-400'
              }`}>
                {breathingPhase === 'inhale' && 'Breathe In...'}
                {breathingPhase === 'hold1' && 'Hold Breath...'}
                {breathingPhase === 'exhale' && 'Exhale Slow...'}
                {breathingPhase === 'hold2' && 'Hold Empty...'}
              </div>
              <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
                Cycles completed: {breathCount}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
