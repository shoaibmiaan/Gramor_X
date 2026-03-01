/**
 * Central route constants – use these everywhere to avoid magic strings.
 * Update this file when adding or renaming routes.
 */

// Public routes
export const HOME = '/';
export const LOGIN = '/login';
export const SIGNUP = '/signup';
export const FORGOT_PASSWORD = '/auth/forgot';
export const RESET_PASSWORD = '/auth/reset';
export const VERIFY_EMAIL = '/auth/callback';
export const CALLBACK = '/auth/callback';
export const MFA = '/auth/mfa';

// Onboarding (post‑signup)
export const ONBOARDING = '/onboarding';

// Dashboard / app
export const DASHBOARD = '/dashboard';

// Legal
export const TERMS = '/legal/terms';
export const PRIVACY = '/legal/privacy';

// Helper to build a URL with query parameters (optional)
export const withQuery = (base: string, params: Record<string, string | number | boolean>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `${base}?${queryString}` : base;
};