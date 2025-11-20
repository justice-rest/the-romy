"use client"

import { AutumnProvider } from "autumn-js/react"

/**
 * Autumn Wrapper Component - Clean Implementation
 *
 * Wraps the application with Autumn's React provider.
 *
 * This enables all Autumn React hooks throughout the app:
 * - useCustomer() - Access customer data, subscriptions, and usage
 * - checkout() - Handle subscription purchases
 * - openBillingPortal() - Manage payment methods
 * - track() - Record usage events
 * - check() - Verify feature access
 *
 * The provider communicates with /api/autumn/[...all] endpoints,
 * which handle user identification and forward requests to Autumn's API.
 *
 * Configuration:
 * - backendUrl defaults to "" (same origin) for Next.js full-stack apps
 * - User authentication handled by autumnHandler's identify function
 */
export function AutumnWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AutumnProvider backendUrl="">
      {children}
    </AutumnProvider>
  )
}
