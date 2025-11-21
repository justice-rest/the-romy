/**
 * Polar.sh access control helpers
 * Uses Polar's API to verify subscriptions and entitlements
 */

import { polarClient } from './polar-client';
import type { Customer, CustomerCreateRequest, CustomerSubscription, Product } from '@polar-sh/sdk';

/**
 * Get or create a customer in Polar
 * @param email - The user's email
 * @param userId - The user's ID
 * @param name - The user's name (optional)
 */
export async function getOrCreatePolarCustomer(
  email: string,
  userId: string,
  name?: string
): Promise<Customer | null> {
  try {
    // First try to get existing customer by external ID (our user ID)
    const existingCustomers = await polarClient.customers.list({
      externalId: userId,
    });

    if (existingCustomers.result.items.length > 0) {
      return existingCustomers.result.items[0];
    }

    // Create new customer if doesn't exist
    const createData: CustomerCreateRequest = {
      email,
      externalId: userId,
      name: name || email,
    };

    const customer = await polarClient.customers.create(createData);
    return customer;
  } catch (error) {
    console.error('Polar customer error:', error);
    return null;
  }
}

/**
 * Get customer's active subscriptions
 * @param customerId - The Polar customer ID
 */
export async function getActiveSubscriptions(customerId: string): Promise<CustomerSubscription[]> {
  try {
    const subscriptions = await polarClient.customers.subscriptions.list({
      customerId,
      active: true,
    });

    return subscriptions.result.items;
  } catch (error) {
    console.error('Polar subscriptions error:', error);
    return [];
  }
}

/**
 * Check if customer has access to send messages based on their Polar subscription
 * @param email - The user's email
 * @param userId - The user's ID
 * @returns Promise with allowed status and subscription details
 */
export async function checkMessageAccess(email: string, userId: string) {
  try {
    const customer = await getOrCreatePolarCustomer(email, userId);

    if (!customer) {
      // Allow free tier access if customer creation failed
      return {
        allowed: true,
        tier: 'free' as const,
        subscription: null,
        balance: null,
        unlimited: false,
      };
    }

    const subscriptions = await getActiveSubscriptions(customer.id);

    // No active subscription = free tier
    if (subscriptions.length === 0) {
      return {
        allowed: true,
        tier: 'free' as const,
        subscription: null,
        balance: null,
        unlimited: false,
      };
    }

    // Get the first active subscription (users should only have one)
    const subscription = subscriptions[0];
    const productId = subscription.productId;

    // Map Polar product IDs to our tiers
    const tierMap: Record<string, 'pro' | 'max' | 'ultra'> = {
      'pro': 'pro',
      'max': 'max',
      'ultra': 'ultra',
      // Add actual Polar product IDs here once configured
    };

    const tier = tierMap[productId] || 'free';

    // Check tier-specific limits
    if (tier === 'pro') {
      // Pro has 100 messages/month limit - need to track usage
      // For now, allow access but we'll need to implement usage tracking
      return {
        allowed: true,
        tier,
        subscription,
        balance: 100, // Will need to track actual usage
        unlimited: false,
      };
    }

    // Max and Ultra have unlimited messages
    if (tier === 'max' || tier === 'ultra') {
      return {
        allowed: true,
        tier,
        subscription,
        balance: null,
        unlimited: true,
      };
    }

    // Default to free tier
    return {
      allowed: true,
      tier: 'free' as const,
      subscription,
      balance: null,
      unlimited: false,
    };

  } catch (error) {
    console.error('Polar check error:', error);
    // Fail open for now - allow access if Polar is down
    return {
      allowed: true,
      tier: 'free' as const,
      subscription: null,
      balance: null,
      unlimited: false,
    };
  }
}

/**
 * Get customer's subscription tier
 * @param email - The user's email
 * @param userId - The user's ID
 */
export async function getCustomerTier(email: string, userId: string): Promise<'free' | 'pro' | 'max' | 'ultra'> {
  const access = await checkMessageAccess(email, userId);
  return access.tier;
}

/**
 * Check if customer has access to pro models
 * @param email - The user's email
 * @param userId - The user's ID
 */
export async function canAccessProModels(email: string, userId: string): Promise<boolean> {
  const tier = await getCustomerTier(email, userId);
  return ['pro', 'max', 'ultra'].includes(tier);
}

/**
 * Check if customer has access to premium models (Ultra only)
 * @param email - The user's email
 * @param userId - The user's ID
 */
export async function canAccessPremiumModels(email: string, userId: string): Promise<boolean> {
  const tier = await getCustomerTier(email, userId);
  return tier === 'ultra';
}