// lib/stripe.ts
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  // We keep this module import-safe in dev without crashing the app
  // Consumers must handle `stripe === null`.
  // eslint-disable-next-line no-console
  console.warn('[stripe] STRIPE_SECRET_KEY is not set. Billing APIs will be limited.');
}

export const stripe = key
  ? new Stripe(key, { apiVersion: '2024-06-20' })
  : null;
