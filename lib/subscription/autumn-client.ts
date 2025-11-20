import { Autumn } from "autumn-js"

/**
 * Autumn Subscription Client
 *
 * Server-side utilities for checking subscription access and tracking usage.
 * Product IDs: Pro, Max, Ultra (with -yearly variants)
 */

// Initialize Autumn client with secret key
const autumn = new Autumn({
  secretKey: process.env.AUTUMN_SECRET_KEY || "",
})

/**
 * Check if Autumn is properly configured
 */
export function isAutumnEnabled(): boolean {
  return !!process.env.AUTUMN_SECRET_KEY
}

/**
 * Check if a user has access to send messages
 * Verifies subscription status and usage limits via Autumn
 */
export async function checkMessageAccess(
  userId: string
): Promise<{ allowed: boolean; balance?: number }> {
  if (!isAutumnEnabled()) {
    return { allowed: true }
  }

  try {
    const { data } = await autumn.check({
      customer_id: userId,
      feature_id: "messages",
    })

    if (!data) {
      return { allowed: true }
    }

    return {
      allowed: data.allowed,
      balance: data.balance ?? undefined,
    }
  } catch (error) {
    console.error("Autumn check error:", error)
    // Fail open - allow access if Autumn is unavailable
    return { allowed: true }
  }
}

/**
 * Track a message usage event
 * Records message usage in Autumn for billing/limit enforcement
 */
export async function trackMessageUsage(userId: string): Promise<void> {
  if (!isAutumnEnabled()) {
    return
  }

  try {
    await autumn.track({
      customer_id: userId,
      feature_id: "messages",
    })
  } catch (error) {
    console.error("Autumn track error:", error)
    // Fail silently - don't block user experience
  }
}

/**
 * Get customer subscription data
 * Fetches full customer profile including subscription status and usage
 */
export async function getCustomerData(userId: string) {
  if (!isAutumnEnabled()) {
    return null
  }

  try {
    const customer = await autumn.customers.get(userId)
    return customer
  } catch (error) {
    console.error("Autumn customer fetch error:", error)
    return null
  }
}
