// lib/stripe.ts
import Stripe from 'stripe';

const disabled = process.env.STRIPE_DISABLED === '1';
const key = process.env.STRIPE_SECRET_KEY;

export const stripe = !disabled && key && !key.includes('...')
  ? new Stripe(key, { apiVersion: '2024-06-20' })
  : null;
