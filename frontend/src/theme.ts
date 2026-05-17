// ─── LinguScan Design System ─────────────────────────────────────────────────
// Palette: #28396C (navy bg) · #B5E18B (sage green) · #F0FFC2 (lime) · #EAE6BC (cream)

export const colors = {
  // Background layers (very dark navy, close to black)
  bg: '#080C16',
  surface: '#0B1120',
  surfaceHigh: '#0F172A',
  surfaceActive: '#141E36',

  // Primary accent — sage green
  primary: '#B5E18B',
  primaryDim: 'rgba(181,225,139,0.18)',
  primaryHover: '#C5EDA0',

  // Secondary — light lime
  secondary: '#F0FFC2',
  secondaryDim: 'rgba(240,255,194,0.14)',

  // Tertiary — warm cream / beige
  tertiary: '#EAE6BC',
  tertiaryDim: 'rgba(234,230,188,0.14)',

  // State colors
  success: '#B5E18B',
  successDim: 'rgba(181,225,139,0.18)',

  warning: '#EAE6BC',
  warningDim: 'rgba(234,230,188,0.18)',

  danger: '#FF6B6B',
  dangerDim: 'rgba(255,107,107,0.18)',

  // Deck cover colors
  covers: [
    '#B5E18B', '#F0FFC2', '#EAE6BC', '#6B8ED6',
    '#A0C4FF', '#8BCCE1', '#E1C88B', '#C88BE1',
  ],

  // Text
  textPrimary: '#F0FFC2',      // light lime — high contrast on navy
  textSecondary: '#B5E18B',    // sage green
  textMuted: '#7A9CC0',        // muted blue-gray

  // Borders
  border: 'rgba(240,255,194,0.12)',
  borderActive: 'rgba(181,225,139,0.30)',
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  full: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
  h1: { fontSize: 28, fontWeight: '800' as const, color: colors.textPrimary },
  h2: { fontSize: 22, fontWeight: '700' as const, color: colors.textPrimary },
  h3: { fontSize: 18, fontWeight: '700' as const, color: colors.textPrimary },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.textPrimary },
  bodyBold: { fontSize: 15, fontWeight: '600' as const, color: colors.textPrimary },
  caption: { fontSize: 12, fontWeight: '500' as const, color: colors.textMuted },
  label: {
    fontSize: 11, fontWeight: '700' as const,
    color: colors.textMuted, letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
};

export const spring = {
  snappy: { type: 'spring', stiffness: 400, damping: 30 },
  gentle: { type: 'spring', stiffness: 200, damping: 25 },
  bouncy: { type: 'spring', stiffness: 300, damping: 18 },
};

export const shadows = {
  card: '0 4px 24px rgba(0,0,0,0.35)',
  glow: (color: string) => `0 0 24px ${color}40`,
  float: '0 8px 32px rgba(0,0,0,0.5)',
};
