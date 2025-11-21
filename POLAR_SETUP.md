# Polar.sh Payment Integration Setup Guide

This guide will help you set up Polar.sh for handling payments and subscriptions in Rōmy.

## Prerequisites

1. Create a Polar.sh account at [https://polar.sh](https://polar.sh)
2. Create an organization in Polar

## Step 1: Create Products in Polar

Log into your Polar dashboard and create three products for your subscription tiers:

### Pro Tier ($29/month)
- **Name**: Rōmy Pro
- **Price**: $29/month
- **Description**: 100 messages per month, file uploads, email support
- **Features**:
  - 100 messages per month
  - File uploads (20/day)
  - Email support
  - Access to Pro AI models

### Max Tier ($89/month)
- **Name**: Rōmy Max
- **Price**: $89/month
- **Description**: Unlimited messages, dedicated support, everything in Pro
- **Features**:
  - Unlimited messages
  - Unlimited file uploads
  - Dedicated support
  - Everything in Pro
  - Access to Pro AI models

### Ultra Tier ($200/month)
- **Name**: Rōmy Ultra
- **Price**: $200/month
- **Description**: Everything in Max, fundraising consultation, access to all AI models
- **Features**:
  - Everything in Max
  - Fundraising consultation
  - Access to ALL AI models
  - Premium model access
  - Priority support

## Step 2: Get Your API Credentials

1. Go to your Polar dashboard
2. Navigate to Settings → API
3. Create a new API token with full access
4. Copy the access token
5. Set up a webhook endpoint and copy the webhook secret

## Step 3: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Polar.sh Configuration
POLAR_ACCESS_TOKEN=your_polar_access_token_here
POLAR_WEBHOOK_SECRET=your_webhook_secret_here

# Product IDs (from your Polar dashboard)
POLAR_PRODUCT_ID_PRO=a3e85ac9-6f06-488e-90c6-4c36787d030e
POLAR_PRODUCT_ID_MAX=a9402895-8cda-4157-8565-19d44e61066c
POLAR_PRODUCT_ID_ULTRA=f2ff82cf-0d6a-40ee-a448-3cef21fa45ab

# Environment (use 'sandbox' for testing)
NEXT_PUBLIC_POLAR_ENV=sandbox

# App URL for redirects
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 4: Configure Webhook

1. In your Polar dashboard, go to Settings → Webhooks
2. Add a new webhook endpoint:
   - URL: `https://your-domain.com/api/webhook/polar`
   - Events: Select all subscription and checkout events
3. Copy the webhook secret and add it to your environment variables

## Step 5: Test the Integration

### Testing in Sandbox Mode

1. Set `NEXT_PUBLIC_POLAR_ENV=sandbox` in your environment
2. Use Polar's test credit card numbers for testing:
   - Card: 4242 4242 4242 4242
   - Expiry: Any future date
   - CVC: Any 3 digits

### Testing the Flow

1. Navigate to `/pricing`
2. Select a plan
3. Complete the checkout process
4. Verify the subscription is created in your Polar dashboard
5. Check that the user's subscription status is updated in your database

## Step 6: Production Setup

Before going to production:

1. Remove or set `NEXT_PUBLIC_POLAR_ENV` to empty (defaults to production)
2. Update `NEXT_PUBLIC_APP_URL` to your production URL
3. Update webhook URL in Polar dashboard to production endpoint
4. Test with a real payment to ensure everything works

## Database Schema

The integration stores subscription data in the `users` table:

```sql
-- Subscription fields in users table
subscription_tier TEXT DEFAULT 'free',
subscription_status TEXT,
subscription_period_end TIMESTAMP,
monthly_message_count INTEGER DEFAULT 0,
monthly_reset TIMESTAMP
```

## API Endpoints

The integration provides these endpoints:

- `POST /api/polar/checkout` - Create checkout session
- `GET /api/subscription/status` - Get current subscription status
- `POST /api/webhook/polar` - Handle Polar webhooks

## Troubleshooting

### Checkout not working
- Verify your Polar access token is correct
- Check that product IDs match between Polar and your environment variables
- Ensure user is authenticated before checkout

### Webhooks not received
- Verify webhook secret matches
- Check webhook URL is publicly accessible
- Review Polar dashboard for webhook delivery status

### Subscription not updating
- Check database permissions for user updates
- Verify webhook handler is processing events correctly
- Check server logs for error messages

## Support

For Polar-specific issues:
- Documentation: [https://polar.sh/docs](https://polar.sh/docs)
- Support: Contact Polar support through their dashboard

For Rōmy integration issues:
- Create an issue in the GitHub repository
- Contact support@romy.chat