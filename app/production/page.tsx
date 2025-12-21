"use client"

import { useEffect, useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Production, Order } from "@/lib/db"
import { CheckCircle2, Factory, AlertTriangle, Package, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ProductionWithOrder extends Production {
  order?: Order
}

interface MaterialRequirement {
  materialCode: string
  materialName: string
  unit: string
  requiredPerUnit: number
  totalRequired: number
  currentStock: number
  shortage: number
  isShortage: boolean
  supplier: string
  leadTimeDays: number
  unitPrice: number
  totalCost: number
}

interface MRPResult {
  productionId: string
  product: string
  plannedQuantity: number
  requirements: MaterialRequirement[]
  hasShortage: boolean
  maxLeadTime: number
  estimatedProductionStart: string
}

export default function ProductionPage() {
  const [productions, setProductions] = useState<ProductionWithOrder[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [editValues, setEditValues] = useState<Record<string, number>>({})
  const [mrpResults, setMrpResults] = useState<Record<string, MRPResult>>({})
  const [selectedProduction, setSelectedProduction] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const checkMRP = async () => {
      for (const production of productions.filter((p) => p.status === "planned")) {
        if (!mrpResults[production.id]) {
          await calculateMRP(production.id)
        }
      }
    }
    if (productions.length > 0) {
      checkMRP()
    }
  }, [productions])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [prodResponse, orderResponse] = await Promise.all([fetch("/api/productions"), fetch("/api/orders")])

      const [prodData, orderData] = await Promise.all([prodResponse.json(), orderResponse.json()])

      if (prodData.success && orderData.success) {
        const ordersMap = new Map(orderData.data.map((o: Order) => [o.id, o]))
        const productionsWithOrders = prodData.data.map((p: Production) => ({
          ...p,
          order: ordersMap.get(p.orderId),
        }))

        setProductions(productionsWithOrders)
        setOrders(orderData.data)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch data:", error)
      toast({
        title: "오류",
        description: "데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateMRP = async (productionId: string) => {
    try {
      const response = await fetch("/api/mrp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productionId }),
      })

      const result = await response.json()
      setMrpResults((prev) => ({ ...prev, [productionId]: result }))

      if (result.hasShortage) {
        toast({
          title: "자재 부족 알림",
          description: `${result.product} 생산을 위한 자재가 부족합니다.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Failed to calculate MRP:", error)
    }
  }

  const handleConfirmMaterialOrder = async (productionId: string) => {
    const mrp = mrpResults[productionId]
    if (!mrp || !mrp.hasShortage) return

    try {
      const materialsToOrder = mrp.requirements
        .filter((r) => r.isShortage)
        .map((r) => ({
          materialCode: r.materialCode,
          orderQuantity: r.shortage,
        }))

      const response = await fetch("/api/mrp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materials: materialsToOrder }),
      })

      const result = await response.json()
      if (result.success) {
        toast({
          title: "자재 발주 완료",
          description: `${mrp.maxLeadTime}일 후 생산 가능합니다. (${mrp.estimatedProductionStart})`,
        })

        // Refresh MRP calculation
        await calculateMRP(productionId)
        await fetchData()
      }
    } catch (error) {
      console.error("[v0] Failed to order materials:", error)
      toast({
        title: "오류",
        description: "자재 발주에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateProduction = async (productionId: string, inspectedQuantity: number) => {
    try {
      const response = await fetch("/api/productions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: productionId,
          inspectedQuantity,
          status: "completed",
        }),
      })

      const result = await response.json()
      if (result.success) {
        toast({
          title: "저장 완료",
          description: "생산 수량이 업데이트되었습니다.",
        })
        await fetchData()
      }
    } catch (error) {
      console.error("[v0] Failed to update production:", error)
      toast({
        title: "오류",
        description: "생산 수량 업데이트에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleInspectProduction = async (productionId: string) => {
    const inspectedQty = editValues[productionId]
    if (!inspectedQty || inspectedQty <= 0) {
      toast({
        title: "입력 오류",
        description: "검수 수량을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/productions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: productionId,
          inspectedQuantity: inspectedQty,
          status: "inspected",
        }),
      })

      const result = await response.json()
      if (result.success) {
        const production = productions.find((p) => p.id === productionId)
        if (production?.order) {
          const invResponse = await fetch("/api/inventory")
          const invData = await invResponse.json()

          const currentInventory = invData.data.find(
            (i: { product: string }) => i.product === production.order?.product,
          )

          if (currentInventory) {
            await fetch("/api/inventory", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                product: production.order.product,
                quantity: currentInventory.quantity + inspectedQty,
              }),
            })
          }
        }

        toast({
          title: "검수 완료",
          description: "생산 수량이 검수되어 재고에 반영되었습니다.",
        })

        setEditValues((prev) => {
          const newValues = { ...prev }
          delete newValues[productionId]
          return newValues
        })

        await fetchData()
      }
    } catch (error) {
      console.error("[v0] Failed to inspect production:", error)
      toast({
        title: "오류",
        description: "검수 처리에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const plannedProductions = productions.filter((p) => p.status === "planned")
  const completedProductions = productions.filter((p) => p.status === "completed")
  const inspectedProductions = productions.filter((p) => p.status === "inspected")

  const factory1Productions = plannedProductions.filter((p) => p.productionLine === "광주1공장")
  const factory2Productions = plannedProductions.filter((p) => p.productionLine === "광주2공장")

  const stats = {
    planned: plannedProductions.reduce((sum, p) => sum + p.plannedQuantity, 0),
    completed: completedProductions.reduce((sum, p) => sum + p.inspectedQuantity, 0),
    inspected: inspectedProductions.reduce((sum, p) => sum + p.inspectedQuantity, 0),
    factory1: factory1Productions.reduce((sum, p) => sum + p.plannedQuantity, 0),
    factory2: factory2Productions.reduce((sum, p) => sum + p.plannedQuantity, 0),
    materialShortages: Object.values(mrpResults).filter((r) => r.hasShortage).length,
  }

  const ProductionTable = ({
    productions,
    showActions = true,
  }: { productions: ProductionWithOrder[]; showActions?: boolean }) => (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>생산번호</TableHead>
            <TableHead>주문번호</TableHead>
            <TableHead>발주사</TableHead>
            <TableHead>품목</TableHead>
            <TableHead>생산공장</TableHead>
            <TableHead>라인능력</TableHead>
            <TableHead>택타임</TableHead>
            <TableHead>계획수량</TableHead>
            <TableHead>검수수량</TableHead>
            <TableHead>상태</TableHead>
            {showActions && <TableHead className="text-right">작업</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {productions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                생산 계획이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            productions.map((production) => {
              const mrp = mrpResults[production.id]
              return (
                <TableRow key={production.id} className={mrp?.hasShortage ? "bg-red-50" : ""}>
                  <TableCell className="font-medium">{production.id}</TableCell>
                  <TableCell>{production.orderId}</TableCell>
                  <TableCell>{production.order?.customer || "-"}</TableCell>
                  <TableCell>{production.order?.product || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      <Factory className="w-3 h-3 mr-1" />
                      {production.productionLine}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{production.lineCapacity}/일</TableCell>
                  <TableCell className="text-sm">{production.tactTime}분</TableCell>
                  <TableCell className="font-semibold">{production.plannedQuantity.toLocaleString()}</TableCell>
                  <TableCell>
                    {showActions && production.status === "planned" ? (
                      <Input
                        type="number"
                        placeholder="검수 수량"
                        value={editValues[production.id] || ""}
                        onChange={(e) =>
                          setEditValues((prev) => ({ ...prev, [production.id]: Number.parseInt(e.target.value) || 0 }))
                        }
                        className="w-32"
                      />
                    ) : (
                      production.inspectedQuantity.toLocaleString()
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {production.status === "planned" && <Badge variant="secondary">계획중</Badge>}
                      {production.status === "completed" && <Badge>생산완료</Badge>}
                      {production.status === "inspected" && <Badge className="bg-green-600">검수완료</Badge>}
                      {mrp?.hasShortage && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          자재부족
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex flex-col gap-2">
                        {production.status === "planned" && !mrp?.hasShortage && (
                          <Button size="sm" onClick={() => handleInspectProduction(production.id)}>
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            검수완료
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setSelectedProduction(selectedProduction === production.id ? null : production.id)
                          }
                        >
                          <Package className="w-4 h-4 mr-1" />
                          자재확인
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">생산 계획</h1>
          <p className="text-muted-foreground mt-1">공장별 생산 계획을 확인하고 자재 소요량(MRP)을 관리합니다</p>
        </div>

        {stats.materialShortages > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>자재 부족 알림</AlertTitle>
            <AlertDescription>
              {stats.materialShortages}건의 생산 계획에 필요한 자재가 부족합니다. 자재 발주를 진행해주세요.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>계획 수량</CardDescription>
              <CardTitle className="text-3xl">{stats.planned.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{plannedProductions.length}건</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>광주1공장</CardDescription>
              <CardTitle className="text-3xl">{stats.factory1.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">EV 생산</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>광주2공장</CardDescription>
              <CardTitle className="text-3xl">{stats.factory2.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">SUV 생산</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>생산 완료</CardDescription>
              <CardTitle className="text-3xl">{stats.completed.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{completedProductions.length}건</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>검수 완료</CardDescription>
              <CardTitle className="text-3xl">{stats.inspected.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">재고 반영</p>
            </CardContent>
          </Card>
          <Card className={stats.materialShortages > 0 ? "border-red-500" : ""}>
            <CardHeader className="pb-3">
              <CardDescription>자재 부족</CardDescription>
              <CardTitle className="text-3xl text-red-600">{stats.materialShortages}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">발주 필요</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>생산 관리</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">데이터를 불러오는 중...</div>
            ) : (
              <Tabs defaultValue="planned" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="planned">
                    생산 계획 ({plannedProductions.length})
                    {stats.materialShortages > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {stats.materialShortages}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="completed">생산 완료 ({completedProductions.length})</TabsTrigger>
                  <TabsTrigger value="inspected">검수 완료 ({inspectedProductions.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="planned" className="mt-6 space-y-6">
                  <ProductionTable productions={plannedProductions} showActions />

                  {selectedProduction && mrpResults[selectedProduction] && (
                    <Card className="border-2 border-primary">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>자재 소요량 분석 (MRP) - {selectedProduction}</span>
                          <Button variant="outline" size="sm" onClick={() => setSelectedProduction(null)}>
                            닫기
                          </Button>
                        </CardTitle>
                        <CardDescription>
                          {mrpResults[selectedProduction].product} 생산을 위한 자재 요구사항
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {mrpResults[selectedProduction].hasShortage && (
                          <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>자재 부족</AlertTitle>
                            <AlertDescription className="flex items-center justify-between">
                              <span>
                                일부 자재가 부족합니다. 자재 발주 후 {mrpResults[selectedProduction].maxLeadTime}일 소요
                                예상
                              </span>
                              <Button
                                size="sm"
                                onClick={() => handleConfirmMaterialOrder(selectedProduction)}
                                className="ml-4"
                              >
                                자재 발주 확정
                              </Button>
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>자재코드</TableHead>
                                <TableHead>자재명</TableHead>
                                <TableHead>단위</TableHead>
                                <TableHead>단위당 소요</TableHead>
                                <TableHead>총 필요량</TableHead>
                                <TableHead>현재 재고</TableHead>
                                <TableHead>부족량</TableHead>
                                <TableHead>공급업체</TableHead>
                                <TableHead>리드타임</TableHead>
                                <TableHead>예상비용</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {mrpResults[selectedProduction].requirements.map((req) => (
                                <TableRow key={req.materialCode} className={req.isShortage ? "bg-red-50" : ""}>
                                  <TableCell className="font-medium">{req.materialCode}</TableCell>
                                  <TableCell>{req.materialName}</TableCell>
                                  <TableCell>{req.unit}</TableCell>
                                  <TableCell>{req.requiredPerUnit}</TableCell>
                                  <TableCell className="font-semibold">{req.totalRequired.toLocaleString()}</TableCell>
                                  <TableCell>{req.currentStock.toLocaleString()}</TableCell>
                                  <TableCell>
                                    {req.isShortage ? (
                                      <Badge variant="destructive">{req.shortage.toLocaleString()}</Badge>
                                    ) : (
                                      <Badge className="bg-green-600">충분</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm">{req.supplier}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {req.leadTimeDays}일
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-semibold">{req.totalCost.toLocaleString()}원</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">생산 시작 가능일</p>
                              <p className="text-sm text-muted-foreground">
                                {mrpResults[selectedProduction].hasShortage
                                  ? `자재 발주 후 ${mrpResults[selectedProduction].estimatedProductionStart}`
                                  : "즉시 생산 가능"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">총 예상 비용</p>
                              <p className="text-lg font-bold text-primary">
                                {mrpResults[selectedProduction].requirements
                                  .reduce((sum, r) => sum + r.totalCost, 0)
                                  .toLocaleString()}
                                원
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="mt-6">
                  <ProductionTable productions={completedProductions} showActions={false} />
                </TabsContent>

                <TabsContent value="inspected" className="mt-6">
                  <ProductionTable productions={inspectedProductions} showActions={false} />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </div>
  )
}
