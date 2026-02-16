// Koinonia — Warm, calm, Spirit-led colors
// Inspired by candlelight, parchment, olive wood, and the warmth of fellowship

export const KoinoniaColors = {
  // Primary — Warm gold (the light of the Word)
  primary: '#C8902E',
  primaryLight: '#E0B564',
  primaryDark: '#9A6D1F',

  // Secondary — Deep wine/burgundy (communion, fellowship)
  secondary: '#7B2D3B',
  secondaryLight: '#A34D5E',
  secondaryDark: '#5C1F2B',

  // Accent — Olive/sage green (peace, growth, the olive branch)
  accent: '#7A8B5C',
  accentLight: '#9DAE82',
  accentDark: '#5B6A40',

  // Backgrounds
  cream: '#FAF5EB',        // warm parchment
  warmWhite: '#FFF9F0',    // soft warm white
  sand: '#F0E6D3',         // sandy warm tone

  // Text
  darkBrown: '#3B2A1A',    // primary text
  warmGray: '#6B5E52',     // secondary text
  lightText: '#FAF5EB',    // text on dark backgrounds

  // Surfaces
  cardBg: '#FFFCF5',       // card backgrounds
  border: '#E5D9C9',       // soft borders
  divider: '#EDE4D6',      // dividers

  // Feedback
  success: '#6B8F4E',      // gentle green
  error: '#B34040',        // soft red
  warning: '#D4943A',      // warm amber
};

export default {
  light: {
    text: KoinoniaColors.darkBrown,
    secondaryText: KoinoniaColors.warmGray,
    background: KoinoniaColors.warmWhite,
    surface: KoinoniaColors.cardBg,
    tint: KoinoniaColors.primary,
    border: KoinoniaColors.border,
    tabIconDefault: KoinoniaColors.warmGray,
    tabIconSelected: KoinoniaColors.primary,
  },
  dark: {
    text: KoinoniaColors.lightText,
    secondaryText: '#B8A99A',
    background: '#1A1410',
    surface: '#2A221A',
    tint: KoinoniaColors.primaryLight,
    border: '#3D3229',
    tabIconDefault: '#7A6E62',
    tabIconSelected: KoinoniaColors.primaryLight,
  },
};
