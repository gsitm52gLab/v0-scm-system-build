"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ClipboardList, Package, Factory, Truck, BarChart3, LogOut, User, Boxes } from "lucide-react"
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
    { href: "/production-performance", label: "생산 실적", icon: BarChart3, role: "생산관리자" },
    { href: "/materials", label: "자재 관리", icon: Boxes, role: "자재관리자" },
    { href: "/shipments", label: "출하 지시", icon: Package, role: "창고관리자" },
    { href: "/dispatch", label: "배차 관리", icon: Truck, role: "창고관리자" },
  ]

  const visibleNavItems = user ? navItems.filter((item) => canAccessPage(user.role, item.href)) : navItems

  return (
    <div className="flex h-screen bg-background">
      {/* LNB - Left Navigation Bar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold text-lg">
              S
            </div>
            <div>
              <span className="font-bold text-lg block">세방리튬배터리</span>
              <span className="text-xs text-muted-foreground">SCM 시스템</span>
            </div>
          </Link>
        </div>

        {user && (
          <div className="p-4 border-b border-border bg-muted/50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user.fullName}</p>
                <p className="text-xs text-muted-foreground">{user.company}</p>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {user.role}
                </Badge>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {user && (
          <div className="p-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={handleLogout} className="w-full justify-start bg-transparent">
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
          </div>
        )}
      </aside>

      {/* Main Content Area - will be used by page content */}
      <div className="flex-1 flex flex-col overflow-hidden" id="main-content">
        {/* Pages will render their content here */}
      </div>
    </div>
  )
}

import { Badge } from "@/components/ui/badge"
