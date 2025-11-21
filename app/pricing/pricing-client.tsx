'use client';

/**
 * Client-side pricing component
 * Renders the MM PricingComponent with Autumn checkout integration
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCustomer } from 'autumn-js/react';
import type { UserProfile } from '@/lib/user/types';
import type { SubscriptionTier } from '@/lib/subscriptions/types';
import { getTierDisplayName } from '@/lib/subscriptions/check-access';

// Copied exactly from MM/src/src/PricingComponent.tsx - NO MODIFICATIONS
interface PricingFeatureProps {
  children: React.ReactNode;
  dataId?: string;
}

const PricingFeature: React.FC<PricingFeatureProps> = ({
  children,
  dataId
}) => {
  return <li className="flex items-center space-x-2 mb-4" data-id={dataId}>
      <span className="text-gray-400 text-xl">•</span>
      <span className="text-gray-300">{children}</span>
    </li>;
};

interface PricingCardProps {
  title: string;
  price: string;
  period?: string;
  visitors: string;
  features: string[];
  ctaText: string;
  ctaVariant: 'outline' | 'solid';
  badge?: string;
  dataId?: string;
  onCtaClick?: () => void;
  disabled?: boolean;
  currentPlan?: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({
  title,
  price,
  period,
  visitors,
  features,
  ctaText,
  ctaVariant,
  badge,
  dataId,
  onCtaClick,
  disabled,
  currentPlan,
}) => {
  return <div className="flex flex-col w-full px-8 py-12" data-id={dataId}>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-4xl font-medium text-gray-200">{title}</h2>
        {badge && <span className="px-3 py-1 text-sm font-medium text-red-500 bg-red-500/10 border border-red-500/20 rounded-full">
            {badge}
          </span>}
        {currentPlan && <span className="px-3 py-1 text-sm font-medium text-blue-500 bg-blue-500/10 border border-blue-500/20 rounded-full">
            Current Plan
          </span>}
      </div>
      <div className="mb-10">
        <p className="text-3xl text-gray-300 mb-2">
          {price}
          {period && <span className="text-lg text-gray-400">{period}</span>}
        </p>
      </div>
      <ul className="mb-12">
        {features.map((feature, index) => <PricingFeature key={index}>{feature}</PricingFeature>)}
      </ul>
      <div className="mt-auto">
        <button
          onClick={onCtaClick}
          disabled={disabled}
          className={`w-full py-4 text-lg rounded-md transition-colors ${
            disabled
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed border border-gray-600'
              : ctaVariant === 'outline'
                ? 'border border-red-600 text-red-500 bg-transparent hover:bg-red-700 hover:text-white hover:border-red-700'
                : 'bg-red-700 text-white border border-red-700 hover:bg-transparent hover:text-red-500 hover:border-red-600'
          }`}
        >
          {ctaText}
        </button>
      </div>
    </div>;
};

interface PricingPageClientProps {
  user: UserProfile;
}

export function PricingPageClient({ user }: PricingPageClientProps) {
  const router = useRouter();
  const { customer, checkout, isLoading } = useCustomer();

  // Get current plan from Autumn's customer state
  const currentProductId = customer?.products?.[0]?.id || null;
  const hasActiveSubscription = customer?.products?.some(p => p.status === 'active') || false;

  const handleSelectPlan = async (tier: Exclude<SubscriptionTier, 'free'>) => {
    // Don't allow selecting current plan
    if (currentProductId === tier && hasActiveSubscription) {
      return;
    }

    try {
      // Trigger Autumn checkout
      await checkout({
        productId: tier, // This should match the product IDs configured in Autumn dashboard
      });

      // After successful checkout, Autumn handles everything
      // No webhooks needed - Autumn manages the subscription state
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-400">
            Unlock powerful AI tools for your nonprofit fundraising
          </p>
          {hasActiveSubscription && currentProductId && (
            <p className="mt-4 text-sm text-gray-500">
              Current plan: <span className="text-white font-medium capitalize">{currentProductId}</span>
            </p>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="w-full bg-[#1a1520] text-white rounded-xl overflow-hidden">
          <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-700">
            <PricingCard
              title="Pro"
              price="$29"
              period="/month"
              visitors=""
              features={[
                '100 messages per month',
                'File uploads',
                'Email support'
              ]}
              ctaText={
                currentProductId === 'pro' && hasActiveSubscription
                  ? 'Current Plan'
                  : isLoading
                    ? 'Loading...'
                    : 'Get Started'
              }
              ctaVariant="outline"
              onCtaClick={() => handleSelectPlan('pro')}
              disabled={isLoading || (currentProductId === 'pro' && hasActiveSubscription)}
              currentPlan={currentProductId === 'pro' && hasActiveSubscription}
            />
            <PricingCard
              title="Max"
              price="$89"
              period="/month"
              visitors=""
              features={[
                'Unlimited messages',
                'Dedicated support',
                'Everything in Pro'
              ]}
              ctaText={
                currentProductId === 'max' && hasActiveSubscription
                  ? 'Current Plan'
                  : isLoading
                    ? 'Loading...'
                    : 'Get Started'
              }
              ctaVariant="solid"
              badge="Popular"
              onCtaClick={() => handleSelectPlan('max')}
              disabled={isLoading || (currentProductId === 'max' && hasActiveSubscription)}
              currentPlan={currentProductId === 'max' && hasActiveSubscription}
            />
            <PricingCard
              title="Ultra"
              price="$200"
              period="/month"
              visitors=""
              features={[
                'Everything in Max',
                'Fundraising consultation',
                'Access to all our AI models'
              ]}
              ctaText={
                currentProductId === 'ultra' && hasActiveSubscription
                  ? 'Current Plan'
                  : isLoading
                    ? 'Loading...'
                    : 'Get Started'
              }
              ctaVariant="outline"
              onCtaClick={() => handleSelectPlan('ultra')}
              disabled={isLoading || (currentProductId === 'ultra' && hasActiveSubscription)}
              currentPlan={currentProductId === 'ultra' && hasActiveSubscription}
            />
          </div>
        </div>

        {/* Back to app link */}
        <div className="text-center mt-12">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Rōmy
          </button>
        </div>
      </div>
    </div>
  );
}
