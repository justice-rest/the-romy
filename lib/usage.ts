import { UsageLimitError } from "@/lib/api"
import {
  AUTH_DAILY_MESSAGE_LIMIT,
  DAILY_LIMIT_PRO_MODELS,
  FREE_MODELS_IDS,
  NON_AUTH_DAILY_MESSAGE_LIMIT,
} from "@/lib/config"
import { SupabaseClient } from "@supabase/supabase-js"
import { TIER_LIMITS } from "@/lib/subscriptions/config"
import type { SubscriptionTier } from "@/lib/subscriptions/types"

const isFreeModel = (modelId: string) => FREE_MODELS_IDS.includes(modelId)
const isProModel = (modelId: string) => !isFreeModel(modelId)

/**
 * Checks the user's daily usage to see if they've reached their limit.
 * Uses the `anonymous` flag from the user record to decide which daily limit applies.
 *
 * @param supabase - Your Supabase client.
 * @param userId - The ID of the user.
 * @param trackDaily - Whether to track the daily message count (default is true)
 * @throws UsageLimitError if the daily limit is reached, or a generic Error if checking fails.
 * @returns User data including message counts and reset date
 */
export async function checkUsage(supabase: SupabaseClient, userId: string) {
  const { data: userData, error: userDataError } = await supabase
    .from("users")
    .select(
      "message_count, daily_message_count, daily_reset, anonymous, premium, subscription_tier, subscription_status, monthly_message_count, monthly_reset, subscription_period_end"
    )
    .eq("id", userId)
    .maybeSingle()

  if (userDataError) {
    throw new Error("Error fetchClienting user data: " + userDataError.message)
  }
  if (!userData) {
    throw new Error("User record not found for id: " + userId)
  }

  // Get subscription tier and limits
  const tier: SubscriptionTier = (userData.subscription_tier as SubscriptionTier) || 'free'
  const tierLimits = TIER_LIMITS[tier]
  const isAnonymous = userData.anonymous

  // For Pro tier, check monthly limits
  if (tier === 'pro' && userData.subscription_status === 'active') {
    const now = new Date()
    let monthlyCount = userData.monthly_message_count || 0
    const monthlyReset = userData.monthly_reset ? new Date(userData.monthly_reset) : null
    const periodEnd = userData.subscription_period_end ? new Date(userData.subscription_period_end) : null

    // Reset monthly counter if we've passed the billing cycle
    if (periodEnd && now >= periodEnd) {
      monthlyCount = 0
      const { error: resetError } = await supabase
        .from("users")
        .update({
          monthly_message_count: 0,
          monthly_reset: now.toISOString()
        })
        .eq("id", userId)

      if (resetError) {
        throw new Error("Failed to reset monthly count: " + resetError.message)
      }
    }

    // Check monthly limit (100 messages for Pro)
    if (tierLimits.monthlyMessages !== null && monthlyCount >= tierLimits.monthlyMessages) {
      throw new UsageLimitError("Monthly message limit reached. Upgrade to Max for unlimited messages.")
    }
  }

  // Check daily limits (for free tier)
  const dailyLimit = isAnonymous
    ? NON_AUTH_DAILY_MESSAGE_LIMIT
    : tierLimits.dailyMessages

  // Reset the daily counter if the day has changed (using UTC).
  const now = new Date()
  let dailyCount = userData.daily_message_count || 0
  const lastReset = userData.daily_reset ? new Date(userData.daily_reset) : null

  const isNewDay =
    !lastReset ||
    now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
    now.getUTCMonth() !== lastReset.getUTCMonth() ||
    now.getUTCDate() !== lastReset.getUTCDate()

  if (isNewDay) {
    dailyCount = 0
    const { error: resetError } = await supabase
      .from("users")
      .update({ daily_message_count: 0, daily_reset: now.toISOString() })
      .eq("id", userId)

    if (resetError) {
      throw new Error("Failed to reset daily count: " + resetError.message)
    }
  }

  // Check if the daily limit is reached (only for tiers with finite daily limits)
  if (dailyLimit !== Infinity && dailyCount >= dailyLimit) {
    throw new UsageLimitError("Daily message limit reached.")
  }

  return {
    userData,
    dailyCount,
    dailyLimit,
    tier,
    monthlyCount: userData.monthly_message_count || 0,
  }
}

