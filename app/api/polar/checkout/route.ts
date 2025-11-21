/**
 * Polar.sh checkout API route
 * Creates a checkout session for subscription purchases
 */

import { NextRequest, NextResponse } from 'next/server';
import { polarClient } from '@/lib/subscriptions/polar-client';
import { getOrCreatePolarCustomer } from '@/lib/subscriptions/polar-check';
import { createClient } from '@/lib/supabase/server';

// Map our tier names to Polar product IDs
// TODO: Update these with actual Polar product IDs once created in Polar dashboard
const PRODUCT_ID_MAP: Record<string, string> = {
  'pro': process.env.POLAR_PRODUCT_ID_PRO || 'pro',
  'max': process.env.POLAR_PRODUCT_ID_MAX || 'max',
  'ultra': process.env.POLAR_PRODUCT_ID_ULTRA || 'ultra',
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, customerEmail, customerId, customerName } = body;

    // Validate product tier
    if (!['pro', 'max', 'ultra'].includes(productId)) {
      return NextResponse.json(
        { error: 'Invalid product tier' },
        { status: 400 }
      );
    }

    // Get or create Polar customer
    const polarCustomer = await getOrCreatePolarCustomer(
      customerEmail || user.email!,
      customerId || user.id,
      customerName
    );

    if (!polarCustomer) {
      return NextResponse.json(
        { error: 'Failed to create customer' },
        { status: 500 }
      );
    }

    // Get the actual Polar product ID
    const polarProductId = PRODUCT_ID_MAP[productId];

    // Create checkout session
    const checkout = await polarClient.checkouts.create({
      productPriceId: polarProductId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/subscription/success`,
      customerId: polarCustomer.id,
      // Optional: Add metadata to track the checkout
      metadata: {
        userId: user.id,
        tier: productId,
      },
    });

    return NextResponse.json({
      checkoutUrl: checkout.url,
      checkoutId: checkout.id,
    });
  } catch (error) {
    console.error('Checkout creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}