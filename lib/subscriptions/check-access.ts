/**
 * Subscription access control helpers
 * Check user permissions based on subscription tier
 */

import { SubscriptionTier, SubscriptionStatus } from './types';
import { TIER_LIMITS } from './config';

export interface UserSubscriptionData {
  subscription_tier?: SubscriptionTier | null;
  subscription_status?: SubscriptionStatus | null;
  monthly_message_count?: number;
  subscription_period_end?: string | null;
}

/**
 * Check if user has an active subscription
 */
export function hasActiveSubscription(user: UserSubscriptionData): boolean {
  return user.subscription_status === 'active';
}

/**
 * Check if user has Pro tier or higher
 */
export function hasProAccess(user: UserSubscriptionData): boolean {
  const tier = user.subscription_tier || 'free';
  return (
    ['pro', 'max', 'ultra'].includes(tier) && user.subscription_status === 'active'
  );
}

/**
 * Check if user has Max tier or higher
 */
export function hasMaxAccess(user: UserSubscriptionData): boolean {
  const tier = user.subscription_tier || 'free';
  return (
    ['max', 'ultra'].includes(tier) && user.subscription_status === 'active'
  );
}

/**
 * Check if user has Ultra tier (premium models access)
 */
export function hasUltraAccess(user: UserSubscriptionData): boolean {
  const tier = user.subscription_tier || 'free';
  return tier === 'ultra' && user.subscription_status === 'active';
}

/**
 * Check if user can access pro models
 */
export function canAccessProModels(user: UserSubscriptionData): boolean {
  const tier = user.subscription_tier || 'free';
  const limits = TIER_LIMITS[tier];

  // Must have active subscription for paid tiers
  if (tier !== 'free' && user.subscription_status !== 'active') {
    return false;
  }

  return limits.proModels;
}

/**
 * Check if user can access premium models (Ultra only)
 */
export function canAccessPremiumModels(user: UserSubscriptionData): boolean {
  return hasUltraAccess(user);
}

/**
 * Check if user has remaining message quota
 * For Pro tier: checks monthly limit
 * For others: returns true (unlimited or daily limits handled separately)
 */
export function hasMessageQuota(user: UserSubscriptionData): boolean {
  const tier = user.subscription_tier || 'free';
  const limits = TIER_LIMITS[tier];

  // Must have active subscription for paid tiers
  if (tier !== 'free' && user.subscription_status !== 'active') {
    return false;
  }

  // Pro tier has monthly message limit
  if (tier === 'pro' && limits.monthlyMessages !== null) {
    const monthlyCount = user.monthly_message_count || 0;
    return monthlyCount < limits.monthlyMessages;
  }

  // Other tiers have no monthly limit
  return true;
}

/**
 * Get remaining messages for user (null = unlimited)
 */
export function getRemainingMessages(user: UserSubscriptionData): number | null {
  const tier = user.subscription_tier || 'free';
  const limits = TIER_LIMITS[tier];

  if (limits.monthlyMessages === null) {
    return null; // Unlimited
  }

  const monthlyCount = user.monthly_message_count || 0;
  return Math.max(0, limits.monthlyMessages - monthlyCount);
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  const names: Record<SubscriptionTier, string> = {
    free: 'Free',
    pro: 'Pro',
    max: 'Max',
    ultra: 'Ultra',
  };
  return names[tier];
}

/**
 * Check if user needs to reset monthly counter
 * Returns true if current time is past the monthly_reset timestamp
 */
export function needsMonthlyReset(user: UserSubscriptionData): boolean {
  const tier = user.subscription_tier || 'free';

  // Only Pro tier has monthly limits
  if (tier !== 'pro') {
    return false;
  }

  // Check if subscription has a billing period end date
  if (!user.subscription_period_end) {
    return false;
  }

  const periodEnd = new Date(user.subscription_period_end);
  const now = new Date();

  return now >= periodEnd;
}