/**
 * Increments both overall and daily message counters for a user.
 *
 * @param supabase - Your Supabase client.
 * @param userId - The ID of the user.
 * @param currentCounts - Current message counts (optional, will be fetchCliented if not provided)
 * @param trackDaily - Whether to track the daily message count (default is true)
 * @throws Error if updating fails.
 */
export async function incrementUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data: userData, error: userDataError } = await supabase
    .from("users")
    .select("message_count, daily_message_count, monthly_message_count, subscription_tier, subscription_status")
    .eq("id", userId)
    .maybeSingle()

  if (userDataError || !userData) {
    throw new Error(
      "Error fetchClienting user data: " +
        (userDataError?.message || "User not found")
    )
  }

  const messageCount = userData.message_count || 0
  const dailyCount = userData.daily_message_count || 0
  const monthlyCount = userData.monthly_message_count || 0

  // Increment both overall and daily message counts.
  const newOverallCount = messageCount + 1
  const newDailyCount = dailyCount + 1

  // For Pro tier with active subscription, also increment monthly count
  const tier: SubscriptionTier = (userData.subscription_tier as SubscriptionTier) || 'free'
  const updateData: Record<string, any> = {
    message_count: newOverallCount,
    daily_message_count: newDailyCount,
    last_active_at: new Date().toISOString(),
  }

  if (tier === 'pro' && userData.subscription_status === 'active') {
    updateData.monthly_message_count = monthlyCount + 1
  }

  const { error: updateError } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", userId)

  if (updateError) {
    throw new Error("Failed to update usage data: " + updateError.message)
  }
}

export async function checkProUsage(supabase: SupabaseClient, userId: string) {
  const { data: userData, error: userDataError } = await supabase
    .from("users")
    .select("daily_pro_message_count, daily_pro_reset")
    .eq("id", userId)
    .maybeSingle()

  if (userDataError) {
    throw new Error("Error fetching user data: " + userDataError.message)
  }
  if (!userData) {
    throw new Error("User not found for ID: " + userId)
  }

  let dailyProCount = userData.daily_pro_message_count || 0
  const now = new Date()
  const lastReset = userData.daily_pro_reset
    ? new Date(userData.daily_pro_reset)
    : null

  const isNewDay =
    !lastReset ||
    now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
    now.getUTCMonth() !== lastReset.getUTCMonth() ||
    now.getUTCDate() !== lastReset.getUTCDate()

  if (isNewDay) {
    dailyProCount = 0
    const { error: resetError } = await supabase
      .from("users")
      .update({
        daily_pro_message_count: 0,
        daily_pro_reset: now.toISOString(),
      })
      .eq("id", userId)

    if (resetError) {
      throw new Error("Failed to reset pro usage: " + resetError.message)
    }
  }

  if (dailyProCount >= DAILY_LIMIT_PRO_MODELS) {
    throw new UsageLimitError("Daily Pro model limit reached.")
  }

  return {
    dailyProCount,
    limit: DAILY_LIMIT_PRO_MODELS,
  }
}

export async function incrementProUsage(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("users")
    .select("daily_pro_message_count")
    .eq("id", userId)
    .maybeSingle()

  if (error || !data) {
    throw new Error("Failed to fetch user usage for increment")
  }

  const count = data.daily_pro_message_count || 0

  const { error: updateError } = await supabase
    .from("users")
    .update({
      daily_pro_message_count: count + 1,
      last_active_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (updateError) {
    throw new Error("Failed to increment pro usage: " + updateError.message)
  }
}

export async function checkUsageByModel(
  supabase: SupabaseClient,
  userId: string,
  modelId: string,
  isAuthenticated: boolean
) {
  if (isProModel(modelId)) {
    if (!isAuthenticated) {
      throw new UsageLimitError("You must log in to use this model.")
    }
    return await checkProUsage(supabase, userId)
  }

  return await checkUsage(supabase, userId)
}

export async function incrementUsageByModel(
  supabase: SupabaseClient,
  userId: string,
  modelId: string,
  isAuthenticated: boolean
) {
  if (isProModel(modelId)) {
    if (!isAuthenticated) return
    return await incrementProUsage(supabase, userId)
  }

  return await incrementUsage(supabase, userId)
}
