import type { Config } from "tailwindcss";
import { THEME } from "./styles/theme";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:           THEME.BACKGROUND,
        'bg-elevated': THEME.BACKGROUND_ELEVATED,
        'bg-panel':   THEME.BACKGROUND_PANEL,
        primary:      THEME.PRIMARY,
        secondary:    THEME.SECONDARY,
        accent:       THEME.ACCENT,
        info:         THEME.INFO,
        warning:      THEME.WARNING,
        border:       THEME.BORDER,
        text:         THEME.TEXT,
        muted:        THEME.TEXT_MUTED,
        error:        THEME.ERROR,
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'monospace'],
        'data': ['var(--font-data)', 'monospace'],
        // legacy aliases so old pixel/vt323 classes still compile without error
        pixel: ['var(--font-mono)', 'monospace'],
        vt323:  ['var(--font-data)', 'monospace'],
      },
      boxShadow: {
        'neon-cyan':    '0 0 6px #00FFFF, 0 0 20px #00FFFF40',
        'neon-magenta': '0 0 6px #FF006E, 0 0 20px #FF006E40',
        'neon-green':   '0 0 6px #00FF41, 0 0 20px #00FF4140',
        'neon-purple':  '0 0 6px #7D00FF, 0 0 20px #7D00FF40',
        'neon-gold':    '0 0 6px #FFD700, 0 0 20px #FFD70040',
        // legacy aliases
        pixel:          '0 0 6px #00FFFF, 0 0 20px #00FFFF40',
        'pixel-yellow': '0 0 6px #FFD700, 0 0 20px #FFD70040',
        'pixel-cyan':   '0 0 6px #00FFFF, 0 0 20px #00FFFF40',
        'pixel-magenta':'0 0 6px #FF006E, 0 0 20px #FF006E40',
        'pixel-green':  '0 0 6px #00FF41, 0 0 20px #00FF4140',
        'pixel-inset':  'inset 0 0 8px rgba(0,255,255,0.15)',
      },
    }
  },
  plugins: [],
};
export default config;
