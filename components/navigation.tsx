"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ClipboardList, Package, Factory, Truck, BarChart3, LogOut, User } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { canAccessPage } from "@/lib/auth"

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const navItems = [
    { href: "/", label: "대시보드", icon: BarChart3 },
    { href: "/orders", label: "발주 계획", icon: ClipboardList, role: "발주사" },
    { href: "/sales", label: "판매 계획", icon: Package, role: "창고관리자" },
    { href: "/production", label: "생산 계획", icon: Factory, role: "생산관리자" },
    { href: "/dispatch", label: "배차 관리", icon: Truck, role: "창고관리자" },
  ]

  const visibleNavItems = user ? navItems.filter((item) => canAccessPage(user.role, item.href)) : navItems

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold">
                S
              </div>
              <span className="font-bold text-lg">세방산업 SCM</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    {item.role && <span className="text-xs bg-secondary px-2 py-0.5 rounded">{item.role}</span>}
                  </Link>
                )
              })}
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4" />
                <div className="flex flex-col items-end">
                  <span className="font-medium">{user.fullName}</span>
                  <span className="text-xs text-muted-foreground">{user.role}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-1" />
                로그아웃
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
