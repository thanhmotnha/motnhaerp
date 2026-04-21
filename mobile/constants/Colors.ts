// MỘT NHÀ Mobile - Exact colors from Stitch project "Nhật ký thi công"
// Source: stitch-designs/01_trangchu.html tailwind.config
//
// primary: #234195  (Royal Navy Blue)
// accent:  #C5A059  (Gold/Amber)
// bg:      #f6f6f8  (Light gray)
// dark bg: #13161f
// font:    Inter
// radius:  1rem (16px) default, 2rem lg, 3rem xl

const brandColors = {
  primary: '#234195',
  primaryDark: '#1a2f6e',
  primaryLight: '#2d51b3',
  accent: '#C5A059',
  accentLight: '#d4b574',

  bg: '#f6f6f8',
  bgGradientStart: '#f8f9fc',
  bgGradientEnd: '#eef1f8',
  card: '#ffffff',
  text: '#0f172a',           // slate-900
  textSecondary: '#64748b',  // slate-500
  textMuted: '#94a3b8',      // slate-400
  border: '#e2e8f0',         // slate-200

  success: '#22c55e',        // green-500
  warning: '#eab308',
  danger: '#ef4444',
  info: '#3b82f6',

  // Skeleton
  skeletonBase: '#e8ecf4',
  skeletonHighlight: '#f3f5fa',

  // Borders
  borderP5: 'rgba(35,65,149,0.05)',
  borderP10: 'rgba(35,65,149,0.1)',
  borderP15: 'rgba(35,65,149,0.15)',
};

// Shared shadow for ALL cards — Agent 5: QA consistency
export const cardShadow = {
  shadowColor: '#1a2f6e',
  shadowOpacity: 0.06,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

// Radius tokens
export const radius = { card: 16, button: 12, pill: 9999, iconBox: 14 };

// Font weight tokens
export const fontWeight = {
  body: '400' as const,
  label: '500' as const,
  secondary: '600' as const,
  title: '700' as const,
};

export default {
  light: {
    ...brandColors,
    background: brandColors.bg,
    tint: brandColors.primary,
    tabIconDefault: '#94a3b8',
    tabIconSelected: brandColors.primary,
  },
  dark: {
    ...brandColors,
    text: '#f1f5f9',               // slate-100 (override)
    background: '#13161f',
    tint: brandColors.primary,
    tabIconDefault: '#64748b',     // slate-500
    tabIconSelected: brandColors.primary,
    bg: '#13161f',
    card: '#1e293b',               // slate-800
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    border: '#334155',             // slate-700
  },
};
