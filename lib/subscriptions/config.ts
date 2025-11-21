/**
 * Subscription configuration for Polar.sh payment integration
 * Defines tier limits and plan details
 */

import { SubscriptionPlan, SubscriptionTier, TierLimits } from './types';

/**
 * Message and feature limits per subscription tier
 */
export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    dailyMessages: 1000, // Existing auth user limit
    monthlyMessages: null,
    proModels: false,
    premiumModels: false,
    fileUploads: 5,
    features: ['Basic models', 'File uploads (5/day)', 'Email support'],
  },
  pro: {
    dailyMessages: Infinity,
    monthlyMessages: 100, // Hard monthly limit
    proModels: true,
    premiumModels: false,
    fileUploads: 20,
    features: [
      '100 messages per month',
      'File uploads (20/day)',
      'Email support',
      'Access to Pro models',
    ],
  },
  max: {
    dailyMessages: Infinity,
    monthlyMessages: null, // Unlimited
    proModels: true,
    premiumModels: false,
    fileUploads: Infinity,
    features: [
      'Unlimited messages',
      'Unlimited file uploads',
      'Dedicated support',
      'Everything in Pro',
      'Access to Pro models',
    ],
  },
  ultra: {
    dailyMessages: Infinity,
    monthlyMessages: null, // Unlimited
    proModels: true,
    premiumModels: true,
    fileUploads: Infinity,
    features: [
      'Everything in Max',
      'Fundraising consultation',
      'Access to all AI models',
      'Premium model access',
      'Priority support',
    ],
  },
};

/**
 * Subscription plan definitions matching subscription.md
 */
export const SUBSCRIPTION_PLANS: Record<
  Exclude<SubscriptionTier, 'free'>,
  SubscriptionPlan
> = {
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    interval: 'month',
    description: '100 messages per month, file uploads, email support',
    limits: TIER_LIMITS.pro,
  },
  max: {
    id: 'max',
    name: 'Max',
    price: 89,
    interval: 'month',
    description: 'Unlimited messages, dedicated support, everything in Pro',
    limits: TIER_LIMITS.max,
  },
  ultra: {
    id: 'ultra',
    name: 'Ultra',
    price: 200,
    interval: 'month',
    description:
      'Everything in Max, fundraising consultation, access to all AI models',
    limits: TIER_LIMITS.ultra,
  },
};

/**
 * Check if Polar is properly configured
 */
export function isPolarConfigured(): boolean {
  return !!process.env.POLAR_ACCESS_TOKEN;
}
