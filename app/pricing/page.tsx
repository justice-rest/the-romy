/**
 * Pricing page
 * Displays subscription tiers and handles Autumn checkout integration
 */

import { PricingPageClient } from './pricing-client';
import { getUserProfile } from '@/lib/user/api';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Pricing - Rōmy',
  description: 'Choose the perfect plan for your nonprofit fundraising needs',
};

export default async function PricingPage() {
  const user = await getUserProfile();

  // If user is not authenticated, redirect to home to sign in
  if (!user) {
    redirect('/?signin=true');
  }

  return <PricingPageClient user={user} />;
}
