"use client"

import { useEffect, useState } from "react"
import { OrderTable } from "@/components/order-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Order } from "@/lib/db"
import { Download, Upload, Save, Package, TruckIcon, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useAuth } from "@/components/auth-provider"

export default function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedMonth, setSelectedMonth] = useState("2025-12")
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    initializeData()
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [selectedMonth, selectedCustomer, user])

  const initializeData = async () => {
    try {
      const response = await fetch("/api/init")
      const data = await response.json()
      if (data.success) {
        console.log("[v0] Database initialized:", data.stats)
      }
    } catch (error) {
      console.error("[v0] Failed to initialize database:", error)
    }
  }

  const fetchOrders = async () => {
    setLoading(true)
    try {
      let url = "/api/orders"
      const params = new URLSearchParams()

      if (selectedMonth !== "all") {
        params.append("month", selectedMonth)
      }

      if (user?.role === "customer") {
        params.append("customer", user.company)
      } else if (selectedCustomer !== "all") {
        params.append("customer", selectedCustomer)
      }

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        setOrders(data.data)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch orders:", error)
      toast({
        title: "오류",
        description: "발주 데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (id: string, data: Partial<Order>) => {
    try {
      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      })

      const result = await response.json()
      if (result.success) {
        await fetchOrders()
        toast({
          title: "저장 완료",
          description: "발주 데이터가 업데이트되었습니다.",
        })
      }
    } catch (error) {
      console.error("[v0] Failed to update order:", error)
      toast({
        title: "오류",
        description: "발주 데이터 업데이트에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleConfirmAll = async () => {
    try {
      const pendingOrders = orders.filter((o) => o.status === "predicted")

      for (const order of pendingOrders) {
        await handleUpdate(order.id, {
          confirmedQuantity: order.predictedQuantity,
          status: "confirmed",
        })
      }

      toast({
        title: "일괄 확정 완료",
        description: `${pendingOrders.length}건의 발주가 확정되었습니다.`,
      })
    } catch (error) {
      console.error("[v0] Failed to confirm orders:", error)
    }
  }

  const handleExportExcel = () => {
    const csv = [
      ["주문번호", "발주월", "발주사", "품목", "예측수량", "확정수량", "단가(만원)", "금액(만원)", "상태"].join(","),
      ...orders.map((o) =>
        [
          o.id,
          o.orderDate,
          o.customer,
          o.product,
          o.predictedQuantity,
          o.confirmedQuantity,
          o.unitPrice,
          o.confirmedQuantity * o.unitPrice,
          o.status,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `orders_${selectedMonth}.csv`
    link.click()
  }

  const filteredOrders = orders.filter((order) =>
    selectedCustomer === "all" ? true : order.customer === selectedCustomer,
  )

  const stats = {
    total: filteredOrders.reduce((sum, o) => sum + o.predictedQuantity, 0),
    confirmed: filteredOrders.reduce((sum, o) => sum + o.confirmedQuantity, 0),
    pending: filteredOrders.filter((o) => o.status === "predicted").length,
    predictedAmount: filteredOrders.reduce((sum, o) => sum + o.predictedQuantity * o.unitPrice, 0),
    confirmedAmount: filteredOrders.reduce((sum, o) => sum + o.confirmedQuantity * o.unitPrice, 0),
    shipped: filteredOrders.filter((o) => o.status === "shipped" || o.status === "delivered").length,
  }

  const deliveryOrders = orders.filter(
    (o) =>
      o.status === "approved" || o.status === "in_production" || o.status === "shipped" || o.status === "delivered",
  )

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">발주 계획</h1>
            <p className="text-muted-foreground mt-1">예측 발주 데이터를 확인하고 최종 발주를 확정합니다</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-5 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>총 예측 수량</CardDescription>
              <CardTitle className="text-3xl">{stats.total.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-semibold text-primary">{stats.predictedAmount.toLocaleString()}만원</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>확정 수량</CardDescription>
              <CardTitle className="text-3xl">{stats.confirmed.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-semibold text-green-600">{stats.confirmedAmount.toLocaleString()}만원</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>대기 중인 발주</CardDescription>
              <CardTitle className="text-3xl">{stats.pending}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>출하 완료</CardDescription>
              <CardTitle className="text-3xl">{stats.shipped}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>월평균 금액</CardDescription>
              <CardTitle className="text-2xl">{Math.round(stats.confirmedAmount / 1).toLocaleString()}만원</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders">발주 계획</TabsTrigger>
            <TabsTrigger value="delivery">
              배송 현황 <Badge className="ml-2">{deliveryOrders.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>발주 데이터</CardTitle>
                  <div className="flex items-center gap-3">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체 기간</SelectItem>
                        <SelectItem value="2025-11">2025년 11월</SelectItem>
                        <SelectItem value="2025-12">2025년 12월</SelectItem>
                      </SelectContent>
                    </Select>

                    {user?.role !== "customer" && (
                      <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체 발주사</SelectItem>
                          <SelectItem value="현대차">현대차</SelectItem>
                          <SelectItem value="삼성SDI">삼성SDI</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    <Button variant="outline" onClick={handleExportExcel}>
                      <Download className="w-4 h-4 mr-2" />
                      엑셀 다운로드
                    </Button>
                    <Button variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      엑셀 업로드
                    </Button>
                    <Button onClick={handleConfirmAll}>
                      <Save className="w-4 h-4 mr-2" />
                      일괄 확정
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">데이터를 불러오는 중...</div>
                ) : (
                  <OrderTable orders={filteredOrders} onUpdate={handleUpdate} editable />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delivery" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>배송 현황</CardTitle>
                <CardDescription>주문부터 배송까지 전체 프로세스를 추적합니다</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">데이터를 불러오는 중...</div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>주문번호</TableHead>
                          <TableHead>발주사</TableHead>
                          <TableHead>품목</TableHead>
                          <TableHead>수량</TableHead>
                          <TableHead>금액</TableHead>
                          <TableHead>리드타임</TableHead>
                          <TableHead>예상 도착일</TableHead>
                          <TableHead>상태</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deliveryOrders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                              배송 중인 주문이 없습니다.
                            </TableCell>
                          </TableRow>
                        ) : (
                          deliveryOrders.map((order) => {
                            const leadTime = (() => {
                              const leadTimes = { ESS: 30, EV: 21, SV: 14, PLBM: 18 }
                              return leadTimes[order.category]
                            })()

                            return (
                              <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.id}</TableCell>
                                <TableCell>{order.customer}</TableCell>
                                <TableCell>{order.product}</TableCell>
                                <TableCell>{order.confirmedQuantity.toLocaleString()}</TableCell>
                                <TableCell className="font-semibold">
                                  {(order.confirmedQuantity * order.unitPrice).toLocaleString()}만원
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    {leadTime}일
                                  </div>
                                </TableCell>
                                <TableCell>{order.estimatedDeliveryDate}</TableCell>
                                <TableCell>
                                  {order.status === "approved" && (
                                    <Badge variant="secondary">
                                      <Package className="w-3 h-3 mr-1" />
                                      승인완료
                                    </Badge>
                                  )}
                                  {order.status === "in_production" && (
                                    <Badge className="bg-orange-600">
                                      <Package className="w-3 h-3 mr-1" />
                                      생산중
                                    </Badge>
                                  )}
                                  {order.status === "shipped" && (
                                    <Badge className="bg-blue-600">
                                      <TruckIcon className="w-3 h-3 mr-1" />
                                      출하완료
                                    </Badge>
                                  )}
                                  {order.status === "delivered" && (
                                    <Badge className="bg-green-600">
                                      <TruckIcon className="w-3 h-3 mr-1" />
                                      배송완료
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Toaster />
    </div>
  )
}
