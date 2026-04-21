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

    bg: '#F4F6FA',
    bgSecondary: '#FFFFFF',
    bgTertiary: '#F0F4FA',
    surface: '#FFFFFF',
    overlay: 'rgba(15, 23, 42, 0.55)',

    text: '#1A202C',
    textSecondary: '#4A5568',
    textMuted: '#6B7280',
    textOnPrimary: '#FFFFFF',

    border: '#E2E8F0',
    borderLight: 'rgba(0, 0, 0, 0.05)',

    // MỘT NHÀ Brand: Navy #234093 + Gold #DBB35E
    primary: '#234093',
    primaryLight: '#2D5CA3',
    primaryDark: '#1D3580',
    primaryGradient: ['#234093', '#2D5CA3'] as const,
    primaryGradientSoft: ['#E8EEF8', '#DDE6F5'] as const,

    success: '#38A169',
    successBg: '#D1FAE5',
    warning: '#D69E2E',
    warningBg: '#FEF3C7',
    danger: '#E53E3E',
    dangerBg: '#FEE2E2',
    info: '#2B6CB0',
    infoBg: '#DBEAFE',

    accent: '#DBB35E',  // Gold brand color

    shadow: {
        sm: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
        md: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
        lg: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 8 },
    },

    font: typography, radius, space,
};

export const darkTheme: Theme = {
    mode: 'dark',

    bg: '#080E1C',
    bgSecondary: '#0F1729',
    bgTertiary: '#111E36',
    surface: '#111E36',
    overlay: 'rgba(0, 0, 0, 0.75)',

    text: '#EDF2F7',
    textSecondary: '#94A3B8',
    textMuted: '#4A5568',
    textOnPrimary: '#FFFFFF',

    border: '#1C2E4A',
    borderLight: 'rgba(255, 255, 255, 0.05)',

    // Brand navy lighter for dark mode
    primary: '#4A90D9',
    primaryLight: '#6BA8E5',
    primaryDark: '#2D5CA3',
    primaryGradient: ['#234093', '#2D5CA3'] as const,
    primaryGradientSoft: ['#162440', '#1A2C4F'] as const,

    success: '#48BB78',
    successBg: '#064E3B',
    warning: '#ECC94B',
    warningBg: '#78350F',
    danger: '#FC8181',
    dangerBg: '#7F1D1D',
    info: '#63B3ED',
    infoBg: '#1E3A8A',

    accent: '#DBB35E',  // Gold brand color

    shadow: {
        sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 1 },
        md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 3 },
        lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 8 },
    },

    font: typography, radius, space,
};
