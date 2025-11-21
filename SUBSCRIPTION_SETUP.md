# Autumn Subscription Setup Guide

**Simple setup - no webhooks required!** Autumn manages all subscription state for you.

## ✅ What's Already Done

- ✅ Database migration applied (subscription fields added)
- ✅ Autumn SDK installed (`autumn-js@0.1.48`)
- ✅ Pricing page created at `/pricing`
- ✅ AutumnProvider wrapped around app
- ✅ MM PricingComponent integrated (no styling changes)

## 🚀 Quick Setup (3 Steps)

### Step 1: Get Autumn API Key

1. Go to [Autumn Dashboard](https://app.useautumn.com/dev)
2. Copy your Secret API Key
3. Add to `.env.local`:

```bash
AUTUMN_SECRET_KEY=am_sk_your_secret_key_here
```

### Step 2: Configure Products in Autumn

In Autumn dashboard, create 3 products:

| Product ID | Name | Price | Billing |
|------------|------|-------|---------|
| `pro` | Pro | $29 | Monthly |
| `max` | Max | $89 | Monthly |
| `ultra` | Ultra | $200 | Monthly |

**Important**: Product IDs must exactly match: `pro`, `max`, `ultra`

### Step 3: Configure Features (Optional)

If you want usage tracking/limits:

1. In Autumn dashboard, create a feature called `messages`
2. Configure limits per product:
   - Pro: 100 messages/month
   - Max: Unlimited
   - Ultra: Unlimited

That's it! No webhooks to configure.

## 🧪 Testing

```bash
# Start dev server
npm run dev

# Visit pricing page
open http://localhost:3000/pricing

# Test checkout with Stripe test card
# Card: 4242 4242 4242 4242
# Any future expiry, any CVC
```

## 📋 Subscription Tiers

| Tier | Price | Messages | Models | Features |
|------|-------|----------|--------|----------|
| **Free** | $0 | 1000/day | Free models | Basic access |
| **Pro** | $29/mo | 100/month | Pro models | Email support |
| **Max** | $89/mo | Unlimited | Pro models | Dedicated support |
| **Ultra** | $200/mo | Unlimited | All models | Fundraising consultation |

## 🔄 How It Works

### Checkout Flow
1. User clicks "Get Started" on `/pricing`
2. `useCustomer().checkout({ productId })` opens Stripe checkout
3. User completes payment
4. **Autumn automatically activates subscription**
5. User has immediate access - no webhooks!

### Access Control

**Client-side** (use Autumn's hook):
```tsx
import { useCustomer } from 'autumn-js/react'

function MyComponent() {
  const { customer, check } = useCustomer()

  // Check current subscription
  const hasProPlan = customer?.products?.some(
    p => p.product_id === 'pro' && p.status === 'active'
  )

  // Check feature access
  const { data } = check({ featureId: 'messages' })
  if (!data?.allowed) {
    // Show upgrade prompt
  }
}
```

**Server-side** (use Autumn API):
```typescript
import { checkMessageAccess, trackMessageUsage } from '@/lib/subscriptions/autumn-check'

// Check access
const access = await checkMessageAccess(userId)
if (!access.allowed) {
  throw new Error('Upgrade to continue')
}

// Track usage
await trackMessageUsage(userId)
```

## 🔧 Key Files

### Configuration
- `.env.local` - Just add `AUTUMN_SECRET_KEY`
- `/lib/subscriptions/config.ts` - Tier limits

### Frontend
- `/app/pricing/page.tsx` - Pricing page
- `/app/pricing/pricing-client.tsx` - Checkout integration
- `/app/layout.tsx` - AutumnProvider wrapper

### Backend
- `/app/api/autumn/[...all]/route.ts` - Autumn API handler
- `/lib/subscriptions/autumn-check.ts` - Access control helpers

## ❓ FAQ

**Q: Do I need to set up webhooks?**
A: No! Autumn manages all subscription state. No webhooks required.

**Q: Where is subscription data stored?**
A: In Autumn's database. Your local DB fields are optional for analytics.

**Q: How do I check a user's current plan?**
A: Use `useCustomer()` hook - check `customer.products` array.

**Q: How do I implement usage limits?**
A: Configure features in Autumn dashboard, use `check()` before actions, `track()` after.

**Q: Can users manage their subscription?**
A: Yes! Use `openBillingPortal()` from `useCustomer()` hook.

**Q: What if Autumn is down?**
A: The `checkMessageAccess()` helper fails open (allows access) by default.

## 🎯 Next Steps

1. **Add AUTUMN_SECRET_KEY** to `.env.local`
2. **Create products** in Autumn dashboard (pro, max, ultra)
3. **Test checkout** with Stripe test card
4. **Configure features** (optional) for usage tracking

## 📚 Resources

- [Autumn Documentation](https://docs.useautumn.com)
- [Autumn Dashboard](https://app.useautumn.com)
- [autumn-js GitHub](https://github.com/useautumn/autumn-js)
- [Stripe Test Cards](https://stripe.com/docs/testing)

---

**That's it!** Autumn handles all the complexity. No webhooks, no sync issues, just works. 🎉
