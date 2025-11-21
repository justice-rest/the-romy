/**
 * Subscription types for Autumn payment integration
 */

export type SubscriptionTier = 'free' | 'pro' | 'max' | 'ultra';

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'trialing'
  | 'incomplete'
  | 'incomplete_expired';

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
}

export interface TierLimits {
  dailyMessages: number;
  monthlyMessages: number | null; // null = unlimited
  proModels: boolean;
  premiumModels: boolean;
  fileUploads: number; // per day
  features: string[];
}

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  price: number;
  interval: 'month';
  description: string;
  limits: TierLimits;
}
