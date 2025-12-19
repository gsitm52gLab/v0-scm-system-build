"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Download, RefreshCw, CheckCircle2, Building2, Calendar, Package, AlertCircle, ArrowLeft, ArrowRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import type { MockSRMOrder } from "@/lib/mock-srm"

export default function SRMOrdersPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const customer = searchParams.get("customer") as "현대차" | "삼성SDI"
  const sessionId = searchParams.get("session")

  const [srmOrders, setSrmOrders] = useState<MockSRMOrder[]>([])
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [selectedMonth, setSelectedMonth] = useState("2025-12")
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // 세션 검증
  useEffect(() => {
    if (!customer || !sessionId) {
      router.push("/srm-login")
    }
  }, [customer, sessionId, router])

  // SRM 주문 조회
  useEffect(() => {
    if (customer && sessionId) {
      fetchSRMOrders()
    }
  }, [customer, sessionId, selectedMonth])

  const fetchSRMOrders = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/srm/orders?customer=${customer}&month=${selectedMonth}&session=${sessionId}`)
      const result = await response.json()

      if (result.success) {
        setSrmOrders(result.data)
      } else {
        toast({
          title: "조회 실패",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "SRM 주문 조회에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectOrder = (orderNumber: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderNumber) ? prev.filter((id) => id !== orderNumber) : [...prev, orderNumber]
    )
  }

  const handleSelectAll = () => {
    if (selectedOrders.length === srmOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(srmOrders.map((o) => o.srmOrderNumber))
    }
  }

  const handleSyncToSebang = async () => {
    if (selectedOrders.length === 0) {
      toast({
        title: "선택 필요",
        description: "가져올 주문을 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    setSyncing(true)
    try {
      const response = await fetch("/api/srm/sync-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          orderNumbers: selectedOrders,
          sebangUser: user?.fullName,
          sessionId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "동기화 완료",
          description: `${result.syncedCount}건의 주문이 세방 시스템에 등록되었습니다.`,
        })

        // 3초 후 세방 시스템 주문 페이지로 이동
        setTimeout(() => {
          router.push("/orders")
        }, 3000)
      } else {
        toast({
          title: "동기화 실패",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "주문 동기화에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: { label: "긴급", className: "bg-red-600" },
      normal: { label: "보통", className: "bg-blue-600" },
      low: { label: "낮음", className: "bg-gray-600" },
    }
    const config = variants[priority as keyof typeof variants]
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const srmInfo = {
    현대차: { logo: "🚗", color: "bg-blue-600" },
    삼성SDI: { logo: "🔋", color: "bg-blue-700" },
  }

  const currentSRM = customer ? srmInfo[customer] : null

  if (!currentSRM) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-lg ${currentSRM.color} text-white flex items-center justify-center text-xl`}
              >
                {currentSRM.logo}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{customer} SRM 시스템</h1>
                <p className="text-sm text-muted-foreground">세방 담당자: {user?.fullName}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push("/srm-login")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              SRM 로그아웃
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 프로세스 진행 상태 */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-green-700 font-semibold">세방 SCM 로그인</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-green-700 font-semibold">{customer} SRM 로그인</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                  3
                </div>
                <span className="font-semibold">주문 가져오기</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 통계 */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>총 주문</CardDescription>
              <CardTitle className="text-3xl">{srmOrders.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>선택된 주문</CardDescription>
              <CardTitle className="text-3xl">{selectedOrders.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>긴급 주문</CardDescription>
              <CardTitle className="text-3xl text-red-600">
                {srmOrders.filter((o) => o.priority === "high").length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>총 수량</CardDescription>
              <CardTitle className="text-3xl">
                {srmOrders.reduce((sum, o) => sum + o.quantity, 0).toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 주문 목록 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  {customer} SRM 주문 목록
                </CardTitle>
                <CardDescription>가져올 주문을 선택하고 세방 시스템에 동기화하세요</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025-11">2025년 11월</SelectItem>
                    <SelectItem value="2025-12">2025년 12월</SelectItem>
                    <SelectItem value="2026-01">2026년 1월</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchSRMOrders} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  새로고침
                </Button>
                <Button
                  onClick={handleSyncToSebang}
                  disabled={selectedOrders.length === 0 || syncing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      동기화 중...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      세방 시스템에 가져오기 ({selectedOrders.length})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">SRM 주문을 조회하는 중...</div>
            ) : srmOrders.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>주문 없음</AlertTitle>
                <AlertDescription>선택한 월에 {customer} SRM 주문이 없습니다.</AlertDescription>
              </Alert>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedOrders.length === srmOrders.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>SRM 주문번호</TableHead>
                      <TableHead>주문일</TableHead>
                      <TableHead>품목</TableHead>
                      <TableHead>수량</TableHead>
                      <TableHead>납품일</TableHead>
                      <TableHead>우선순위</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>비고</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {srmOrders.map((order) => (
                      <TableRow key={order.srmOrderNumber}>
                        <TableCell>
                          <Checkbox
                            checked={selectedOrders.includes(order.srmOrderNumber)}
                            onCheckedChange={() => handleSelectOrder(order.srmOrderNumber)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium">{order.srmOrderNumber}</TableCell>
                        <TableCell>{order.orderDate}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.product}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{order.quantity.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3" />
                            {order.deliveryDate}
                          </div>
                        </TableCell>
                        <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                        <TableCell>
                          <Badge>{order.status === "new" ? "신규" : order.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{order.notes || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </div>
  )
}

