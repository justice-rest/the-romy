"use client"

import { AutumnProvider } from "autumn-js/react"

/**
 * Autumn Wrapper Component
 *
 * Wraps the application with Autumn's subscription provider.
 * This enables:
 * - useCustomer() hook for accessing subscription data
 * - Checkout flows for upgrading/downgrading
 * - Feature access checks
 * - Usage tracking
 *
 * Configuration:
 * - backendUrl: Empty string for same-origin (relative URLs)
 * - includeCredentials: true to send cookies with requests (required for Supabase auth)
 */
export function AutumnWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AutumnProvider
      backendUrl="" // Use relative URLs - we're in same origin
      includeCredentials={true} // Include cookies for authentication
    >
      {children}
    </AutumnProvider>
  )
}
