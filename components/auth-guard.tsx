"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { canAccessPage } from "@/lib/auth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Allow access to login page without authentication
    if (pathname === "/login") {
      return
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    // Check if user has access to current page
    if (user && !canAccessPage(user.role, pathname)) {
      router.push("/")
    }
  }, [isAuthenticated, user, pathname, router])

  // Show loading or nothing while checking auth
  if (pathname !== "/login" && !isAuthenticated) {
    return null
  }

  // Check page access permission
  if (pathname !== "/login" && user && !canAccessPage(user.role, pathname)) {
    return null
  }

  return <>{children}</>
}
