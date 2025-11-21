/**
 * Subscription status API route
 * Returns the current user's subscription tier and status from Polar
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCustomerTier } from '@/lib/subscriptions/polar-check';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { tier: 'free', authenticated: false },
        { status: 200 }
      );
    }

    // Get user's current tier from Polar
    const tier = await getCustomerTier(user.email!, user.id);

    return NextResponse.json({
      tier,
      authenticated: true,
      userId: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    return NextResponse.json(
      { tier: 'free', error: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}