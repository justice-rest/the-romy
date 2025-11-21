/**
 * Polar.sh client initialization and configuration
 */

import { Polar } from '@polar-sh/sdk';

// Initialize Polar SDK client
export const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN || '',
  server: process.env.NEXT_PUBLIC_POLAR_ENV === 'sandbox' ? 'sandbox' : 'production',
});

/**
 * Check if Polar is properly configured
 */
export function isPolarConfigured(): boolean {
  return !!process.env.POLAR_ACCESS_TOKEN;
}

/**
 * Get Polar environment (sandbox or production)
 */
export function getPolarEnv(): 'sandbox' | 'production' {
  return process.env.NEXT_PUBLIC_POLAR_ENV === 'sandbox' ? 'sandbox' : 'production';
}