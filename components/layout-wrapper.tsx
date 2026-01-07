"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { AuthGuard } from "@/components/auth-guard"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <AuthGuard>
      <div className="flex h-screen">
        <Navigation />
        <main className="flex-1 overflow-auto bg-background">{children}</main>
      </div>
    </AuthGuard>
  )
}
