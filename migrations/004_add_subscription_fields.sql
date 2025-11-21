-- Migration: Add subscription fields to users table
-- Date: 2025-11-21
-- Purpose: Support Autumn payment integration with Pro/Max/Ultra tiers

-- Add subscription-related columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT CHECK (subscription_tier IN ('free', 'pro', 'max', 'ultra')) DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_message_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_reset TIMESTAMPTZ DEFAULT NOW();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- Update existing users to have 'free' tier explicitly
UPDATE users SET subscription_tier = 'free' WHERE subscription_tier IS NULL;

-- Add comment explaining Autumn integration
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe customer ID from Autumn payment processor';
COMMENT ON COLUMN users.subscription_tier IS 'Subscription plan: free (default), pro ($29), max ($89), ultra ($200)';
COMMENT ON COLUMN users.subscription_status IS 'Stripe subscription status from Autumn webhooks';
COMMENT ON COLUMN users.monthly_message_count IS 'Message counter for Pro tier (100 messages/month limit)';
COMMENT ON COLUMN users.monthly_reset IS 'Timestamp when monthly message counter resets (aligned with billing cycle)';
