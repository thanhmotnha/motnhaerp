/**
 * Theme system — light + dark. Import semantic tokens instead of raw COLORS.
 * Use via useTheme() hook from contexts/ThemeContext.
 */

export type ThemeMode = 'light' | 'dark';

export interface Theme {
    mode: ThemeMode;

    // Backgrounds
    bg: string;            // main screen bg
    bgSecondary: string;   // section bg
    bgTertiary: string;    // chip / input bg
    surface: string;       // card bg
    overlay: string;       // modal backdrop

    // Text
    text: string;
    textSecondary: string;
    textMuted: string;
    textOnPrimary: string;

    // Borders
    border: string;
    borderLight: string;

    // Primary
    primary: string;
    primaryLight: string;
    primaryDark: string;
    primaryGradient: readonly [string, string];  // header / hero bg
    primaryGradientSoft: readonly [string, string];  // card highlights

    // Semantic
    success: string;
    successBg: string;
    warning: string;
    warningBg: string;
    danger: string;
    dangerBg: string;
    info: string;
    infoBg: string;

    // Accent (secondary actions)
    accent: string;

    // Elevation
    shadow: {
        sm: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
        md: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
        lg: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
    };

    // Typography
    font: {
        hero: { fontSize: number; fontWeight: '800'; letterSpacing: number };
        title: { fontSize: number; fontWeight: '700' };
        heading: { fontSize: number; fontWeight: '600' };
        body: { fontSize: number; fontWeight: '400' };
        bodyBold: { fontSize: number; fontWeight: '600' };
        caption: { fontSize: number; fontWeight: '400' };
        micro: { fontSize: number; fontWeight: '500' };
    };

    // Spacing / radius
    radius: { sm: number; md: number; lg: number; xl: number; pill: number };
    space: { xs: number; sm: number; md: number; lg: number; xl: number };
}

const typography: Theme['font'] = {
    hero: { fontSize: 32, fontWeight: '800', letterSpacing: 0.5 },
    title: { fontSize: 22, fontWeight: '700' },
    heading: { fontSize: 16, fontWeight: '600' },
    body: { fontSize: 15, fontWeight: '400' },
    bodyBold: { fontSize: 15, fontWeight: '600' },
    caption: { fontSize: 13, fontWeight: '400' },
    micro: { fontSize: 11, fontWeight: '500' },
};

const radius: Theme['radius'] = { sm: 6, md: 10, lg: 16, xl: 24, pill: 999 };
const space: Theme['space'] = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const lightTheme: Theme = {
    mode: 'light',

    bg: '#F8FAFC',
    bgSecondary: '#F1F5F9',
    bgTertiary: '#E2E8F0',
    surface: '#FFFFFF',
    overlay: 'rgba(15, 23, 42, 0.55)',

    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textOnPrimary: '#FFFFFF',

    border: '#E2E8F0',
    borderLight: '#F1F5F9',

    primary: '#1E3A5F',
    primaryLight: '#3B5C87',
    primaryDark: '#132640',
    primaryGradient: ['#1E3A5F', '#2C5282'] as const,
    primaryGradientSoft: ['#EBF2FB', '#DDEBFF'] as const,

    success: '#10B981',
    successBg: '#D1FAE5',
    warning: '#F59E0B',
    warningBg: '#FEF3C7',
    danger: '#EF4444',
    dangerBg: '#FEE2E2',
    info: '#3B82F6',
    infoBg: '#DBEAFE',

    accent: '#E67E22',

    shadow: {
        sm: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
        md: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
        lg: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 8 },
    },

    font: typography, radius, space,
};

export const darkTheme: Theme = {
    mode: 'dark',

    bg: '#0F1115',
    bgSecondary: '#151921',
    bgTertiary: '#1E2230',
    surface: '#1A1F2B',
    overlay: 'rgba(0, 0, 0, 0.75)',

    text: '#F1F5F9',
    textSecondary: '#CBD5E0',
    textMuted: '#64748B',
    textOnPrimary: '#FFFFFF',

    border: '#2A3040',
    borderLight: '#20242F',

    primary: '#4F7FBA',
    primaryLight: '#6B97D4',
    primaryDark: '#3B6396',
    primaryGradient: ['#1A2B45', '#2A4A7A'] as const,
    primaryGradientSoft: ['#1A2130', '#1E2B40'] as const,

    success: '#34D399',
    successBg: '#064E3B',
    warning: '#FBBF24',
    warningBg: '#78350F',
    danger: '#F87171',
    dangerBg: '#7F1D1D',
    info: '#60A5FA',
    infoBg: '#1E3A8A',

    accent: '#FB923C',

    shadow: {
        sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 1 },
        md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 3 },
        lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 8 },
    },

    font: typography, radius, space,
};
