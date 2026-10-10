export const API_BASE_URL = 'https://placement-guide.onrender.com';

export const APP_NAME = 'CampusBridge';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'cb_secure_jwt_token',
  USER_DATA: 'cb_cached_user_profile',
  REMEMBER_EMAIL: 'cb_remember_email',
  BIOMETRIC_ENABLED: 'cb_biometric_enabled',
  COMPLAINT_DRAFTS: 'cb_offline_complaint_drafts',
} as const;

export const SUPPORTED_MOBILE_ROLES = ['student', 'faculty', 'hod', 'principal', 'director'] as const;


export const THEME = {
  colors: {
    primary: '#4F46E5', // Indigo primary
    primaryHover: '#4338CA',
    primaryLight: '#EEF2FF',
    accent: '#06B6D4',
    background: '#0F172A', // Slate 900 dark background
    surface: '#1E293B',    // Slate 800 card surface
    surfaceLight: '#334155', // Slate 700 border/input
    text: '#F8FAFC',       // Slate 50
    textMuted: '#94A3B8',  // Slate 400
    border: '#334155',
    error: '#EF4444',
    errorBg: 'rgba(239, 68, 68, 0.1)',
    success: '#10B981',
    successBg: 'rgba(16, 185, 129, 0.1)',
    warning: '#F59E0B',
  },
  typography: {
    title: 24,
    subtitle: 18,
    body: 15,
    caption: 13,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 16,
    full: 9999,
  },
} as const;
