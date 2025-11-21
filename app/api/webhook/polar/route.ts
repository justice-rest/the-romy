/**
 * Polar.sh webhook handler
 * Processes subscription events and updates user records
 */

import { Webhooks } from '@polar-sh/nextjs';
import { createClient } from '@/lib/supabase/server';

// Map Polar product IDs to our tier system
const TIER_MAP: Record<string, 'pro' | 'max' | 'ultra'> = {
  [process.env.POLAR_PRODUCT_ID_PRO || 'pro']: 'pro',
  [process.env.POLAR_PRODUCT_ID_MAX || 'max']: 'max',
  [process.env.POLAR_PRODUCT_ID_ULTRA || 'ultra']: 'ultra',
};

async function updateUserSubscription(
  externalId: string,
  tier: 'free' | 'pro' | 'max' | 'ultra',
  status: 'active' | 'canceled' | 'past_due' | null,
  periodEnd?: string | null
) {
  const supabase = await createClient();

  // Update user subscription in database
  const { error } = await supabase
    .from('users')
    .update({
      subscription_tier: tier,
      subscription_status: status,
      subscription_period_end: periodEnd,
      // Reset monthly counter for new subscriptions
      monthly_message_count: status === 'active' ? 0 : undefined,
    })
    .eq('id', externalId);

  if (error) {
    console.error('Error updating user subscription:', error);
  }
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

  // Handle checkout completion
  onCheckoutUpdated: async (payload: any) => {
    if (payload.data.status === 'confirmed') {
      console.log('Checkout confirmed:', payload.data.id);
      // Subscription will be created separately, handled by onSubscriptionCreated
    }
  },

  // Handle new subscription creation
  onSubscriptionCreated: async (payload: any) => {
    const subscription = payload.data;
    const tier = TIER_MAP[subscription.productId] || 'free';
    const externalId = subscription.customerId; // This should be our user ID

    console.log(`New subscription created: ${tier} for user ${externalId}`);

    await updateUserSubscription(
      externalId,
      tier,
      'active',
      subscription.currentPeriodEnd
    );
  },

  // Handle subscription activation
  onSubscriptionActive: async (payload: any) => {
    const subscription = payload.data;
    const tier = TIER_MAP[subscription.productId] || 'free';
    const externalId = subscription.customerId;

    console.log(`Subscription activated: ${tier} for user ${externalId}`);

    await updateUserSubscription(
      externalId,
      tier,
      'active',
      subscription.currentPeriodEnd
    );
  },

  // Handle subscription updates (e.g., plan changes)
  onSubscriptionUpdated: async (payload: any) => {
    const subscription = payload.data;
    const tier = TIER_MAP[subscription.productId] || 'free';
    const externalId = subscription.customerId;

    console.log(`Subscription updated: ${tier} for user ${externalId}`);

    // Map Polar status to our status
    let status: 'active' | 'canceled' | 'past_due' | null = null;
    if (subscription.status === 'active') status = 'active';
    else if (subscription.status === 'canceled') status = 'canceled';
    else if (subscription.status === 'past_due') status = 'past_due';

    await updateUserSubscription(
      externalId,
      tier,
      status,
      subscription.currentPeriodEnd
    );
  },

  // Handle subscription cancellation
  onSubscriptionCanceled: async (payload: any) => {
    const subscription = payload.data;
    const externalId = subscription.customerId;

    console.log(`Subscription canceled for user ${externalId}`);

    await updateUserSubscription(
      externalId,
      'free',
      'canceled',
      subscription.currentPeriodEnd
    );
  },

  // Handle subscription revocation (immediate cancellation)
  onSubscriptionRevoked: async (payload: any) => {
    const subscription = payload.data;
    const externalId = subscription.customerId;

    console.log(`Subscription revoked for user ${externalId}`);

    await updateUserSubscription(
      externalId,
      'free',
      null,
      null
    );
  },

  // Catch-all handler for logging other events
  onPayload: async (payload: any) => {
    console.log('Polar webhook received:', payload.type);
  },
});