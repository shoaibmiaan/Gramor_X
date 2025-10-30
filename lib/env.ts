// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Public (client) vars
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES: z.coerce.number().default(30),
  NEXT_PUBLIC_DEBUG: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),

  // Feature flags (client)
  NEXT_PUBLIC_FEATURE_TRIAL: z.string().optional(),
  NEXT_PUBLIC_FEATURE_PAYWALL: z.string().optional(),
  NEXT_PUBLIC_FEATURE_REFERRAL: z.string().optional(),
  NEXT_PUBLIC_FEATURE_PARTNER: z.string().optional(),
  NEXT_PUBLIC_FEATURE_PREDICTOR: z.string().optional(),
  NEXT_PUBLIC_FEATURE_CHALLENGE: z.string().optional(),
  NEXT_PUBLIC_FEATURE_AI_COACH: z.string().optional(),
  NEXT_PUBLIC_FEATURE_STUDY_BUDDY: z.string().optional(),
  NEXT_PUBLIC_FEATURE_MISTAKES_BOOK: z.string().optional(),
  NEXT_PUBLIC_FEATURE_WHATSAPP_TASKS: z.string().optional(),
  NEXT_PUBLIC_FEATURE_FLOATING_WIDGET: z.string().optional(),
  NEXT_PUBLIC_FEATURE_COACH: z.string().optional(),
  NEXT_PUBLIC_FEATURE_NOTIFICATIONS: z.string().optional(),
  NEXT_PUBLIC_FEATURE_QUICK_TEN: z.string().optional(),
  NEXT_PUBLIC_FEATURE_AI_ASSIST: z.string().optional(),
  NEXT_PUBLIC_PUSH_PUBLIC_KEY: z.string().optional(),

  // Optional analytics/monitoring
  NEXT_PUBLIC_GA4_ID: z.string().optional(),
  NEXT_PUBLIC_META_PIXEL_ID: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),

  // Optional client-side toggles/util
  NEXT_PUBLIC_TWILIO_BYPASS: z.string().optional(),
  NEXT_PUBLIC_PAYMENTS_PROVIDER: z.enum(['none', 'stripe', 'easypaisa', 'jazzcash', 'crypto']).optional(),

  // Server-only vars (required in prod)
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  REVIEW_SHARE_SECRET: z.string().optional(),
  REVIEW_SHARE_TTL_HOURS: z.coerce.number().optional(),

  ADMIN_EMAILS: z.string().optional(),

  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GX_AI_PROVIDER: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),

  PREMIUM_MASTER_PIN: z.string().optional(),
  PREMIUM_PIN_HASH: z.string().optional(),
  PREMIUM_PIN_SALT: z.string().optional(),
  PREMIUM_PIN_RATE: z.coerce.number().optional(),
  PREMIUM_PIN_WINDOW_SEC: z.coerce.number().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER_MONTHLY: z.string().optional(),
  STRIPE_PRICE_STARTER_ANNUAL: z.string().optional(),
  STRIPE_PRICE_BOOSTER_MONTHLY: z.string().optional(),
  STRIPE_PRICE_BOOSTER_ANNUAL: z.string().optional(),
  STRIPE_PRICE_MASTER_MONTHLY: z.string().optional(),
  STRIPE_PRICE_MASTER_ANNUAL: z.string().optional(),

  SPEAKING_DAILY_LIMIT: z.coerce.number().optional(),
  SPEAKING_BUCKET: z.string().optional(),
  LIMIT_FREE_SPEAKING: z.coerce.number().optional(),

  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_VERIFY_SERVICE_SID: z.string().min(1),
  TWILIO_WHATSAPP_FROM: z.string().min(1),
  TWILIO_BYPASS: z.string().optional(),
  WHATSAPP_TASKS_SIGNING_SECRET: z.string().min(1),

  NEXT_PUBLIC_DEV_PAYMENTS: z.string().optional(),
  EASYPASA_MERCHANT_ID: z.string().optional(),
  EASYPASA_SECRET: z.string().optional(),
  JAZZCASH_MERCHANT_ID: z.string().optional(),
  JAZZCASH_INTEGRITY_SALT: z.string().optional(),

  LOCAL_ADMIN_TOKEN: z.string().optional(),
  ADMIN_API_TOKEN: z.string().optional(),
  SITE_URL: z.string().url().optional(),
  PAYMENTS_PROVIDER: z.enum(['none', 'stripe', 'easypaisa', 'jazzcash', 'crypto']).optional(),
  PORT: z.coerce.number().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const raw = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES: process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES,
  NEXT_PUBLIC_DEBUG: process.env.NEXT_PUBLIC_DEBUG,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,

  NEXT_PUBLIC_FEATURE_TRIAL: process.env.NEXT_PUBLIC_FEATURE_TRIAL,
  NEXT_PUBLIC_FEATURE_PAYWALL: process.env.NEXT_PUBLIC_FEATURE_PAYWALL,
  NEXT_PUBLIC_FEATURE_REFERRAL: process.env.NEXT_PUBLIC_FEATURE_REFERRAL,
  NEXT_PUBLIC_FEATURE_PARTNER: process.env.NEXT_PUBLIC_FEATURE_PARTNER,
  NEXT_PUBLIC_FEATURE_PREDICTOR: process.env.NEXT_PUBLIC_FEATURE_PREDICTOR,
  NEXT_PUBLIC_FEATURE_CHALLENGE: process.env.NEXT_PUBLIC_FEATURE_CHALLENGE,
  NEXT_PUBLIC_FEATURE_AI_COACH: process.env.NEXT_PUBLIC_FEATURE_AI_COACH,
  NEXT_PUBLIC_FEATURE_STUDY_BUDDY: process.env.NEXT_PUBLIC_FEATURE_STUDY_BUDDY,
  NEXT_PUBLIC_FEATURE_MISTAKES_BOOK: process.env.NEXT_PUBLIC_FEATURE_MISTAKES_BOOK,
  NEXT_PUBLIC_FEATURE_WHATSAPP_TASKS: process.env.NEXT_PUBLIC_FEATURE_WHATSAPP_TASKS,
  NEXT_PUBLIC_FEATURE_FLOATING_WIDGET: process.env.NEXT_PUBLIC_FEATURE_FLOATING_WIDGET,
  NEXT_PUBLIC_FEATURE_COACH: process.env.NEXT_PUBLIC_FEATURE_COACH,
  NEXT_PUBLIC_FEATURE_NOTIFICATIONS: process.env.NEXT_PUBLIC_FEATURE_NOTIFICATIONS,
  NEXT_PUBLIC_FEATURE_QUICK_TEN: process.env.NEXT_PUBLIC_FEATURE_QUICK_TEN,
  NEXT_PUBLIC_FEATURE_AI_ASSIST: process.env.NEXT_PUBLIC_FEATURE_AI_ASSIST,
  NEXT_PUBLIC_PUSH_PUBLIC_KEY: process.env.NEXT_PUBLIC_PUSH_PUBLIC_KEY,

  NEXT_PUBLIC_GA4_ID: process.env.NEXT_PUBLIC_GA4_ID,
  NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,

  NEXT_PUBLIC_TWILIO_BYPASS: process.env.NEXT_PUBLIC_TWILIO_BYPASS,
  NEXT_PUBLIC_PAYMENTS_PROVIDER: process.env.NEXT_PUBLIC_PAYMENTS_PROVIDER,

  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

  REVIEW_SHARE_SECRET: process.env.REVIEW_SHARE_SECRET,
  REVIEW_SHARE_TTL_HOURS: process.env.REVIEW_SHARE_TTL_HOURS,

  ADMIN_EMAILS: process.env.ADMIN_EMAILS,

  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_MODEL: process.env.GROQ_MODEL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  GX_AI_PROVIDER: process.env.GX_AI_PROVIDER,

  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,

  PREMIUM_MASTER_PIN: process.env.PREMIUM_MASTER_PIN,
  PREMIUM_PIN_HASH: process.env.PREMIUM_PIN_HASH,
  PREMIUM_PIN_SALT: process.env.PREMIUM_PIN_SALT,
  PREMIUM_PIN_RATE: process.env.PREMIUM_PIN_RATE,
  PREMIUM_PIN_WINDOW_SEC: process.env.PREMIUM_PIN_WINDOW_SEC,

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_STARTER_MONTHLY: process.env.STRIPE_PRICE_STARTER_MONTHLY,
  STRIPE_PRICE_STARTER_ANNUAL: process.env.STRIPE_PRICE_STARTER_ANNUAL,
  STRIPE_PRICE_BOOSTER_MONTHLY: process.env.STRIPE_PRICE_BOOSTER_MONTHLY,
  STRIPE_PRICE_BOOSTER_ANNUAL: process.env.STRIPE_PRICE_BOOSTER_ANNUAL,
  STRIPE_PRICE_MASTER_MONTHLY: process.env.STRIPE_PRICE_MASTER_MONTHLY,
  STRIPE_PRICE_MASTER_ANNUAL: process.env.STRIPE_PRICE_MASTER_ANNUAL,

  SPEAKING_DAILY_LIMIT: process.env.SPEAKING_DAILY_LIMIT,
  SPEAKING_BUCKET: process.env.SPEAKING_BUCKET,
  LIMIT_FREE_SPEAKING: process.env.LIMIT_FREE_SPEAKING,

  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_VERIFY_SERVICE_SID: process.env.TWILIO_VERIFY_SERVICE_SID,
  TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM,
  TWILIO_BYPASS: process.env.TWILIO_BYPASS,
  WHATSAPP_TASKS_SIGNING_SECRET: process.env.WHATSAPP_TASKS_SIGNING_SECRET,

  NEXT_PUBLIC_DEV_PAYMENTS: process.env.NEXT_PUBLIC_DEV_PAYMENTS,
  EASYPASA_MERCHANT_ID: process.env.EASYPASA_MERCHANT_ID,
  EASYPASA_SECRET: process.env.EASYPASA_SECRET,
  JAZZCASH_MERCHANT_ID: process.env.JAZZCASH_MERCHANT_ID,
  JAZZCASH_INTEGRITY_SALT: process.env.JAZZCASH_INTEGRITY_SALT,

  LOCAL_ADMIN_TOKEN: process.env.LOCAL_ADMIN_TOKEN,
  ADMIN_API_TOKEN: process.env.ADMIN_API_TOKEN,
  SITE_URL: process.env.SITE_URL,
  PAYMENTS_PROVIDER: process.env.PAYMENTS_PROVIDER,
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV as any,
};

