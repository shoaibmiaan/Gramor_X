// lib/stripe.ts
import Stripe from 'stripe';

// Optional flag to turn off Stripe in dev or when you have no real keys
const disabled = process.env.STRIPE_DISABLED === '1';
const key = process.env.STRIPE_SECRET_KEY;

if (!key || key.includes('...') || disabled) {
  // Keeps app import-safe in dev without crashing
  // Consumers must handle `stripe === null`
  // eslint-disable-next-line no-console
  console.warn(
    '[stripe] Stripe is disabled or STRIPE_SECRET_KEY not set. ' +
      'Billing and charge APIs will fall back to manual/crypto.'
  );
}

// Export singleton
export const stripe =
  !disabled && key && !key.includes('...')
    ? new Stripe(key, { apiVersion: '2024-06-20' })
    : null;
