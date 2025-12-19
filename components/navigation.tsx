"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Package,
  Factory,
  Truck,
  BarChart3,
  LogOut,
  User,
  Building2,
  ShoppingCart,
  AlertCircle,
  PackageCheck,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { canAccessPage } from "@/lib/auth";
import { useState, useEffect } from "react";

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // 배지 카운트 가져오기
  useEffect(() => {
    if (!user) return;

    const fetchBadgeCounts = async () => {
      try {
        const [ordersRes, productionsRes] = await Promise.all([
          fetch("/api/orders"),
          fetch("/api/productions"),
        ]);

        const [ordersData, productionsData] = await Promise.all([
          ordersRes.json(),
          productionsRes.json(),
        ]);

        const newBadges: Record<string, number> = {};

        if (ordersData.success) {
          const pendingOrders = ordersData.data.filter(
            (o: any) => o.status === "confirmed" || o.status === "predicted"
          ).length;
          if (pendingOrders > 0) newBadges["/sales"] = pendingOrders;
        }

        if (productionsData.success) {
          const plannedProductions = productionsData.data.filter(
            (p: any) => p.status === "planned"
          ).length;
          if (plannedProductions > 0)
            newBadges["/production"] = plannedProductions;
        }

        setBadges(newBadges);
      } catch (error) {
        console.error("Failed to fetch badge counts:", error);
      }
    };

    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 30000); // 30초마다 업데이트

    return () => clearInterval(interval);
  }, [user]);

  const navGroups = [
    {
      label: "대시보드",
      items: [{ href: "/", label: "대시보드", icon: BarChart3 }],
    },
    {
      label: "주문 관리",
      items: [
        {
          href: "/orders",
          label: "발주 계획",
          icon: ClipboardList,
          role: "영업담당자",
        },
        {
          href: "/urgent-order",
          label: "긴급 주문",
          icon: AlertCircle,
          role: "영업담당자",
        },
        {
          href: "/sales",
          label: "판매 관리",
          icon: Package,
          role: "영업담당자",
        },
        {
          href: "/srm-login",
          label: "SRM 연동",
          icon: Building2,
          role: "영업담당자",
        },
      ],
    },
    {
      label: "생산/구매",
      items: [
        {
          href: "/production",
          label: "생산 관리",
          icon: Factory,
          role: "생산관리자",
        },
        {
          href: "/purchase",
          label: "구매 관리",
          icon: ShoppingCart,
          role: "구매담당자",
        },
      ],
    },
    {
      label: "물류 관리",
      items: [
        {
          href: "/shipping",
          label: "출하 관리",
          icon: PackageCheck,
          role: "창고관리자",
        },
        {
          href: "/dispatch",
          label: "배차 관리",
          icon: Truck,
          role: "창고관리자",
        },
      ],
    },
  ];

  const visibleNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        user
          ? user.role === "관리자"
            ? true
            : canAccessPage(user.role, item.href)
          : true
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <nav className="border-b border-border bg-card shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center hover-lift">
              <div className="relative h-10 w-auto">
                <Image
                  src="/sebang-logo.svg"
                  alt="세방리튬배터리"
                  width={200}
                  height={40}
                  priority
                  className="h-10 w-auto object-contain"
                />
              </div>
              <span className="ml-3 text-sm font-medium text-muted-foreground hidden lg:inline">
                SCM
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {visibleNavGroups
                .flatMap((group) => group.items)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  const badgeCount = badges[item.href];

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden xl:inline">{item.label}</span>
                      {badgeCount && badgeCount > 0 && (
                        <Badge
                          variant="error"
                          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <>
                <div className="hidden md:flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.fullName.charAt(0)}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{user.fullName}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.role}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="hidden md:flex"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  로그아웃
                </Button>
              </>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border py-4 space-y-4">
            {visibleNavGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                  {group.label}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    const badgeCount = badges[item.href];

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </div>
                        {badgeCount && badgeCount > 0 && (
                          <Badge variant="error" className="ml-2">
                            {badgeCount}
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            {user && (
              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.fullName.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{user.fullName}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.role}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  로그아웃
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