const skipValidation =
  process.env.SKIP_ENV_VALIDATION === 'true' || raw.NODE_ENV === 'test';

// Vercel sets VERCEL_ENV to 'development' | 'preview' | 'production'
const isProdBuild =
  raw.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production';

const parsed = envSchema.safeParse(raw);

const globalEnv = globalThis as typeof globalThis & { __envWarnings?: Set<string> };

if (!parsed.success && typeof window === 'undefined') {
  if (skipValidation || !isProdBuild) {
    const warnings = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('\n');

    const message =
      'Skipping strict environment validation (non-prod or SKIP_ENV_VALIDATION=true). Falling back to safe defaults:\n' +
      warnings;

    if (!globalEnv.__envWarnings) {
      globalEnv.__envWarnings = new Set();
    }

    if (!globalEnv.__envWarnings.has(message)) {
      globalEnv.__envWarnings.add(message);
      console.warn(message);
    }
  } else {
    const errors = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('\n');
    console.error('Invalid environment variables:\n' + errors);
    throw new Error('Invalid environment variables');
  }
}

const defaults = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon_key',
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_SERVICE_KEY: 'service_key',
  SUPABASE_SERVICE_ROLE_KEY: 'service_role_key',
  REVIEW_SHARE_SECRET: 'review_share_secret',
  REVIEW_SHARE_TTL_HOURS: 72,
  TWILIO_ACCOUNT_SID: 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  TWILIO_AUTH_TOKEN: 'auth_token',
  TWILIO_VERIFY_SERVICE_SID: 'VAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  TWILIO_WHATSAPP_FROM: 'whatsapp:+10000000000',
  WHATSAPP_TASKS_SIGNING_SECRET: 'whatsapp_signing_secret',
  PAYMENTS_PROVIDER: 'none',
  NEXT_PUBLIC_PAYMENTS_PROVIDER: 'none',
};

const filteredRaw = Object.fromEntries(
  Object.entries(raw).filter(([, value]) => value !== undefined && value !== null),
);

export const env = parsed.success
  ? parsed.data
  : {
      ...defaults,
      ...filteredRaw,
      NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES: Number(raw.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES ?? 30),
      REVIEW_SHARE_TTL_HOURS: Number(
        raw.REVIEW_SHARE_TTL_HOURS ?? defaults.REVIEW_SHARE_TTL_HOURS ?? 72,
      ),
    };

export const isBrowser = typeof window !== 'undefined';
export const isServer = !isBrowser;

const hasSupabaseUrlEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL);
const hasSupabaseAnonKeyEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const hasSupabaseServiceKeyEnv = Boolean(
  (process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY) ?? '',
);

export const supabaseEnvState = {
  hasUrl: hasSupabaseUrlEnv,
  hasAnonKey: hasSupabaseAnonKeyEnv,
  hasServiceKey: hasSupabaseServiceKeyEnv,
};

export function bool(val?: string, fallback = false) {
  if (val == null) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(val).toLowerCase());
}
