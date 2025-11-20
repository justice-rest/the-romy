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
 * In development, we use relative URLs (empty string).
 * In production, we need to provide the full domain with https:// scheme
 * for the Autumn SDK to construct proper API URLs.
 */
export function AutumnWrapper({ children }: { children: React.ReactNode }) {
  // Get the backend URL based on environment
  const backendUrl =
    process.env.NODE_ENV === "development"
      ? "" // In dev, relative URLs work fine
      : typeof window !== "undefined"
        ? window.location.origin // Client-side: use current origin
        : process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` // Server-side: construct from env var
          : "" // Fallback to relative URL

  return <AutumnProvider backendUrl={backendUrl}>{children}</AutumnProvider>
}
