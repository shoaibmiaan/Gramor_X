import { env } from '@/lib/env';

type PkcePair = {
  verifier: string;
  challenge: string;
  method: 'plain' | 's256';
};

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
const VERIFIER_LENGTH = 56;

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || null;
}

export function getPkceStorageKey() {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return null;
  try {
    const host = new URL(supabaseUrl).hostname;
    const projectRef = host.split('.')[0] ?? '';
    if (!projectRef) return null;
    return `sb-${projectRef}-auth-token`;
  } catch {
    return null;
  }
}

export function getPkceVerifierStorageKey() {
  const base = getPkceStorageKey();
  return base ? `${base}-code-verifier` : null;
}

export function readStoredPkceVerifier() {
  if (typeof window === 'undefined') return null;
  const key = getPkceVerifierStorageKey();
  if (!key) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storePkceVerifier(verifier: string) {
  if (typeof window === 'undefined') return;
  const key = getPkceVerifierStorageKey();
  if (!key) return;
  try {
    window.localStorage.setItem(key, verifier);
  } catch {
    // ignore storage failures
  }
}

function generateRandomValues(length: number) {
  if (
    typeof window !== 'undefined' &&
    typeof window.crypto !== 'undefined' &&
    typeof window.crypto.getRandomValues === 'function'
  ) {
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, (v) => v % CHARSET.length);
  }
  return Array.from({ length }, () => Math.floor(Math.random() * CHARSET.length));
}

export function generatePkceVerifier(length = VERIFIER_LENGTH) {
  const randomIndices = generateRandomValues(length);
  return randomIndices.map((index) => CHARSET.charAt(index)).join('');
}

async function sha256(input: string) {
  if (typeof window === 'undefined' || typeof window.crypto === 'undefined' || !window.crypto.subtle) {
    return input;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(digest));
  const binary = bytes.map((b) => String.fromCharCode(b)).join('');
  return window.btoa(binary);
}

export async function buildPkcePair(): Promise<PkcePair> {
  const verifier = generatePkceVerifier();
  storePkceVerifier(verifier);
  const hashed = await sha256(verifier);
  const challenge = hashed
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const method = hashed === verifier ? 'plain' : 's256';
  return { verifier, challenge, method };
}

export type PkceSignupRequest = {
  email: string;
  password: string;
  redirectTo: string;
  data?: Record<string, any>;
  codeChallenge: string;
  codeChallengeMethod: 'plain' | 's256';
};

export async function submitPkceSignup({
  email,
  password,
  redirectTo,
  data,
  codeChallenge,
  codeChallengeMethod,
}: PkceSignupRequest) {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/signup`;
  const url = new URL(endpoint);
  url.searchParams.set('redirect_to', redirectTo);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({
      email,
      password,
      data: data ?? {},
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload?.error_description ||
      payload?.msg ||
      payload?.message ||
      payload?.error ||
      'Unable to sign up. Please try again.';
    const error = new Error(message);
    (error as any).code = payload?.code ?? response.status;
    throw error;
  }

  return payload;
}

export async function exchangeCodeWithVerifier(authCode: string, codeVerifier: string) {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=pkce`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({ auth_code: authCode, code_verifier: codeVerifier }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error_description || payload?.msg || payload?.message || payload?.error;
    throw new Error(message || 'Failed to exchange auth code.');
  }

  return payload;
}
