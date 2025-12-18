"use client"

import { useEffect, useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Order } from "@/lib/db"
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function SalesPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/orders")
      const data = await response.json()
      if (data.success) {
        setOrders(data.data.filter((o: Order) => o.status === "confirmed"))
      }
    } catch (error) {
      console.error("[v0] Failed to fetch orders:", error)
      toast({
        title: "오류",
        description: "판매 데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders((prev) => (prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]))
  }

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(orders.map((o) => o.id))
    }
  }

  const handleApproveOrders = async () => {
    try {
      // Update orders to approved status
      for (const orderId of selectedOrders) {
        await fetch("/api/orders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: orderId, status: "approved" }),
        })

        // Create production records
        const order = orders.find((o) => o.id === orderId)
        if (order) {
          const productionLine = order.product === "EV" ? "광주1공장" : "광주2공장"
          const productionId = `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

          await fetch("/api/productions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: productionId,
              orderId: order.id,
              productionLine,
              plannedQuantity: order.confirmedQuantity,
              inspectedQuantity: 0,
              productionDate: order.orderDate,
              status: "planned",
              createdAt: new Date().toISOString(),
            }),
          })
        }
      }

      toast({
        title: "승인 완료",
        description: `${selectedOrders.length}건의 발주가 승인되고 생산관리자에게 이관되었습니다.`,
      })

      setSelectedOrders([])
      setShowApprovalDialog(false)
      await fetchOrders()
    } catch (error) {
      console.error("[v0] Failed to approve orders:", error)
      toast({
        title: "오류",
        description: "발주 승인에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleRejectOrders = async () => {
    try {
      for (const orderId of selectedOrders) {
        await fetch("/api/orders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: orderId, status: "predicted" }),
        })
      }

      toast({
        title: "반려 완료",
        description: `${selectedOrders.length}건의 발주가 반려되었습니다.`,
      })

      setSelectedOrders([])
      await fetchOrders()
    } catch (error) {
      console.error("[v0] Failed to reject orders:", error)
    }
  }

  const stats = {
    totalOrders: orders.length,
    totalQuantity: orders.reduce((sum, o) => sum + o.confirmedQuantity, 0),
    hyundai: orders.filter((o) => o.customer === "현대차").reduce((sum, o) => sum + o.confirmedQuantity, 0),
    samsung: orders.filter((o) => o.customer === "삼성SDI").reduce((sum, o) => sum + o.confirmedQuantity, 0),
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">판매 계획</h1>
          <p className="text-muted-foreground mt-1">
            발주사가 확정한 발주를 검토하고 승인하여 생산관리자에게 이관합니다
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>대기 중인 발주</CardDescription>
              <CardTitle className="text-3xl">{stats.totalOrders}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">승인 대기</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>총 확정 수량</CardDescription>
              <CardTitle className="text-3xl">{stats.totalQuantity.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">전체 발주사</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>현대차</CardDescription>
              <CardTitle className="text-3xl">{stats.hyundai.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {((stats.hyundai / stats.totalQuantity) * 100).toFixed(1)}% 점유율
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>삼성SDI</CardDescription>
              <CardTitle className="text-3xl">{stats.samsung.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {((stats.samsung / stats.totalQuantity) * 100).toFixed(1)}% 점유율
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>발주 승인 대기 목록</CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{selectedOrders.length}건 선택됨</span>
                <Button variant="outline" onClick={handleRejectOrders} disabled={selectedOrders.length === 0}>
                  <XCircle className="w-4 h-4 mr-2" />
                  반려
                </Button>
                <Button
                  onClick={() => setShowApprovalDialog(true)}
                  disabled={selectedOrders.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  승인 및 생산 이관
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">데이터를 불러오는 중...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">승인 대기 중인 발주가 없습니다.</div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedOrders.length === orders.length && orders.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-input"
                        />
                      </TableHead>
                      <TableHead>주문번호</TableHead>
                      <TableHead>발주월</TableHead>
                      <TableHead>발주사</TableHead>
                      <TableHead>품목</TableHead>
                      <TableHead>확정수량</TableHead>
                      <TableHead>배정 공장</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const productionLine = order.product === "EV" ? "광주1공장" : "광주2공장"

                      return (
                        <TableRow key={order.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedOrders.includes(order.id)}
                              onChange={() => handleSelectOrder(order.id)}
                              className="rounded border-input"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{order.id}</TableCell>
                          <TableCell>{order.orderDate}</TableCell>
                          <TableCell>{order.customer}</TableCell>
                          <TableCell>{order.product}</TableCell>
                          <TableCell className="font-semibold">{order.confirmedQuantity.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{productionLine}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">확정</Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>발주 승인 및 생산 이관</DialogTitle>
            <DialogDescription>
              선택한 {selectedOrders.length}건의 발주를 승인하고 생산관리자에게 이관하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              {selectedOrders.map((orderId) => {
                const order = orders.find((o) => o.id === orderId)
                if (!order) return null

                return (
                  <div key={orderId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">
                        {order.customer} - {order.product}
                      </p>
                      <p className="text-sm text-muted-foreground">{order.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{order.confirmedQuantity.toLocaleString()}대</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <Badge>{order.product === "EV" ? "광주1공장" : "광주2공장"}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              취소
            </Button>
            <Button onClick={handleApproveOrders} className="bg-green-600 hover:bg-green-700">
              승인 및 이관
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}
