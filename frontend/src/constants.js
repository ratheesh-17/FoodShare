/**
 * FoodShare Design System Constants
 * Professional color palette, spacing, and typography standards
 */

// ── Color Palette ────────────────────────────────────────────
export const COLORS = {
  // Primary (Teal/Emerald)
  primary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },

  // Semantic colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Neutrals
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Status colors for roles
  role: {
    donor: '#3b82f6',    // Blue
    ngo: '#10b981',      // Green
    volunteer: '#8b5cf6', // Purple
    admin: '#ef4444',    // Red
  },
};

// ── Spacing Scale ───────────────────────────────────────────
export const SPACING = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '2.5rem', // 40px
  '3xl': '3rem',   // 48px
};

// ── Typography ───────────────────────────────────────────────
export const TYPOGRAPHY = {
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
};

// ── Border Radius ───────────────────────────────────────────
export const BORDER_RADIUS = {
  sm: '0.375rem',   // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  full: '9999px',
};

// ── Shadows ──────────────────────────────────────────────────
export const SHADOWS = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

// ── Transitions ──────────────────────────────────────────────
export const TRANSITIONS = {
  fast: 'all 0.15s ease-in-out',
  base: 'all 0.2s ease-in-out',
  slow: 'all 0.3s ease-in-out',
};

// ── Z-Index Stack ───────────────────────────────────────────
export const ZINDEX = {
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
};

// ── Status Badges ───────────────────────────────────────────
export const STATUS_BADGES = {
  posted: { bg: '#fef3c7', text: '#92400e', icon: '📝' },
  claimed: { bg: '#dbeafe', text: '#1e40af', icon: '✓' },
  assigned: { bg: '#e0e7ff', text: '#3730a3', icon: '👤' },
  completed: { bg: '#dcfce7', text: '#15803d', icon: '🎉' },
  expired: { bg: '#fee2e2', text: '#7f1d1d', icon: '❌' },
};

// ── Donation food types ──────────────────────────────────────
export const FOOD_TYPES = {
  cooked: { label: 'Cooked', emoji: '🍛', color: '#f97316' },
  raw: { label: 'Raw', emoji: '🥬', color: '#22c55e' },
  packaged: { label: 'Packaged', emoji: '📦', color: '#3b82f6' },
  event: { label: 'Event Catering', emoji: '🍽️', color: '#8b5cf6' },
};

// ── API Constants ────────────────────────────────────────────
export const API = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  endpoints: {
    auth: {
      register: '/users/register',
      login: '/users/login',
      adminLogin: '/users/admin-login',
      adminVerifyOTP: '/users/admin-verify-otp',
      profile: '/users/profile',
    },
    donations: {
      list: '/donations',
      create: '/donations',
      nearby: '/donations/nearby',
      claim: (id) => `/donations/${id}/claim`,
      assign: (id, volId) => `/donations/${id}/assign/${volId}`,
      complete: (id) => `/donations/${id}/complete`,
      lifecycle: (id) => `/donations/${id}/lifecycle`,
      notifications: '/donations/stream/notifications',
    },
    ai: {
      chat: '/ai/chat',
    },
  },
};

// ── Form Validation Rules ────────────────────────────────────
export const VALIDATION = {
  email: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  password: {
    min: 6,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  },
  phone: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
  otp: /^\d{6}$/,
};

// ── Error Messages ───────────────────────────────────────────
export const ERROR_MESSAGES = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  password: {
    short: 'Password must be at least 6 characters',
    weak: 'Password must contain uppercase, lowercase, and numbers',
  },
  phone: 'Please enter a valid phone number',
  otp: 'Please enter a 6-digit OTP',
  network: 'Network error. Please check your connection.',
  server: 'Server error. Please try again later.',
};

export default {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  BORDER_RADIUS,
  SHADOWS,
  TRANSITIONS,
  ZINDEX,
  STATUS_BADGES,
  FOOD_TYPES,
  API,
  VALIDATION,
  ERROR_MESSAGES,
};
