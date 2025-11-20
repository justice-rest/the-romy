import { Autumn } from "autumn-js"

/**
 * Autumn Client Utility - Complete Rewrite
 *
 * Server-side integration with Autumn for subscription management.
 * Provides clean, reliable functions for:
 * - Feature access checking (messages)
 * - Usage tracking
 * - Customer data retrieval
 *
 * All functions fail-open to ensure app availability even during Autumn outages.
 */

/**
 * Check if Autumn is properly configured
 */
export function isAutumnEnabled(): boolean {
  return !!process.env.AUTUMN_SECRET_KEY
}

/**
 * Get configured Autumn client instance
 * Returns null if AUTUMN_SECRET_KEY is not set
 */
function getAutumnClient(): Autumn | null {
  if (!isAutumnEnabled()) {
    return null
  }

  return new Autumn({ secretKey: process.env.AUTUMN_SECRET_KEY! })
}

/**
 * Check if a user has access to send messages
 *
 * This function:
 * 1. Checks if the user has remaining message balance
 * 2. Auto-creates customer if they don't exist
 * 3. Returns access status and current balance
 *
 * @param userId - The Supabase user ID (used as Autumn customer_id)
 * @returns Object with allowed status, balance, and limit
 */
export async function checkMessageAccess(
  userId: string
): Promise<{ allowed: boolean; balance?: number; limit?: number }> {
  const autumn = getAutumnClient()

  // If Autumn is disabled, allow access (fall back to existing rate limits)
  if (!autumn) {
    return { allowed: true }
  }

  try {
    // Check feature access - this auto-creates customer if needed
    const response = await autumn.check({
      customer_id: userId,
      feature_id: "messages",
    })

    // Handle the response structure properly
    // Autumn SDK may return { data, error } or throw on error
    if (response && typeof response === "object") {
      // Check if there's an error property
      if ("error" in response && response.error) {
        console.error("[Autumn] Check error:", response.error)
        return { allowed: true } // Fail open
      }

      // Get data from response
      const data = "data" in response ? response.data : response

      if (data && typeof data === "object") {
        return {
          allowed: (data as any).allowed ?? true,
          balance: (data as any).balance ?? undefined,
          limit: (data as any).limit ?? undefined,
        }
      }
    }

    // If response structure is unexpected, fail open
    console.warn("[Autumn] Unexpected response structure:", response)
    return { allowed: true }
  } catch (error) {
    // Log detailed error but fail open to prevent blocking users
    console.error("[Autumn] Exception during check:", {
      error: error instanceof Error ? error.message : String(error),
      userId,
      featureId: "messages",
    })
    return { allowed: true }
  }
}

/**
 * Track a message usage event
 *
 * Records that the user sent 1 message.
 * This increments their usage counter in Autumn.
 *
 * @param userId - The Supabase user ID (used as Autumn customer_id)
 */
export async function trackMessageUsage(userId: string): Promise<void> {
  const autumn = getAutumnClient()

  if (!autumn) {
    return
  }

  try {
    const response = await autumn.track({
      customer_id: userId,
      feature_id: "messages",
      value: 1,
    })

    // Check for errors in response
    if (response && typeof response === "object" && "error" in response) {
      if (response.error) {
        console.error("[Autumn] Track error:", response.error)
      }
    }
  } catch (error) {
    // Log error but don't throw - tracking failures shouldn't block the user
    console.error("[Autumn] Exception during track:", {
      error: error instanceof Error ? error.message : String(error),
      userId,
      featureId: "messages",
      value: 1,
    })
  }
}

/**
 * Get customer subscription and usage data
 *
 * Fetches complete customer object including:
 * - Active products/subscriptions
 * - Feature usage and balances
 * - Subscription status
 *
 * @param userId - The Supabase user ID (used as Autumn customer_id)
 * @returns Customer data object or null if error/not found
 */
export async function getCustomerData(userId: string) {
  const autumn = getAutumnClient()

  if (!autumn) {
    return null
  }

  try {
    const response = await autumn.customers.get(userId)

    // Handle response structure
    if (response && typeof response === "object") {
      // Check for error
      if ("error" in response && response.error) {
        console.error("[Autumn] Get customer error:", response.error)
        return null
      }

      // Return data
      if ("data" in response) {
        return response.data
      }

      // If response is the data itself
      return response
    }

    return null
  } catch (error) {
    console.error("[Autumn] Exception during get customer:", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    })
    return null
  }
}
