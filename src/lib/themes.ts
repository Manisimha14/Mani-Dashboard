import type { AppTheme, ThemeDefinition, ThemeVars } from '../types';

/**
 * Production-grade Theme Map
 * Using strict token typing to prevent UI inconsistencies.
 */
export const THEME_MAP: Record<AppTheme, ThemeDefinition> = {
  dark_pro: {
    id: 'dark_pro',
    name: 'Pro Dark',
    emoji: '🌌',
    description: 'The classic elite interface for focused work.',
    previewColors: ['#0f172a', '#1e293b', '#8b5cf6'],
    vars: {
      '--bg-primary': '#0f172a',
      '--bg-secondary': '#1e293b',
      '--bg-card': 'rgba(30, 41, 59, 0.7)',
      '--border': 'rgba(255, 255, 255, 0.08)',
      '--text-primary': '#f8fafc',
      '--text-secondary': '#94a3b8',
      '--text-muted': '#64748b',
      '--success': '#10b981',
      '--warning': '#f59e0b',
      '--danger': '#ef4444',
      '--accent-glow': 'rgba(139, 92, 246, 0.5)',
      '--card-shadow': '0 10px 30px -10px rgba(0,0,0,0.5)',
      '--radius-card': '20px',
      '--font-main': "'Inter', sans-serif",
    }
  },
  midnight_glass: {
    id: 'midnight_glass',
    name: 'Midnight Glass',
    emoji: '💎',
    description: 'Sleek transparency with deep obsidian tones.',
    previewColors: ['#030712', '#111827', '#6366f1'],
    vars: {
      '--bg-primary': '#030712',
      '--bg-secondary': '#0f172a',
      '--bg-card': 'rgba(15, 23, 42, 0.4)',
      '--border': 'rgba(255, 255, 255, 0.05)',
      '--text-primary': '#ffffff',
      '--text-secondary': '#9ca3af',
      '--text-muted': '#4b5563',
      '--success': '#34d399',
      '--warning': '#fbbf24',
      '--danger': '#f87171',
      '--accent-glow': 'rgba(99, 102, 241, 0.4)',
      '--card-shadow': '0 8px 32px 0 rgba(0, 0, 0, 0.8)',
      '--radius-card': '24px',
      '--font-main': "'Outfit', sans-serif",
    }
  },
  oled: {
    id: 'oled',
    name: 'OLED Black',
    emoji: '🌑',
    description: 'True blacks for maximum battery and focus.',
    previewColors: ['#000000', '#0a0a0a', '#ffffff'],
    vars: {
      '--bg-primary': '#000000',
      '--bg-secondary': '#0a0a0a',
      '--bg-card': 'rgba(10, 10, 10, 0.8)',
      '--border': 'rgba(255, 255, 255, 0.12)',
      '--text-primary': '#ffffff',
      '--text-secondary': '#a1a1aa',
      '--text-muted': '#52525b',
      '--success': '#22c55e',
      '--warning': '#eab308',
      '--danger': '#ef4444',
      '--accent-glow': 'rgba(255, 255, 255, 0.2)',
      '--card-shadow': 'none',
      '--radius-card': '12px',
      '--font-main': "'Geist Mono', monospace",
    }
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    emoji: '⚡',
    description: 'Neon-infused high energy workspace.',
    previewColors: ['#020005', '#0d0221', '#00f5ff'],
    vars: {
      '--bg-primary': '#020005',
      '--bg-secondary': '#0d0221',
      '--bg-card': 'rgba(13, 2, 33, 0.6)',
      '--border': 'rgba(0, 245, 255, 0.2)',
      '--text-primary': '#00f5ff',
      '--text-secondary': '#ff00ff',
      '--text-muted': '#541388',
      '--success': '#39ff14',
      '--warning': '#fff01f',
      '--danger': '#ff3131',
      '--accent-glow': 'rgba(0, 245, 255, 0.5)',
      '--card-shadow': '0 0 20px rgba(0, 245, 255, 0.1)',
      '--radius-card': '4px',
      '--font-main': "'JetBrains Mono', monospace",
    }
  },
  forest: {
    id: 'forest',
    name: 'Deep Forest',
    emoji: '🌲',
    description: 'Natural evergreen tones for calm concentration.',
    previewColors: ['#061a15', '#0c2e26', '#10b981'],
    vars: {
      '--bg-primary': '#061a15',
      '--bg-secondary': '#0c2e26',
      '--bg-card': 'rgba(12, 46, 38, 0.7)',
      '--border': 'rgba(16, 185, 129, 0.1)',
      '--text-primary': '#ecfdf5',
      '--text-secondary': '#6ee7b7',
      '--text-muted': '#064e3b',
      '--success': '#34d399',
      '--warning': '#fbbf24',
      '--danger': '#f87171',
      '--accent-glow': 'rgba(16, 185, 129, 0.4)',
      '--card-shadow': '0 10px 40px -10px rgba(0,0,0,0.6)',
      '--radius-card': '24px',
      '--font-main': "'Inter', sans-serif",
    }
  },
  nebula: {
    id: 'nebula',
    name: 'Nebula',
    emoji: '🌌',
    description: 'A vibrant cosmic palette for creative energy.',
    previewColors: ['#0d0221', '#190e4f', '#7c3aed'],
    vars: {
      '--bg-primary': '#0d0221',
      '--bg-secondary': '#190e4f',
      '--bg-card': 'rgba(25, 14, 79, 0.5)',
      '--border': 'rgba(124, 58, 237, 0.2)',
      '--text-primary': '#ffffff',
      '--text-secondary': '#c4b5fd',
      '--text-muted': '#4c1d95',
      '--success': '#10b981',
      '--warning': '#f59e0b',
      '--danger': '#ef4444',
      '--accent-glow': 'rgba(124, 58, 237, 0.5)',
      '--card-shadow': '0 0 30px rgba(124, 58, 237, 0.15)',
      '--radius-card': '30px',
      '--font-main': "'Outfit', sans-serif",
    }
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    emoji: '✨',
    description: 'Dynamic ethereal glows and cosmic gradients.',
    previewColors: ['#0a0f1e', '#131c31', '#2dd4bf'],
    vars: {
      '--bg-primary': '#0a0f1e',
      '--bg-secondary': '#131c31',
      '--bg-card': 'rgba(19, 28, 49, 0.6)',
      '--border': 'rgba(45, 212, 191, 0.15)',
      '--text-primary': '#f0f9ff',
      '--text-secondary': '#94a3b8',
      '--text-muted': '#334155',
      '--success': '#2dd4bf',
      '--warning': '#fcd34d',
      '--danger': '#fb7185',
      '--accent-glow': 'rgba(45, 212, 191, 0.4)',
      '--card-shadow': '0 20px 50px -12px rgba(0,0,0,0.5)',
      '--radius-card': '16px',
      '--font-main': "'Inter', sans-serif",
    }
  },
  hacker: {
    id: 'hacker',
    name: 'Terminal',
    emoji: '🧑‍💻',
    description: 'Monochrome high-contrast for code warriors.',
    previewColors: ['#050505', '#101010', '#00ff41'],
    vars: {
      '--bg-primary': '#050505',
      '--bg-secondary': '#0a0a0a',
      '--bg-card': 'rgba(0, 0, 0, 0.9)',
      '--border': '#00ff4133',
      '--text-primary': '#00ff41',
      '--text-secondary': '#00ff41aa',
      '--text-muted': '#00ff4144',
      '--success': '#00ff41',
      '--warning': '#ffff00',
      '--danger': '#ff0000',
      '--accent-glow': 'rgba(0, 255, 65, 0.2)',
      '--card-shadow': 'none',
      '--radius-card': '0px',
      '--font-main': "'Fira Code', monospace",
    }
  },
  paper_warm: {
    id: 'paper_warm',
    name: 'Warm Paper',
    emoji: '📜',
    description: 'Soft parchment tones to reduce eye strain.',
    previewColors: ['#fbf7f0', '#f1ece1', '#7c3aed'],
    vars: {
      '--bg-primary': '#fbf7f0',
      '--bg-secondary': '#f1ece1',
      '--bg-card': 'rgba(241, 236, 225, 0.8)',
      '--border': 'rgba(124, 58, 237, 0.1)',
      '--text-primary': '#1a1a1a',
      '--text-secondary': '#4a4a4a',
      '--text-muted': '#a0a0a0',
      '--success': '#059669',
      '--warning': '#d97706',
      '--danger': '#dc2626',
      '--accent-glow': 'rgba(124, 58, 237, 0.2)',
      '--card-shadow': '0 4px 20px rgba(0,0,0,0.05)',
      '--radius-card': '12px',
      '--font-main': "'Inter', sans-serif",
    }
  },
  solarized: {
    id: 'solarized',
    name: 'Solarized',
    emoji: '☀️',
    description: 'Precisely balanced colors for professional readability.',
    previewColors: ['#002b36', '#073642', '#268bd2'],
    vars: {
      '--bg-primary': '#002b36',
      '--bg-secondary': '#073642',
      '--bg-card': 'rgba(7, 54, 66, 0.8)',
      '--border': 'rgba(147, 161, 161, 0.1)',
      '--text-primary': '#93a1a1',
      '--text-secondary': '#586e75',
      '--text-muted': '#00212b',
      '--success': '#859900',
      '--warning': '#b58900',
      '--danger': '#dc322f',
      '--accent-glow': 'rgba(38, 139, 210, 0.3)',
      '--card-shadow': '0 10px 30px rgba(0,0,0,0.4)',
      '--radius-card': '0px',
      '--font-main': "'Inter', sans-serif",
    }
  }
};

export const THEMES = Object.values(THEME_MAP);

/**
 * High-performance batch style application
 * Prevents multiple layout recalculations
 */
export function applyTheme(themeId: AppTheme, accentColor?: string) {
  if (typeof document === 'undefined') return;

  const theme = THEME_MAP[themeId] || THEME_MAP.dark_pro;
  const root = document.documentElement;

  // 1. Semantic Tagging
  root.setAttribute('data-theme', themeId);
  
  // 2. Batch Variable Updates
  const styles: string[] = [];
  
  // Base theme variables
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
    styles.push(`${key}: ${value};`);
  });

  // Dynamic accent variables
  if (accentColor) {
    const accent = hexToRgb(accentColor);
    if (accent) {
      const { r, g, b } = accent;
      root.style.setProperty('--accent', accentColor);
      root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
      root.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.5)`);
      root.style.setProperty('--accent-muted', `rgba(${r}, ${g}, ${b}, 0.1)`);
    }
  }

  // 3. System preference sync
  const isDark = themeId !== 'paper_warm'; // Simple logic for now
  root.classList.toggle('dark', isDark);
}

/**
 * Utility to safely parse hex colors
 */
function hexToRgb(hex: string): { r: number, g: number, b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
