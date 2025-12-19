"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import {
  BarChart3,
  Package,
  Factory,
  Truck,
  AlertCircle,
  ShoppingCart,
  TrendingUp,
  Clock,
  CheckCircle2,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import type { Order, Production, Inventory, Dispatch } from "@/lib/db";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
} from "recharts";

const COLORS = {
  hyundai: "rgb(35, 45, 51)", // SEBANG Dark Gray
  samsung: "rgb(181, 186, 191)", // SEBANG Gray
  EV: "rgb(0, 170, 156)", // SEBANG Green
  SUV: "rgb(181, 151, 96)", // SEBANG Gold
  factory1: "rgb(35, 45, 51)", // SEBANG Dark Gray
  factory2: "rgb(0, 170, 156)", // SEBANG Green
};

export default function HomePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      // Initialize database
      await fetch("/api/init");

      // Fetch all data
      const [ordersRes, productionsRes, inventoryRes, dispatchesRes] =
        await Promise.all([
          fetch("/api/orders"),
          fetch("/api/productions"),
          fetch("/api/inventory"),
          fetch("/api/dispatch"),
        ]);

      const [ordersData, productionsData, inventoryData, dispatchesData] =
        await Promise.all([
          ordersRes.json(),
          productionsRes.json(),
          inventoryRes.json(),
          dispatchesRes.json(),
        ]);

      if (ordersData.success) setOrders(ordersData.data);
      if (productionsData.success) setProductions(productionsData.data);
      if (inventoryData.success) setInventory(inventoryData.data);
      if (dispatchesData.success) setDispatches(dispatchesData.data);

      setLoading(false);
    } catch (error) {
      console.error("[v0] Failed to initialize:", error);
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = {
    totalOrders: orders.length,
    totalProductions: productions.length,
    totalInventory: inventory.reduce((sum, i) => sum + i.quantity, 0),
    totalDispatch: dispatches.length,
    pendingOrders: orders.filter(
      (o) => o.status === "confirmed" || o.status === "predicted"
    ).length,
    completedProductions: productions.filter((p) => p.status === "inspected")
      .length,
    pendingDispatches: dispatches.filter((d) => d.status === "planned").length,
    inProgressProductions: productions.filter((p) => p.status === "in_progress")
      .length,
    todayOrders: orders.filter((o) => {
      const today = new Date().toISOString().split("T")[0];
      return o.orderDate.startsWith(today);
    }).length,
    todayProductions: productions.filter((p) => {
      const today = new Date().toISOString().split("T")[0];
      return p.productionDate.startsWith(today);
    }).length,
  };

  // 전일 대비 계산 (임시 데이터)
  const trends = {
    orders: 5.2,
    productions: 3.8,
    inventory: -2.1,
    dispatch: 8.5,
  };

  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Customer share data
  const customerData = [
    {
      name: "현대차",
      value: orders
        .filter((o) => o.customer === "현대차")
        .reduce((sum, o) => sum + o.confirmedQuantity, 0),
    },
    {
      name: "삼성SDI",
      value: orders
        .filter((o) => o.customer === "삼성SDI")
        .reduce((sum, o) => sum + o.confirmedQuantity, 0),
    },
  ];

  // Product distribution
  const productData = [
    {
      name: "EV",
      value: orders
        .filter((o) => o.product === "EV")
        .reduce((sum, o) => sum + o.confirmedQuantity, 0),
    },
    {
      name: "SUV",
      value: orders
        .filter((o) => o.product === "SUV")
        .reduce((sum, o) => sum + o.confirmedQuantity, 0),
    },
  ];

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
      name: "음성공장",
      planned: productions
        .filter((p) => p.productionLine === "음성공장")
        .reduce((sum, p) => sum + p.plannedQuantity, 0),
      completed: productions
        .filter((p) => p.productionLine === "음성공장")
        .reduce((sum, p) => sum + p.inspectedQuantity, 0),
    },
  ];

  // Monthly trend (last 6 months)
  const monthlyData = (() => {
    const months = [
      "2025-07",
      "2025-08",
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
    ];
    return months.map((month) => ({
      month: month.slice(5),
      orders: orders
        .filter((o) => o.orderDate === month)
        .reduce((sum, o) => sum + o.confirmedQuantity, 0),
    }));
  })();

  const quickActions = [
    {
      title: "발주 계획",
      description: "당월 발주 예측 데이터 확인 및 수정",
      icon: BarChart3,
      href: "/orders",
      color: "text-[rgb(35,45,51)]", // SEBANG Dark Gray
      alert: stats.pendingOrders > 0 ? `${stats.pendingOrders}건 대기` : null,
    },
    {
      title: "판매 계획",
      description: "발주 승인 및 생산 이관",
      icon: Package,
      href: "/sales",
      color: "text-[rgb(0,170,156)]", // SEBANG Green
      alert:
        stats.pendingOrders > 0 ? `${stats.pendingOrders}건 승인 필요` : null,
    },
    {
      title: "생산 계획",
      description: "공장별 생산 수량 입력",
      icon: Factory,
      href: "/production",
      color: "text-[rgb(181,151,96)]", // SEBANG Gold
      alert:
        productions.filter((p) => p.status === "planned").length > 0
          ? `${
              productions.filter((p) => p.status === "planned").length
            }건 생산 계획`
          : null,
    },
    {
      title: "배차 관리",
      description: "출하 계획 및 배차 현황",
      icon: Truck,
      href: "/dispatch",
      color: "text-[rgb(181,186,191)]", // SEBANG Gray
      alert:
        stats.pendingDispatches > 0
          ? `${stats.pendingDispatches}건 대기`
          : null,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard
              label="총 주문"
              value={0}
              icon={<ShoppingCart />}
              loading={true}
            />
            <StatCard
              label="생산 현황"
              value={0}
              icon={<Factory />}
              loading={true}
            />
            <StatCard
              label="현재 재고"
              value={0}
              icon={<Package />}
              loading={true}
            />
            <StatCard
              label="출하 완료"
              value={0}
              icon={<Truck />}
              loading={true}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              세방리튬배터리 SCM 대시보드
            </h1>
            <p className="text-muted-foreground text-lg">
              실시간 발주-생산-출하 통합 관리
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              마지막 업데이트: {lastUpdate.toLocaleTimeString("ko-KR")}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                initializeData();
                setLastUpdate(new Date());
              }}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              새로고침
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="총 주문"
            value={stats.totalOrders}
            icon={<ShoppingCart />}
            trend={{ value: trends.orders, direction: "up" }}
            variant="info"
            suffix="건"
            description={`승인 대기: ${stats.pendingOrders}건`}
            highlight={stats.pendingOrders > 0}
          />
          <StatCard
            label="생산 현황"
            value={stats.completedProductions}
            icon={<Factory />}
            trend={{ value: trends.productions, direction: "up" }}
            variant="warning"
            suffix="건"
            description={`진행중: ${stats.inProgressProductions}건`}
          />
          <StatCard
            label="현재 재고"
            value={stats.totalInventory}
            icon={<Package />}
            trend={{ value: Math.abs(trends.inventory), direction: "down" }}
            variant="success"
            suffix="대"
            description="총 보유 수량"
          />
          <StatCard
            label="출하 완료"
            value={stats.totalDispatch}
            icon={<PackageCheck />}
            trend={{ value: trends.dispatch, direction: "up" }}
            variant="default"
            suffix="건"
            description={`대기: ${stats.pendingDispatches}건`}
          />
        </div>

        {/* Alert Section */}
        {(stats.pendingOrders > 0 || stats.inProgressProductions > 0) && (
          <Card className="border-[rgb(181,151,96)] bg-[rgb(245,241,232)]">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[rgb(181,151,96)] mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-[rgb(181,151,96)] mb-2">
                    처리 필요 항목
                  </h3>
                  <div className="space-y-1 text-sm text-[rgb(35,45,51)]">
                    {stats.pendingOrders > 0 && (
                      <div className="flex items-center justify-between">
                        <span>• 승인 대기 주문: {stats.pendingOrders}건</span>
                        <Link href="/sales">
                          <Button size="sm" variant="outline" className="h-7">
                            확인하기
                          </Button>
                        </Link>
                      </div>
                    )}
                    {stats.inProgressProductions > 0 && (
                      <div className="flex items-center justify-between">
                        <span>
                          • 생산 진행중: {stats.inProgressProductions}건
                        </span>
                        <Link href="/production">
                          <Button size="sm" variant="outline" className="h-7">
                            확인하기
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>발주사별 점유율</CardTitle>
                  <CardDescription>확정 수량 기준</CardDescription>
                </div>
                <Badge variant="info">실시간</Badge>
              </div>
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
                      `${entry.name}: ${(
                        (entry.value /
                          customerData.reduce((s, d) => s + d.value, 0)) *
                        100
                      ).toFixed(1)}%`
                    }
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={800}
                  >
                    <Cell fill={COLORS.hyundai} />
                    <Cell fill={COLORS.samsung} />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {customerData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          index === 0 ? COLORS.hyundai : COLORS.samsung,
                      }}
                    />
                    <div className="text-sm">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-muted-foreground">
                        {item.value.toLocaleString()}대
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>품목별 분포</CardTitle>
                  <CardDescription>발주 수량 기준</CardDescription>
                </div>
                <Badge variant="info">실시간</Badge>
              </div>
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
                      `${entry.name}: ${(
                        (entry.value /
                          productData.reduce((s, d) => s + d.value, 0)) *
                        100
                      ).toFixed(1)}%`
                    }
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={800}
                  >
                    <Cell fill={COLORS.EV} />
                    <Cell fill={COLORS.SUV} />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {productData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: index === 0 ? COLORS.EV : COLORS.SUV,
                      }}
                    />
                    <div className="text-sm">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-muted-foreground">
                        {item.value.toLocaleString()}대
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>공장별 생산 현황</CardTitle>
                  <CardDescription>계획 대비 실적</CardDescription>
                </div>
                <Badge variant="warning">생산중</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={factoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="planned"
                    fill={COLORS.factory1}
                    name="계획수량"
                    radius={[8, 8, 0, 0]}
                    animationDuration={800}
                  />
                  <Bar
                    dataKey="completed"
                    fill={COLORS.factory2}
                    name="완료수량"
                    radius={[8, 8, 0, 0]}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>월별 발주 추이</CardTitle>
                  <CardDescription>최근 6개월</CardDescription>
                </div>
                <Badge variant="success">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  증가세
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke={COLORS.hyundai}
                    name="발주수량"
                    strokeWidth={3}
                    dot={{ fill: COLORS.hyundai, r: 5 }}
                    activeDot={{ r: 7 }}
                    animationDuration={800}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-bold mb-4">빠른 작업</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href}>
                  <Card className="hover-lift cursor-pointer h-full relative group">
                    {action.alert && (
                      <div className="absolute top-3 right-3 z-10">
                        <Badge variant="error" className="pulse-subtle">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {action.alert}
                        </Badge>
                      </div>
                    )}
                    <CardHeader>
                      <div
                        className={cn(
                          "w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110",
                          action.color === "text-[rgb(35,45,51)]" &&
                            "bg-[rgb(240,242,243)]",
                          action.color === "text-[rgb(0,170,156)]" &&
                            "bg-[rgb(230,248,246)]",
                          action.color === "text-[rgb(181,151,96)]" &&
                            "bg-[rgb(245,241,232)]",
                          action.color === "text-[rgb(181,186,191)]" &&
                            "bg-[rgb(230,230,230)]"
                        )}
                      >
                        <Icon className={`w-6 h-6 ${action.color}`} />
                      </div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* System Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full" />
              시스템 안내
            </CardTitle>
            <CardDescription>
              역할별 주요 업무 및 시스템 사용 가이드
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg border-2 border-[rgb(35,45,51)] bg-[rgb(240,242,243)]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[rgb(35,45,51)] flex items-center justify-center text-white font-bold text-sm">
                    영
                  </div>
                  <h3 className="font-semibold text-[rgb(35,45,51)]">
                    영업담당자
                  </h3>
                </div>
                <p className="text-sm text-[rgb(35,45,51)]">
                  SRM 연동, 주문 접수, 판매 계획 승인 및 생산 이관
                </p>
              </div>

              <div className="p-4 rounded-lg border-2 border-[rgb(181,151,96)] bg-[rgb(245,241,232)]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[rgb(181,151,96)] flex items-center justify-center text-white font-bold text-sm">
                    생
                  </div>
                  <h3 className="font-semibold text-[rgb(181,151,96)]">
                    생산관리자
                  </h3>
                </div>
                <p className="text-sm text-[rgb(35,45,51)]">
                  생산 계획 수립, 공장별 생산 관리, 자재 구매 요청
                </p>
              </div>

              <div className="p-4 rounded-lg border-2 border-[rgb(0,170,156)] bg-[rgb(230,248,246)]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[rgb(0,170,156)] flex items-center justify-center text-white font-bold text-sm">
                    창
                  </div>
                  <h3 className="font-semibold text-[rgb(0,170,156)]">
                    창고관리자
                  </h3>
                </div>
                <p className="text-sm text-[rgb(35,45,51)]">
                  재고 관리, 출하 계획 수립, 배차 관리 및 배송 추적
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
