"use client"

import { AutumnProvider } from "autumn-js/react"

/**
 * Autumn Wrapper Component
 *
 * Wraps the application with Autumn's subscription provider for Next.js.
 * This enables:
 * - useCustomer() hook for accessing subscription data
 * - Checkout flows for upgrading/downgrading
 * - Feature access checks
 * - Usage tracking
 *
 * The autumnHandler at /api/autumn/[...all]/route.ts handles user identification
 * via Supabase auth, so the provider doesn't need explicit configuration.
 */
export function AutumnWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AutumnProvider>
      {children}
    </AutumnProvider>
  )
}
