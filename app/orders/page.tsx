"use client"

import { useEffect, useState } from "react"
import { Navigation } from "@/components/navigation"
import { OrderTable } from "@/components/order-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Order } from "@/lib/db"
import { Download, Upload, Save, Truck, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function OrdersPage() {
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
  }, [selectedMonth])

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
      const response = await fetch(`/api/orders?month=${selectedMonth}`)
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
      ["주문번호", "발주월", "발주사", "품목", "예측수량", "확정수량", "상태"].join(","),
      ...orders.map((o) =>
        [o.id, o.orderDate, o.customer, o.product, o.predictedQuantity, o.confirmedQuantity, o.status].join(","),
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
    predictedAmount: filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    confirmedAmount: filteredOrders.filter((o) => o.status !== "predicted").reduce((sum, o) => sum + o.totalAmount, 0),
  }

  const shippedOrders = orders.filter((o) => o.status === "shipped" || o.status === "delivered")

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">발주 계획</h1>
            <p className="text-muted-foreground mt-1">예측 발주 데이터를 확인하고 최종 발주를 확정합니다</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>총 예측 수량</CardDescription>
              <CardTitle className="text-3xl">{stats.total.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {(stats.predictedAmount / 1000000).toLocaleString()}백만원
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>확정 수량</CardDescription>
              <CardTitle className="text-3xl">{stats.confirmed.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {(stats.confirmedAmount / 1000000).toLocaleString()}백만원
              </p>
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
              <CardDescription>배송 중</CardDescription>
              <CardTitle className="text-3xl">{shippedOrders.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList>
            <TabsTrigger value="orders">발주 관리</TabsTrigger>
            <TabsTrigger value="delivery">배송 추적</TabsTrigger>
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
                        <SelectItem value="2025-11">2025년 11월</SelectItem>
                        <SelectItem value="2025-12">2025년 12월</SelectItem>
                      </SelectContent>
                    </Select>

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
                <CardTitle>배송 추적</CardTitle>
                <CardDescription>출하된 주문의 배송 현황과 예상 도착일을 확인합니다</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>주문번호</TableHead>
                        <TableHead>품목</TableHead>
                        <TableHead>목적지</TableHead>
                        <TableHead>수량</TableHead>
                        <TableHead>금액</TableHead>
                        <TableHead>리드타임</TableHead>
                        <TableHead>예상 도착일</TableHead>
                        <TableHead>상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shippedOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            배송 중인 주문이 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        shippedOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.id}</TableCell>
                            <TableCell>{order.product}</TableCell>
                            <TableCell>{order.destination}</TableCell>
                            <TableCell>{order.confirmedQuantity.toLocaleString()}</TableCell>
                            <TableCell>{(order.totalAmount / 1000000).toFixed(1)}M</TableCell>
                            <TableCell>{order.leadTimeDays}일</TableCell>
                            <TableCell>
                              {order.expectedDeliveryDate ||
                                new Date(
                                  new Date(order.orderDate).getTime() + order.leadTimeDays * 24 * 60 * 60 * 1000,
                                ).toLocaleDateString("ko-KR")}
                            </TableCell>
                            <TableCell>
                              {order.status === "delivered" ? (
                                <Badge className="bg-green-600">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  배송완료
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <Truck className="w-3 h-3 mr-1" />
                                  배송중
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Toaster />
    </div>
  )
}
