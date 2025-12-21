"use client"

import { useEffect, useState } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Shipment } from "@/lib/db"
import { Download, Upload, Plus, TruckIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Pagination } from "@/components/pagination"

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [selectedMonth, setSelectedMonth] = useState("2025-12")
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { toast } = useToast()

  const [currentPage, setCurrentPage] = useState(1)
  const [dispatchedPage, setDispatchedPage] = useState(1)
  const itemsPerPage = 10

  const [newShipment, setNewShipment] = useState({
    customer: "",
    destination: "",
    shipmentDate: new Date().toISOString().split("T")[0],
    products: [] as { productCode: string; product: string; category: string; quantity: number }[],
  })

  useEffect(() => {
    fetchShipments()
  }, [selectedMonth])

  const fetchShipments = async () => {
    setLoading(true)
    try {
      let url = "/api/shipments"
      const params = new URLSearchParams()

      if (selectedMonth !== "all") {
        params.append("month", selectedMonth)
      }

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        setShipments(data.data)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch shipments:", error)
      toast({
        title: "오류",
        description: "출하 데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateShipment = async () => {
    if (!newShipment.customer || !newShipment.destination || newShipment.products.length === 0) {
      toast({
        title: "입력 오류",
        description: "모든 필수 항목을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const totalAmount = newShipment.products.reduce((sum, p) => sum + p.quantity * 100, 0) // 임시 단가

      const shipment: Shipment = {
        id: `SHIP-${Date.now()}`,
        shipmentNumber: `SH-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        customer: newShipment.customer,
        destination: newShipment.destination,
        shipmentDate: newShipment.shipmentDate,
        products: newShipment.products,
        totalAmount,
        status: "registered",
        createdAt: new Date().toISOString(),
      }

      const response = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shipment),
      })

      const result = await response.json()
      if (result.success) {
        toast({
          title: "출하지시 등록 완료",
          description: `출하번호: ${shipment.shipmentNumber}`,
        })

        setShowCreateDialog(false)
        setNewShipment({
          customer: "",
          destination: "",
          shipmentDate: new Date().toISOString().split("T")[0],
          products: [],
        })

        await fetchShipments()
      }
    } catch (error) {
      console.error("[v0] Failed to create shipment:", error)
      toast({
        title: "오류",
        description: "출하지시 등록에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleExportExcel = () => {
    const csv = [
      ["출하번호", "고객사", "배송지", "배송일", "제품", "수량", "금액(만원)", "상태"].join(","),
      ...shipments.map((s) =>
        [
          s.shipmentNumber,
          s.customer,
          s.destination,
          s.shipmentDate,
          s.products.map((p) => p.product).join("/"),
          s.products.reduce((sum, p) => sum + p.quantity, 0),
          Math.floor(s.totalAmount / 10000),
          s.status,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `shipments_${selectedMonth}.csv`
    link.click()
  }

  const registeredShipments = shipments.filter((s) => s.status === "registered")
  const dispatchedShipments = shipments.filter((s) => s.status === "dispatched" || s.status === "completed")

  const registeredTotalPages = Math.ceil(registeredShipments.length / itemsPerPage)
  const paginatedRegistered = registeredShipments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const dispatchedTotalPages = Math.ceil(dispatchedShipments.length / itemsPerPage)
  const paginatedDispatched = dispatchedShipments.slice(
    (dispatchedPage - 1) * itemsPerPage,
    dispatchedPage * itemsPerPage,
  )

  const stats = {
    total: shipments.length,
    registered: registeredShipments.length,
    dispatched: dispatchedShipments.length,
    totalAmount: shipments.reduce((sum, s) => sum + s.totalAmount, 0),
  }

  return (
    <LayoutWrapper>
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">출하 지시</h1>
            <p className="text-muted-foreground mt-1">생산 완료 재고를 고객사로 배송하기 위한 출하 지시를 관리합니다</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />새 출하지시
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>총 출하건</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>등록 중</CardDescription>
              <CardTitle className="text-3xl">{stats.registered}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>배송 중/완료</CardDescription>
              <CardTitle className="text-3xl">{stats.dispatched}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>총 금액</CardDescription>
              <CardTitle className="text-2xl">{Math.floor(stats.totalAmount / 10000).toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">만원</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="registered" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="registered">
              출하지시 등록 <Badge className="ml-2">{registeredShipments.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="dispatched">
              배송 현황 <Badge className="ml-2">{dispatchedShipments.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registered" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>출하 지시</CardTitle>
                  <div className="flex items-center gap-3">
                    <Select value={selectedMonth} onValueChange={(value) => setSelectedMonth(value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체 기간</SelectItem>
                        <SelectItem value="2025-11">2025년 11월</SelectItem>
                        <SelectItem value="2025-12">2025년 12월</SelectItem>
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
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">데이터를 불러오는 중...</div>
                ) : (
                  <>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>출하번호</TableHead>
                            <TableHead>고객사</TableHead>
                            <TableHead>배송지</TableHead>
                            <TableHead>배송일</TableHead>
                            <TableHead>제품</TableHead>
                            <TableHead>수량</TableHead>
                            <TableHead>금액(만원)</TableHead>
                            <TableHead>상태</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedRegistered.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                등록된 출하지시가 없습니다.
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedRegistered.map((shipment) => (
                              <TableRow key={shipment.id}>
                                <TableCell className="font-medium">{shipment.shipmentNumber}</TableCell>
                                <TableCell>{shipment.customer}</TableCell>
                                <TableCell>{shipment.destination}</TableCell>
                                <TableCell>{shipment.shipmentDate}</TableCell>
                                <TableCell>{shipment.products.map((p) => p.product).join(", ")}</TableCell>
                                <TableCell>
                                  {shipment.products.reduce((sum, p) => sum + p.quantity, 0).toLocaleString()}
                                </TableCell>
                                <TableCell className="font-semibold">
                                  {Math.floor(shipment.totalAmount / 10000).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">등록 중</Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={registeredTotalPages}
                      onPageChange={setCurrentPage}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dispatched" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>배송 현황</CardTitle>
                <CardDescription>배차 정보와 함께 배송 상태를 추적합니다</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">데이터를 불러오는 중...</div>
                ) : (
                  <>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>출하번호</TableHead>
                            <TableHead>고객사</TableHead>
                            <TableHead>배송지</TableHead>
                            <TableHead>제품</TableHead>
                            <TableHead>수량</TableHead>
                            <TableHead>배차번호</TableHead>
                            <TableHead>차량번호</TableHead>
                            <TableHead>상태</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedDispatched.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                배송 중인 출하지시가 없습니다.
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedDispatched.map((shipment) => (
                              <TableRow key={shipment.id}>
                                <TableCell className="font-medium">{shipment.shipmentNumber}</TableCell>
                                <TableCell>{shipment.customer}</TableCell>
                                <TableCell>{shipment.destination}</TableCell>
                                <TableCell>{shipment.products.map((p) => p.product).join(", ")}</TableCell>
                                <TableCell>
                                  {shipment.products.reduce((sum, p) => sum + p.quantity, 0).toLocaleString()}
                                </TableCell>
                                <TableCell className="font-mono text-sm">{shipment.dispatchId || "-"}</TableCell>
                                <TableCell>{shipment.dispatchInfo?.vehicleNumber || "-"}</TableCell>
                                <TableCell>
                                  {shipment.status === "dispatched" ? (
                                    <Badge className="bg-blue-600">
                                      <TruckIcon className="w-3 h-3 mr-1" />
                                      배송 중
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-green-600">
                                      <TruckIcon className="w-3 h-3 mr-1" />
                                      완료
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <Pagination
                      currentPage={dispatchedPage}
                      totalPages={dispatchedTotalPages}
                      onPageChange={setDispatchedPage}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>새 출하지시</DialogTitle>
              <DialogDescription>생산 완료 재고를 고객사로 배송하기 위한 출하지시를 등록합니다</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>고객사</Label>
                  <Select
                    value={newShipment.customer}
                    onValueChange={(value) => setNewShipment((prev) => ({ ...prev, customer: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="현대차">현대차</SelectItem>
                      <SelectItem value="삼성SDI">삼성SDI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>배송일</Label>
                  <Input
                    type="date"
                    value={newShipment.shipmentDate}
                    onChange={(e) => setNewShipment((prev) => ({ ...prev, shipmentDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>배송지</Label>
                <Input
                  placeholder="예: 울산공장"
                  value={newShipment.destination}
                  onChange={(e) => setNewShipment((prev) => ({ ...prev, destination: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>제품 정보</Label>
                <div className="border rounded-lg p-4 text-sm text-muted-foreground">
                  출하할 제품 정보를 입력해주세요. (향후 인벤토리에서 선택 가능)
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                취소
              </Button>
              <Button onClick={handleCreateShipment}>등록</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Toaster />
    </LayoutWrapper>
  )
}
