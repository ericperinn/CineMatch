export const theme = {
  colors: {
    background: '#020617',
    // Tiered translucent surfaces, low to high contrast against the bg.
    surface: 'rgba(148,163,184,0.09)',
    surfaceHighlight: 'rgba(148,163,184,0.22)',
    surfaceStrong: 'rgba(148,163,184,0.32)',
    border: 'rgba(148,163,184,0.20)',
    borderStrong: 'rgba(148,163,184,0.32)',
    primary: '#a3e635', // Lime green brand accent
    primaryDark: '#0b1a02',
    primarySoft: 'rgba(163,230,53,0.16)',
    primarySofter: 'rgba(163,230,53,0.10)',
    text: '#ffffff',
    textMuted: '#94a3b8',
    textSubtle: '#64748b',
    error: '#ef4444',
    errorSoft: 'rgba(239,68,68,0.14)',
    success: '#22c55e',
    warning: '#f59e0b',
  },
  typography: {
    fontFamily: {
      sans: 'Urbanist, sans-serif',
      mono: 'JetBrains Mono, monospace',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  }
};
