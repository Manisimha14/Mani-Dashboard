// ─── Theme Definitions ───────────────────────────────────────────────────────
export type ThemeId =
  | 'dark_pro'
  | 'oled'
  | 'cyberpunk'
  | 'forest'
  | 'nebula'
  | 'retro';

export interface Theme {
  id: ThemeId;
  name: string;
  emoji: string;
  description: string;
  vars: Record<string, string>;
}

export const THEMES: Theme[] = [
  {
    id: 'dark_pro',
    name: 'Pro Dark',
    emoji: '🌌',
    description: 'Clean, professional dark mode',
    vars: {
      '--bg-primary': '#0a0b14',
      '--bg-secondary': '#0f111a',
      '--bg-card': 'rgba(255,255,255,0.03)',
      '--border': 'rgba(255,255,255,0.08)',
      '--text-primary': '#ffffff',
      '--text-secondary': 'rgba(255,255,255,0.6)',
      '--text-muted': 'rgba(255,255,255,0.4)',
    },
  },
  {
    id: 'oled',
    name: 'OLED Black',
    emoji: '🌑',
    description: 'Absolute black for focus and power',
    vars: {
      '--bg-primary': '#000000',
      '--bg-secondary': '#050505',
      '--bg-card': 'rgba(255,255,255,0.02)',
      '--border': 'rgba(255,255,255,0.1)',
      '--text-primary': '#ffffff',
      '--text-secondary': 'rgba(255,255,255,0.5)',
      '--text-muted': 'rgba(255,255,255,0.3)',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    emoji: '⚡',
    description: 'Neon highlights and glitches',
    vars: {
      '--bg-primary': '#020005',
      '--bg-secondary': '#0a001a',
      '--bg-card': 'rgba(255,0,255,0.05)',
      '--border': 'rgba(0,255,255,0.2)',
      '--text-primary': '#00f5ff',
      '--text-secondary': '#ff00ff',
      '--text-muted': 'rgba(0,245,255,0.4)',
    },
  },
  {
    id: 'forest',
    name: 'Emerald Forest',
    emoji: '🌲',
    description: 'Calming greens and wood tones',
    vars: {
      '--bg-primary': '#040d08',
      '--bg-secondary': '#081a10',
      '--bg-card': 'rgba(16,185,129,0.05)',
      '--border': 'rgba(16,185,129,0.2)',
      '--text-primary': '#ecfdf5',
      '--text-secondary': '#6ee7b7',
      '--text-muted': '#065f46',
    },
  },
  {
    id: 'nebula',
    name: 'Cosmic Nebula',
    emoji: '🪐',
    description: 'Deep purples and cosmic dust',
    vars: {
      '--bg-primary': '#0a001a',
      '--bg-secondary': '#150030',
      '--bg-card': 'rgba(139,92,246,0.08)',
      '--border': 'rgba(139,92,246,0.2)',
      '--text-primary': '#f5f3ff',
      '--text-secondary': '#a78bfa',
      '--text-muted': '#5b21b6',
    },
  },
];

export function applyTheme(themeId: ThemeId, accentColor?: string) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const root = document.documentElement;
  
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  
  if (accentColor) {
    root.style.setProperty('--accent', accentColor);
    // Calculate light version (simple opacity or brighten)
    root.style.setProperty('--accent-light', `${accentColor}cc`);
    root.style.setProperty('--glow', `${accentColor}33`);
  }
  
  root.setAttribute('data-theme', themeId);
}
