"use client"

import { useEffect, useState } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Production, Order } from "@/lib/db"
import { AlertTriangle, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pagination } from "@/components/ui/pagination"

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
  const [plannedPage, setPlannedPage] = useState(1)
  const [completedPage, setCompletedPage] = useState(1)
  const [inspectedPage, setInspectedPage] = useState(1)
  const [showMrpDialog, setShowMrpDialog] = useState(false)
  const itemsPerPage = 10

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
    factory1: productions
      .filter((p) => p.productionLine === "광주1공장")
      .reduce((sum, p) => sum + p.plannedQuantity, 0),
    factory2: productions
      .filter((p) => p.productionLine === "광주2공장")
      .reduce((sum, p) => sum + p.plannedQuantity, 0),
    completed: completedProductions.reduce((sum, p) => sum + p.inspectedQuantity, 0),
    inspected: inspectedProductions.reduce((sum, p) => sum + p.inspectedQuantity, 0),
    materialShortages: plannedProductions.filter((p) => p.materialShortage).length,
  }

  const plannedTotalPages = Math.ceil(plannedProductions.length / itemsPerPage)
  const paginatedPlannedProductions = plannedProductions.slice(
    (plannedPage - 1) * itemsPerPage,
    plannedPage * itemsPerPage,
  )

  const completedTotalPages = Math.ceil(completedProductions.length / itemsPerPage)
  const paginatedCompletedProductions = completedProductions.slice(
    (completedPage - 1) * itemsPerPage,
    completedPage * itemsPerPage,
  )

  const inspectedTotalPages = Math.ceil(inspectedProductions.length / itemsPerPage)
  const paginatedInspectedProductions = inspectedProductions.slice(
    (inspectedPage - 1) * itemsPerPage,
    inspectedPage * itemsPerPage,
  )

  return (
    <LayoutWrapper>
      <div className="container mx-auto px-6 py-8">
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

                <TabsContent value="planned" className="mt-6">
                  <div className="grid gap-4">
                    {paginatedPlannedProductions.map((production) => {
                      const order = orders.find((o) => o.id === production.orderId)
                      if (!order) return null

                      const cardClassName = production.materialShortage ? "border-2 border-red-500 bg-red-50" : ""

                      return (
                        <Card key={production.id} className={cardClassName}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  {production.id} - {order.product}
                                  {production.materialShortage && (
                                    <Badge variant="destructive" className="ml-2">
                                      자재부족
                                    </Badge>
                                  )}
                                </CardTitle>
                                <CardDescription>
                                  {production.productionLine} | 주문번호: {order.id} | 고객: {order.customer}
                                </CardDescription>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedProduction(production.id)
                                  setShowMrpDialog(true)
                                }}
                              >
                                <Package className="w-4 h-4 mr-2" />
                                자재 소요량 확인
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-col gap-1">
                              {production.status === "planned" && <Badge variant="secondary">계획중</Badge>}
                              {production.status === "completed" && <Badge>생산완료</Badge>}
                              {production.status === "inspected" && <Badge className="bg-green-600">검수완료</Badge>}
                              {production.materialShortage && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  자재부족
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                  <Pagination currentPage={plannedPage} totalPages={plannedTotalPages} onPageChange={setPlannedPage} />
                </TabsContent>

                <TabsContent value="completed" className="mt-6">
                  <div className="grid gap-4">
                    {paginatedCompletedProductions.map((production) => {
                      return (
                        <Card key={production.id}>
                          <CardHeader>
                            <CardTitle>{production.id}</CardTitle>
                            <CardDescription>
                              {production.productionLine} | 주문번호: {production.orderId} | 고객:{" "}
                              {production.order?.customer || "-"}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p>품목: {production.order?.product || "-"}</p>
                            <p>계획수량: {production.plannedQuantity.toLocaleString()}</p>
                            <p>검수수량: {production.inspectedQuantity.toLocaleString()}</p>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                  <Pagination
                    currentPage={completedPage}
                    totalPages={completedTotalPages}
                    onPageChange={setCompletedPage}
                  />
                </TabsContent>

                <TabsContent value="inspected" className="mt-6">
                  <div className="grid gap-4">
                    {paginatedInspectedProductions.map((production) => {
                      return (
                        <Card key={production.id}>
                          <CardHeader>
                            <CardTitle>{production.id}</CardTitle>
                            <CardDescription>
                              {production.productionLine} | 주문번호: {production.orderId} | 고객:{" "}
                              {production.order?.customer || "-"}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p>품목: {production.order?.product || "-"}</p>
                            <p>계획수량: {production.plannedQuantity.toLocaleString()}</p>
                            <p>검수수량: {production.inspectedQuantity.toLocaleString()}</p>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                  <Pagination
                    currentPage={inspectedPage}
                    totalPages={inspectedTotalPages}
                    onPageChange={setInspectedPage}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </LayoutWrapper>
  )
}
