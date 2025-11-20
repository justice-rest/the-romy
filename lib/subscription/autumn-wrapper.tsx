"use client"

import { AutumnProvider } from "autumn-js/react"

/**
 * Autumn Subscription Wrapper
 *
 * Wraps the application with Autumn's AutumnProvider to enable
 * subscription management, billing, and feature access control.
 */
export function AutumnWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AutumnProvider backendUrl="/api/autumn">
      {children}
    </AutumnProvider>
  )
}
