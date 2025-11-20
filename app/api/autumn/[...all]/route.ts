import { autumnHandler } from "autumn-js/next"
import { createClient } from "@/lib/supabase/server"

/**
 * Autumn Subscription Handler
 *
 * Handles all Autumn billing and subscription requests.
 * Integrates with Supabase authentication to identify customers.
 */

export const { GET, POST } = autumnHandler({
  identify: async () => {
    try {
      // Get Supabase client and check authentication
      const supabase = await createClient()

      if (!supabase) {
        return null
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return null
      }

      // Return customer information for Autumn
      return {
        customerId: user.id,
        customerData: {
          name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
          email: user.email || "",
        },
      }
    } catch (error) {
      console.error("Autumn identify error:", error)
      return null
    }
  },
})
