/**
 * Autumn access control helpers
 * Uses Autumn's check API to verify feature access
 */

import { Autumn } from 'autumn-js';

/**
 * Check if user has access to send messages based on their Autumn subscription
 * @param customerId - The user's ID (customer ID in Autumn)
 * @returns Promise with allowed status and remaining balance
 *
 * Note: This is a server-side only function. For client-side access control,
 * use the useCustomer hook from autumn-js/react instead.
 */
export async function checkMessageAccess(customerId: string) {
  try {
    const { data, error } = await Autumn.check({
      customer_id: customerId,
      feature_id: 'messages', // Configure this feature in Autumn dashboard
    });

    if (error) {
      console.error('Autumn check error:', error);
      return {
        allowed: false,
        balance: null,
        unlimited: false,
      };
    }

    return {
      allowed: data.allowed,
      balance: data.balance ?? null,
      unlimited: data.unlimited ?? false,
    };
  } catch (error) {
    console.error('Autumn check error:', error);
    // Fail open for now - allow access if Autumn is down
    return {
      allowed: true,
      balance: null,
      unlimited: false,
    };
  }
}

/**
 * Track message usage in Autumn
 * @param customerId - The user's ID
 */
export async function trackMessageUsage(customerId: string) {
  try {
    await Autumn.track({
      customer_id: customerId,
      feature_id: 'messages',
      value: 1,
    });
  } catch (error) {
    console.error('Autumn track error:', error);
    // Don't throw - tracking failure shouldn't block the message
  }
}
