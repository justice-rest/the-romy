import { createClient } from "@/lib/supabase/server"
import { autumnHandler } from "autumn-js/next"

/**
 * Autumn API Handler - Complete Rewrite
 *
 * This route handles all Autumn subscription operations at /api/autumn/*
 *
 * What it does:
 * - Identifies users via Supabase authentication
 * - Connects Supabase user IDs to Autumn customer IDs
 * - Enables React hooks (useCustomer, checkout, etc.) on the frontend
 * - Handles checkout flows, billing portal, feature checks
 *
 * Required: AUTUMN_SECRET_KEY environment variable
 */

// Validate configuration on module load
if (!process.env.AUTUMN_SECRET_KEY) {
  console.warn(
    "⚠️  AUTUMN_SECRET_KEY not configured - subscription features disabled"
  )
}

/**
 * Export GET and POST handlers from autumnHandler
 *
 * The autumnHandler creates Next.js route handlers that:
 * 1. Receive requests from Autumn's React hooks
 * 2. Identify the customer via our identify function
 * 3. Forward requests to Autumn's API with proper authentication
 * 4. Return responses to the frontend
 */
export const { GET, POST } = autumnHandler({
  secretKey: process.env.AUTUMN_SECRET_KEY!,
  identify: async (request) => {
    try {
      // Create Supabase client with user's session from cookies
      const supabase = await createClient()

      if (!supabase) {
        console.warn("[Autumn] Supabase not enabled - cannot identify user")
        return null
      }

      // Get authenticated user from Supabase
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      // Return null for unauthenticated users (guest users can't subscribe)
      if (authError || !user) {
        return null
      }

      // Extract user information
      // Prefer user_metadata for display name, fall back to email
      const displayName =
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "User"

      const email = user.email || ""

      // Return customer identification for Autumn
      // This maps Supabase user.id -> Autumn customer_id
      return {
        customerId: user.id,
        customerData: {
          name: displayName,
          email: email,
        },
      }
    } catch (error) {
      // Log errors but return null to prevent breaking the request
      console.error("[Autumn] Error in identify function:", {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  },
})
