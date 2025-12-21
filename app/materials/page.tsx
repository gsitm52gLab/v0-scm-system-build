"use client"

import { useEffect, useState } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Material } from "@/lib/db"
import { AlertTriangle, Package, CheckCircle, TruckIcon, Download, Calendar } from "lucide-react"
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

interface MaterialRequirement {
  material: Material
  required: number
  available: number
  shortage: number
  orderNeeded: boolean
}

interface PurchaseOrder {
  id: string
  materialCode: string
  materialName: string
  quantity: number
  supplier: string
  orderDate: string
  expectedDeliveryDate: string
  status: "ordered" | "in_transit" | "received"
  createdAt: string
  unitPrice: number
  totalAmount: number
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [requirements, setRequirements] = useState<MaterialRequirement[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [selectedMonth, setSelectedMonth] = useState("2025-12")
  const [loading, setLoading] = useState(true)
  const [showOrderDialog, setShowOrderDialog] = useState(false)
  const [showReceiveDialog, setShowReceiveDialog] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialRequirement | null>(null)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [receiveQuantity, setReceiveQuantity] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [materialsRes, requirementsRes] = await Promise.all([
        fetch("/api/materials"),
        fetch("/api/material-requirements"),
      ])

      const [materialsData, requirementsData] = await Promise.all([materialsRes.json(), requirementsRes.json()])

      if (materialsData.success) {
        setMaterials(materialsData.data)
      }

      if (requirementsData.success) {
        setRequirements(requirementsData.data)
      }

      // Load purchase orders from localStorage
      const savedPOs = localStorage.getItem("purchaseOrders")
      if (savedPOs) {
        setPurchaseOrders(JSON.parse(savedPOs))
      }
    } catch (error) {
      console.error("[v0] Failed to fetch materials:", error)
      toast({
        title: "오류",
        description: "자재 데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePurchaseOrder = async (material: MaterialRequirement) => {
    const orderDate = new Date()
    const expectedDeliveryDate = new Date()
    expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + material.material.leadTimeDays)

    const totalAmount = material.shortage * material.material.unitPrice

    const newPO: PurchaseOrder = {
      id: `PO-${Date.now()}`,
      materialCode: material.material.code,
      materialName: material.material.name,
      quantity: material.shortage,
      supplier: material.material.supplier,
      orderDate: orderDate.toISOString().split("T")[0],
      expectedDeliveryDate: expectedDeliveryDate.toISOString().split("T")[0],
      status: "ordered",
      createdAt: new Date().toISOString(),
      unitPrice: material.material.unitPrice,
      totalAmount,
    }

    const updatedPOs = [...purchaseOrders, newPO]
    setPurchaseOrders(updatedPOs)
    localStorage.setItem("purchaseOrders", JSON.stringify(updatedPOs))

    // Calculate production start date
    const productionStartDate = new Date(expectedDeliveryDate)
    productionStartDate.setDate(productionStartDate.getDate() + 1)

    toast({
      title: "발주 완료",
      description: `${material.material.name} ${material.shortage}${material.material.unit} 발주가 완료되었습니다.\n예상 입고일: ${newPO.expectedDeliveryDate}\n생산 가능일: ${productionStartDate.toISOString().split("T")[0]}`,
      duration: 5000,
    })

    setShowOrderDialog(false)
    setSelectedMaterial(null)
  }

  const handleReceiveMaterial = async () => {
    if (!selectedPO || !receiveQuantity) return

    try {
      // Update material stock
      const material = materials.find((m) => m.code === selectedPO.materialCode)
      if (material) {
        const response = await fetch("/api/materials", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: material.code,
            currentStock: material.currentStock + receiveQuantity,
          }),
        })

        if (response.ok) {
          // Update PO status
          const updatedPOs = purchaseOrders.map((po) =>
            po.id === selectedPO.id ? { ...po, status: "received" as const } : po,
          )
          setPurchaseOrders(updatedPOs)
          localStorage.setItem("purchaseOrders", JSON.stringify(updatedPOs))

          toast({
            title: "입고 완료",
            description: `${selectedPO.materialName} ${receiveQuantity}${material.unit} 입고가 완료되었습니다.`,
          })

          setShowReceiveDialog(false)
          setSelectedPO(null)
          setReceiveQuantity(0)
          await fetchData()
        }
      }
    } catch (error) {
      console.error("[v0] Failed to receive material:", error)
      toast({
        title: "오류",
        description: "입고 처리에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleExportExcel = () => {
    const csv = [
      ["발주번호", "자재명", "수량", "단가(원)", "금액(원)", "공급업체", "발주일", "예상입고일", "상태"].join(","),
      ...purchaseOrders.map((po) =>
        [
          po.id,
          po.materialName,
          po.quantity,
          po.unitPrice,
          po.totalAmount,
          po.supplier,
          po.orderDate,
          po.expectedDeliveryDate,
          po.status,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `material_orders_${selectedMonth}.csv`
    link.click()
  }

  const shortageAlerts = requirements.filter((r) => r.orderNeeded)
  const lowStockMaterials = materials.filter((m) => m.currentStock < m.minStock)

  const stats = {
    totalMaterials: materials.length,
    lowStock: lowStockMaterials.length,
    shortages: shortageAlerts.length,
    pendingOrders: purchaseOrders.filter((po) => po.status === "ordered" || po.status === "in_transit").length,
    totalOrderAmount: purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0),
    monthlyAverage: purchaseOrders.length > 0 ? purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0) / 1 : 0,
  }

  return (
    <LayoutWrapper>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">자재 관리</h1>
          <p className="text-muted-foreground mt-1">생산에 필요한 자재를 관리하고 발주합니다</p>
        </div>

        {shortageAlerts.length > 0 && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">자재 부족 알림</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {shortageAlerts.length}개 자재에 대한 발주가 필요합니다. 생산 차질이 예상됩니다.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-5 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>총 자재 품목</CardDescription>
              <CardTitle className="text-3xl">{stats.totalMaterials}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">관리 중인 자재</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>발주 필요</CardDescription>
              <CardTitle className="text-3xl text-destructive">{stats.shortages}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">긴급 발주 필요</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>발주 진행 중</CardDescription>
              <CardTitle className="text-3xl">{stats.pendingOrders}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">입고 대기</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>총 발주 금액</CardDescription>
              <CardTitle className="text-2xl">{(stats.totalOrderAmount / 10000).toLocaleString()}만원</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">누적 발주액</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>월평균 금액</CardDescription>
              <CardTitle className="text-2xl">{(stats.monthlyAverage / 10000).toLocaleString()}만원</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">월별 평균</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders">
              자재 발주 계획
              {shortageAlerts.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {shortageAlerts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="purchase-orders">
              발주 내역 <Badge className="ml-2">{purchaseOrders.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="inventory">재고 현황</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>자재 소요량 (MRP)</CardTitle>
                    <CardDescription>생산 계획 기반 자재 소요량 자동 계산 결과</CardDescription>
                  </div>
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
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">데이터를 불러오는 중...</div>
                ) : requirements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">자재 소요량 정보가 없습니다.</div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>자재코드</TableHead>
                          <TableHead>자재명</TableHead>
                          <TableHead>필요수량</TableHead>
                          <TableHead>현재고</TableHead>
                          <TableHead>부족수량</TableHead>
                          <TableHead>단가(원)</TableHead>
                          <TableHead>발주금액(만원)</TableHead>
                          <TableHead>공급업체</TableHead>
                          <TableHead>리드타임</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead className="text-right">작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requirements.map((req) => (
                          <TableRow key={req.material.code}>
                            <TableCell className="font-medium">{req.material.code}</TableCell>
                            <TableCell>{req.material.name}</TableCell>
                            <TableCell>
                              {req.required.toLocaleString()} {req.material.unit}
                            </TableCell>
                            <TableCell>
                              {req.available.toLocaleString()} {req.material.unit}
                            </TableCell>
                            <TableCell>
                              {req.shortage > 0 ? (
                                <span className="font-semibold text-destructive">
                                  {req.shortage.toLocaleString()} {req.material.unit}
                                </span>
                              ) : (
                                <span className="text-green-600">-</span>
                              )}
                            </TableCell>
                            <TableCell>{req.material.unitPrice.toLocaleString()}원</TableCell>
                            <TableCell className="font-semibold">
                              {req.shortage > 0
                                ? ((req.shortage * req.material.unitPrice) / 10000).toLocaleString()
                                : "-"}
                              만원
                            </TableCell>
                            <TableCell>{req.material.supplier}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {req.material.leadTimeDays}일
                              </div>
                            </TableCell>
                            <TableCell>
                              {req.orderNeeded ? (
                                <Badge variant="destructive">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  발주필요
                                </Badge>
                              ) : (
                                <Badge className="bg-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  충분
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {req.orderNeeded && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedMaterial(req)
                                    setShowOrderDialog(true)
                                  }}
                                >
                                  발주 확정
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchase-orders" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>발주 내역</CardTitle>
                    <CardDescription>자재 발주 및 입고 관리</CardDescription>
                  </div>
                  <Button variant="outline" onClick={handleExportExcel}>
                    <Download className="w-4 h-4 mr-2" />
                    엑셀 다운로드
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {purchaseOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">발주 내역이 없습니다.</div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>발주번호</TableHead>
                          <TableHead>발주일</TableHead>
                          <TableHead>자재명</TableHead>
                          <TableHead>수량</TableHead>
                          <TableHead>단가(원)</TableHead>
                          <TableHead>금액(만원)</TableHead>
                          <TableHead>공급업체</TableHead>
                          <TableHead>예상입고일</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead className="text-right">작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseOrders.map((po) => {
                          const material = materials.find((m) => m.code === po.materialCode)

                          return (
                            <TableRow key={po.id}>
                              <TableCell className="font-medium">{po.id}</TableCell>
                              <TableCell>{po.orderDate}</TableCell>
                              <TableCell>{po.materialName}</TableCell>
                              <TableCell>
                                {po.quantity.toLocaleString()} {material?.unit || "EA"}
                              </TableCell>
                              <TableCell>{po.unitPrice.toLocaleString()}원</TableCell>
                              <TableCell className="font-semibold">
                                {(po.totalAmount / 10000).toLocaleString()}만원
                              </TableCell>
                              <TableCell>{po.supplier}</TableCell>
                              <TableCell>{po.expectedDeliveryDate}</TableCell>
                              <TableCell>
                                {po.status === "ordered" && <Badge variant="secondary">발주완료</Badge>}
                                {po.status === "in_transit" && (
                                  <Badge>
                                    <TruckIcon className="w-3 h-3 mr-1" />
                                    배송중
                                  </Badge>
                                )}
                                {po.status === "received" && <Badge className="bg-green-600">입고완료</Badge>}
                              </TableCell>
                              <TableCell className="text-right">
                                {po.status !== "received" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedPO(po)
                                      setReceiveQuantity(po.quantity)
                                      setShowReceiveDialog(true)
                                    }}
                                  >
                                    <Package className="w-4 h-4 mr-1" />
                                    입고처리
                                  </Button>
                                )}
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
          </TabsContent>

          <TabsContent value="inventory" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>실시간 재고 현황</CardTitle>
                <CardDescription>자재별 현재고 및 최소 재고 수준</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>자재코드</TableHead>
                        <TableHead>자재명</TableHead>
                        <TableHead>현재고</TableHead>
                        <TableHead>최소재고</TableHead>
                        <TableHead>재고율</TableHead>
                        <TableHead>공급업체</TableHead>
                        <TableHead>단가(원)</TableHead>
                        <TableHead>상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materials.map((material) => {
                        const stockRate = (material.currentStock / material.minStock) * 100
                        const isLowStock = material.currentStock < material.minStock

                        return (
                          <TableRow key={material.code}>
                            <TableCell className="font-medium">{material.code}</TableCell>
                            <TableCell>{material.name}</TableCell>
                            <TableCell>
                              {material.currentStock.toLocaleString()} {material.unit}
                            </TableCell>
                            <TableCell>
                              {material.minStock.toLocaleString()} {material.unit}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${
                                      stockRate >= 100
                                        ? "bg-green-600"
                                        : stockRate >= 50
                                          ? "bg-orange-500"
                                          : "bg-destructive"
                                    }`}
                                    style={{ width: `${Math.min(stockRate, 100)}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">{stockRate.toFixed(0)}%</span>
                              </div>
                            </TableCell>
                            <TableCell>{material.supplier}</TableCell>
                            <TableCell>{material.unitPrice.toLocaleString()}원</TableCell>
                            <TableCell>
                              {isLowStock ? (
                                <Badge variant="destructive">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  부족
                                </Badge>
                              ) : (
                                <Badge className="bg-green-600">정상</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Purchase Order Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>자재 발주 확정</DialogTitle>
            <DialogDescription>부족한 자재에 대한 발주를 확정합니다</DialogDescription>
          </DialogHeader>

          {selectedMaterial && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">자재명</Label>
                  <p className="font-medium">{selectedMaterial.material.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">자재코드</Label>
                  <p className="font-medium">{selectedMaterial.material.code}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">발주수량</Label>
                  <p className="font-medium">
                    {selectedMaterial.shortage.toLocaleString()} {selectedMaterial.material.unit}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">단가</Label>
                  <p className="font-medium">{selectedMaterial.material.unitPrice.toLocaleString()}원</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">총 금액</Label>
                  <p className="font-semibold text-lg">
                    {((selectedMaterial.shortage * selectedMaterial.material.unitPrice) / 10000).toLocaleString()}만원
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">공급업체</Label>
                  <p className="font-medium">{selectedMaterial.material.supplier}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">리드타임</Label>
                  <p className="font-medium">{selectedMaterial.material.leadTimeDays}일</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">예상 입고일</Label>
                  <p className="font-medium">
                    {
                      new Date(Date.now() + selectedMaterial.material.leadTimeDays * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split("T")[0]
                    }
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>생산 가능일:</strong>{" "}
                  {
                    new Date(Date.now() + (selectedMaterial.material.leadTimeDays + 1) * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0]
                  }
                </p>
                <p className="text-xs text-blue-700 mt-1">입고 후 다음날부터 생산을 시작할 수 있습니다.</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrderDialog(false)}>
              취소
            </Button>
            <Button onClick={() => selectedMaterial && handleCreatePurchaseOrder(selectedMaterial)}>발주 확정</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Material Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>자재 입고 처리</DialogTitle>
            <DialogDescription>입고된 자재의 수량을 확인하고 재고를 업데이트합니다</DialogDescription>
          </DialogHeader>

          {selectedPO && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">발주번호</Label>
                  <p className="font-medium">{selectedPO.id}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">자재명</Label>
                  <p className="font-medium">{selectedPO.materialName}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">발주수량</Label>
                  <p className="font-medium">{selectedPO.quantity.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">공급업체</Label>
                  <p className="font-medium">{selectedPO.supplier}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="receiveQty">입고 수량</Label>
                <Input
                  id="receiveQty"
                  type="number"
                  value={receiveQuantity}
                  onChange={(e) => setReceiveQuantity(Number.parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>
              취소
            </Button>
            <Button onClick={handleReceiveMaterial}>입고 완료</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </LayoutWrapper>
  )
}
