"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Package, Factory, Truck, AlertCircle } from "lucide-react"
import Link from "next/link"
import type { Order, Production, Inventory, Dispatch } from "@/lib/db"
import { Progress } from "@/components/ui/progress"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  Line,
  LineChart,
} from "recharts"

const COLORS = {
  hyundai: "#004B91",
  samsung: "#0066CC",
  EV: "#0088FE",
  SUV: "#00C49F",
  factory1: "#FF8042",
  factory2: "#FFBB28",
}

export default function HomePage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [productions, setProductions] = useState<Production[]>([])
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [dispatches, setDispatches] = useState<Dispatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initializeData()
  }, [])

  const initializeData = async () => {
    try {
      // Initialize database
      await fetch("/api/init")

      // Fetch all data
      const [ordersRes, productionsRes, inventoryRes, dispatchesRes] = await Promise.all([
        fetch("/api/orders"),
        fetch("/api/productions"),
        fetch("/api/inventory"),
        fetch("/api/dispatch"),
      ])

      const [ordersData, productionsData, inventoryData, dispatchesData] = await Promise.all([
        ordersRes.json(),
        productionsRes.json(),
        inventoryRes.json(),
        dispatchesRes.json(),
      ])

      if (ordersData.success) setOrders(ordersData.data)
      if (productionsData.success) setProductions(productionsData.data)
      if (inventoryData.success) setInventory(inventoryData.data)
      if (dispatchesData.success) setDispatches(dispatchesData.data)

      setLoading(false)
    } catch (error) {
      console.error("[v0] Failed to initialize:", error)
      setLoading(false)
    }
  }

  // Calculate statistics
  const stats = {
    totalOrders: orders.length,
    totalProductions: productions.length,
    totalInventory: inventory.reduce((sum, i) => sum + i.quantity, 0),
    totalDispatch: dispatches.length,
    pendingOrders: orders.filter((o) => o.status === "confirmed").length,
    completedProductions: productions.filter((p) => p.status === "inspected").length,
    pendingDispatches: dispatches.filter((d) => d.status === "planned").length,
  }

  // Customer share data
  const customerData = [
    {
      name: "현대차",
      value: orders.filter((o) => o.customer === "현대차").reduce((sum, o) => sum + o.confirmedQuantity, 0),
    },
    {
      name: "삼성SDI",
      value: orders.filter((o) => o.customer === "삼성SDI").reduce((sum, o) => sum + o.confirmedQuantity, 0),
    },
  ]

  // Product distribution
  const productData = [
    {
      name: "EV",
      value: orders.filter((o) => o.product === "EV").reduce((sum, o) => sum + o.confirmedQuantity, 0),
    },
    {
      name: "SUV",
      value: orders.filter((o) => o.product === "SUV").reduce((sum, o) => sum + o.confirmedQuantity, 0),
    },
  ]

  // Factory production
  const factoryData = [
    {
      name: "광주1공장",
      planned: productions
        .filter((p) => p.productionLine === "광주1공장")
        .reduce((sum, p) => sum + p.plannedQuantity, 0),
      completed: productions
        .filter((p) => p.productionLine === "광주1공장")
        .reduce((sum, p) => sum + p.inspectedQuantity, 0),
    },
    {
      name: "광주2공장",
      planned: productions
        .filter((p) => p.productionLine === "광주2공장")
        .reduce((sum, p) => sum + p.plannedQuantity, 0),
      completed: productions
        .filter((p) => p.productionLine === "광주2공장")
        .reduce((sum, p) => sum + p.inspectedQuantity, 0),
    },
  ]

  // Monthly trend (last 6 months)
  const monthlyData = (() => {
    const months = ["2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"]
    return months.map((month) => ({
      month: month.slice(5),
      orders: orders.filter((o) => o.orderDate === month).reduce((sum, o) => sum + o.confirmedQuantity, 0),
    }))
  })()

  const quickActions = [
    {
      title: "발주 계획",
      description: "당월 발주 예측 데이터 확인 및 수정",
      icon: BarChart3,
      href: "/orders",
      color: "text-blue-600",
      alert: stats.pendingOrders > 0 ? `${stats.pendingOrders}건 대기` : null,
    },
    {
      title: "판매 계획",
      description: "발주 승인 및 생산 이관",
      icon: Package,
      href: "/sales",
      color: "text-green-600",
      alert: stats.pendingOrders > 0 ? `${stats.pendingOrders}건 승인 필요` : null,
    },
    {
      title: "생산 계획",
      description: "공장별 생산 수량 입력",
      icon: Factory,
      href: "/production",
      color: "text-orange-600",
      alert:
        productions.filter((p) => p.status === "planned").length > 0
          ? `${productions.filter((p) => p.status === "planned").length}건 생산 계획`
          : null,
    },
    {
      title: "배차 관리",
      description: "출하 계획 및 배차 현황",
      icon: Truck,
      href: "/dispatch",
      color: "text-purple-600",
      alert: stats.pendingDispatches > 0 ? `${stats.pendingDispatches}건 대기` : null,
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12 text-muted-foreground">데이터를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">세방산업 통합 SCM 시스템</h1>
          <p className="text-muted-foreground text-lg">발주-생산-출하 관리를 한 곳에서</p>
        </div>

        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>총 발주 건수</CardDescription>
              <CardTitle className="text-3xl">{stats.totalOrders}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">2024-2025 누적</p>
              <Progress
                value={(stats.totalOrders / 100) * 100}
                className="h-2 mt-2"
                style={
                  {
                    "--progress-background": "oklch(0.35 0.15 250)",
                  } as React.CSSProperties
                }
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>생산 완료 건수</CardDescription>
              <CardTitle className="text-3xl">{stats.completedProductions}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">검수 완료 기준</p>
              <Progress
                value={(stats.completedProductions / stats.totalProductions) * 100}
                className="h-2 mt-2"
                style={
                  {
                    "--progress-background": "oklch(0.6 0.12 200)",
                  } as React.CSSProperties
                }
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>현재 재고</CardDescription>
              <CardTitle className="text-3xl">{stats.totalInventory.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">총 보유 수량</p>
              <div className="flex gap-2 mt-2">
                {inventory.map((inv) => (
                  <div key={inv.id} className="text-xs bg-secondary px-2 py-1 rounded">
                    {inv.product}: {inv.quantity}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>배차 완료</CardDescription>
              <CardTitle className="text-3xl">{stats.totalDispatch}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">총 배차 건수</p>
              <Progress
                value={(stats.totalDispatch / (stats.totalDispatch + 10)) * 100}
                className="h-2 mt-2"
                style={
                  {
                    "--progress-background": "oklch(0.65 0.18 150)",
                  } as React.CSSProperties
                }
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>발주사별 점유율</CardTitle>
              <CardDescription>확정 수량 기준</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={customerData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) =>
                      `${entry.name}: ${((entry.value / customerData.reduce((s, d) => s + d.value, 0)) * 100).toFixed(1)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill={COLORS.hyundai} />
                    <Cell fill={COLORS.samsung} />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>품목별 분포</CardTitle>
              <CardDescription>발주 수량 기준</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={productData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) =>
                      `${entry.name}: ${((entry.value / productData.reduce((s, d) => s + d.value, 0)) * 100).toFixed(1)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill={COLORS.EV} />
                    <Cell fill={COLORS.SUV} />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>공장별 생산 현황</CardTitle>
              <CardDescription>계획 대비 실적</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={factoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="planned" fill={COLORS.factory1} name="계획수량" />
                  <Bar dataKey="completed" fill={COLORS.factory2} name="완료수량" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>월별 발주 추이</CardTitle>
              <CardDescription>최근 6개월</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="orders" stroke={COLORS.hyundai} name="발주수량" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">빠른 작업</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.href} href={action.href}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full relative">
                    {action.alert && (
                      <div className="absolute top-3 right-3">
                        <div className="flex items-center gap-1 bg-destructive text-destructive-foreground px-2 py-1 rounded-full text-xs font-medium">
                          <AlertCircle className="w-3 h-3" />
                          {action.alert}
                        </div>
                      </div>
                    )}
                    <CardHeader>
                      <Icon className={`w-8 h-8 ${action.color} mb-2`} />
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>시스템 안내</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-l-4 border-primary pl-4">
              <h3 className="font-semibold mb-1">발주사 (현대차, 삼성SDI)</h3>
              <p className="text-sm text-muted-foreground">
                발주 계획 화면에서 예측 데이터를 확인하고 수정하여 최종 발주를 확정합니다.
              </p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <h3 className="font-semibold mb-1">창고관리자</h3>
              <p className="text-sm text-muted-foreground">
                판매 계획에서 발주를 승인하고, 출하 계획과 배차 관리를 수행합니다.
              </p>
            </div>
            <div className="border-l-4 border-orange-600 pl-4">
              <h3 className="font-semibold mb-1">생산관리자</h3>
              <p className="text-sm text-muted-foreground">
                생산 계획 화면에서 광주1공장/2공장별 일자별 입고 수량을 입력합니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
