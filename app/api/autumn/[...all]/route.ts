/**
 * Autumn API handler
 * Bridges Autumn's frontend SDK with their backend API
 * Creates /api/autumn/* endpoints for checkout, check, and track functions
 */

import { autumnHandler } from 'autumn-js/next';
import { getSupabaseUser } from '@/lib/user/api';

export const { GET, POST } = autumnHandler({
  identify: async (request) => {
    const { user } = await getSupabaseUser();

    if (!user) {
      return null;
    }

    // Return user information to Autumn
    return {
      customerId: user.id,
      customerData: {
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
      },
    };
  },
});
