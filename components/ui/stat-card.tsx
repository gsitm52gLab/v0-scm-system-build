import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  trend?: {
    value: number
    direction: "up" | "down" | "neutral"
  }
  variant?: "default" | "success" | "warning" | "error" | "info"
  highlight?: boolean
  loading?: boolean
  suffix?: string
  description?: string
  className?: string
}

const variantStyles = {
  default: {
    bg: "bg-[rgb(240,242,243)]",
    icon: "text-[rgb(35,45,51)]",
    border: "border-[rgb(181,186,191)]",
  },
  success: {
    bg: "bg-[rgb(230,248,246)]",
    icon: "text-[rgb(0,170,156)]",
    border: "border-[rgb(0,170,156)]",
  },
  warning: {
    bg: "bg-[rgb(245,241,232)]",
    icon: "text-[rgb(181,151,96)]",
    border: "border-[rgb(181,151,96)]",
  },
  error: {
    bg: "bg-[rgb(255,235,236)]",
    icon: "text-[rgb(255,42,57)]",
    border: "border-[rgb(255,42,57)]",
  },
  info: {
    bg: "bg-[rgb(240,242,243)]",
    icon: "text-[rgb(35,45,51)]",
    border: "border-[rgb(35,45,51)]",
  },
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  variant = "default",
  highlight = false,
  loading = false,
  suffix = "",
  description,
  className,
}: StatCardProps) {
  const styles = variantStyles[variant]

  const getTrendIcon = () => {
    if (!trend) return null
    if (trend.direction === "up") return <TrendingUp className="w-4 h-4" />
    if (trend.direction === "down") return <TrendingDown className="w-4 h-4" />
    return <Minus className="w-4 h-4" />
  }

  const getTrendColor = () => {
    if (!trend) return ""
    if (trend.direction === "up") return "text-[rgb(0,170,156)]"
    if (trend.direction === "down") return "text-[rgb(255,42,57)]"
    return "text-[rgb(181,186,191)]"
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        highlight && "ring-2 ring-primary shadow-lg",
        !loading && "hover-lift cursor-pointer",
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {label}
            </p>
            {loading ? (
              <div className="space-y-2">
                <div className="h-8 w-24 skeleton rounded" />
                <div className="h-4 w-16 skeleton rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold tracking-tight">
                    {typeof value === "number" ? value.toLocaleString() : value}
                  </h3>
                  {suffix && (
                    <span className="text-lg font-medium text-muted-foreground">
                      {suffix}
                    </span>
                  )}
                </div>
                {trend && (
                  <div className={cn("flex items-center gap-1 mt-2", getTrendColor())}>
                    {getTrendIcon()}
                    <span className="text-sm font-medium">
                      {trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : ""}
                      {Math.abs(trend.value)}%
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      전일 대비
                    </span>
                  </div>
                )}
                {description && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {description}
                  </p>
                )}
              </>
            )}
          </div>
          <div
            className={cn(
              "p-3 rounded-lg",
              styles.bg,
              loading && "skeleton"
            )}
          >
            <div className={cn("w-6 h-6", styles.icon)}>
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

