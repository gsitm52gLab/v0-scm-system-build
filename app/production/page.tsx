"use client"

import { useEffect, useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import type { Production, Order, Material, MaterialRequirement } from "@/lib/db"
import { CheckCircle2, Factory, AlertTriangle, ShoppingCart } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ProductionWithOrder extends Production {
  order?: Order
}

export default function ProductionPage() {
  const [productions, setProductions] = useState<ProductionWithOrder[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [editValues, setEditValues] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [materials, setMaterials] = useState<Material[]>([])
  const [materialRequirements, setMaterialRequirements] = useState<MaterialRequirement[]>([])
  const [showMaterialAlert, setShowMaterialAlert] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [prodResponse, orderResponse, materialsResponse, requirementsResponse] = await Promise.all([
        fetch("/api/productions"),
        fetch("/api/orders"),
        fetch("/api/materials"),
        fetch("/api/material-requirements"),
      ])

      const [prodData, orderData, materialsData, requirementsData] = await Promise.all([
        prodResponse.json(),
        orderResponse.json(),
        materialsResponse.json(),
        requirementsResponse.json(),
      ])

      if (prodData.success && orderData.success) {
        const ordersMap = new Map(orderData.data.map((o: Order) => [o.id, o]))
        const productionsWithOrders = prodData.data.map((p: Production) => ({
          ...p,
          order: ordersMap.get(p.orderId),
        }))

        setProductions(productionsWithOrders)
        setOrders(orderData.data)
      }

      if (materialsData.success) {
        setMaterials(materialsData.data)
      }

      if (requirementsData.success) {
        setMaterialRequirements(requirementsData.data)
      }

      checkMaterialShortages(prodData.data, materialsData.data)
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

  const checkMaterialShortages = (productions: Production[], materials: Material[]) => {
    const plannedProductions = productions.filter((p) => p.status === "planned")

    if (plannedProductions.length > 0) {
      const hasShortage = materials.some((m) => m.currentStock < m.minStock)
      setShowMaterialAlert(hasShortage)
    }
  }

  const handleConfirmMaterialOrder = async () => {
    try {
      const shortfallMaterials = materials.filter((m) => m.currentStock < m.minStock)

      for (const material of shortfallMaterials) {
        const orderDate = new Date()
        const expectedArrival = new Date(orderDate.getTime() + material.leadTimeDays * 24 * 60 * 60 * 1000)

        toast({
          title: "자재 발주 완료",
          description: `${material.name}: ${expectedArrival.toLocaleDateString("ko-KR")}에 입고 예정 (리드타임: ${material.leadTimeDays}일)`,
        })
      }

      setShowMaterialAlert(false)
      toast({
        title: "생산 가능 알림",
        description: `자재 입고 후 생산이 가능합니다. 예상 생산 개시일: ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("ko-KR")}`,
      })
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
            <TableHead>계획수량</TableHead>
            <TableHead>검수수량</TableHead>
            <TableHead>상태</TableHead>
            {showActions && <TableHead className="text-right">작업</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {productions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                생산 계획이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            productions.map((production) => (
              <TableRow key={production.id}>
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
                  {production.status === "planned" && <Badge variant="secondary">계획중</Badge>}
                  {production.status === "completed" && <Badge>생산완료</Badge>}
                  {production.status === "inspected" && <Badge className="bg-green-600">검수완료</Badge>}
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    {production.status === "planned" && (
                      <Button size="sm" onClick={() => handleInspectProduction(production.id)}>
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        검수완료
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )

  const insufficientMaterials = materials.filter((m) => m.currentStock < m.minStock)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">생산 계획</h1>
          <p className="text-muted-foreground mt-1">
            공장별 생산 계획을 확인하고 일자별 입고(생산완료) 수량을 입력합니다
          </p>
        </div>

        {showMaterialAlert && insufficientMaterials.length > 0 && (
          <Alert className="mb-6 border-orange-500 bg-orange-50">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <AlertTitle className="text-orange-900">자재 부족 알림</AlertTitle>
            <AlertDescription className="text-orange-800">
              <div className="mt-2 space-y-2">
                <p className="font-semibold">다음 자재가 부족합니다:</p>
                <ul className="list-disc list-inside space-y-1">
                  {insufficientMaterials.map((m) => (
                    <li key={m.id}>
                      {m.name}: 현재 {m.currentStock.toLocaleString()}개 (최소 {m.minStock.toLocaleString()}개 필요)
                    </li>
                  ))}
                </ul>
                <Button onClick={handleConfirmMaterialOrder} className="mt-3" size="sm">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  자재 발주 확정
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-5 mb-6">
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
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="planned">생산 계획 ({plannedProductions.length})</TabsTrigger>
                  <TabsTrigger value="completed">생산 완료 ({completedProductions.length})</TabsTrigger>
                  <TabsTrigger value="inspected">검수 완료 ({inspectedProductions.length})</TabsTrigger>
                  <TabsTrigger value="materials">자재 현황 ({materials.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="planned" className="mt-6">
                  <ProductionTable productions={plannedProductions} showActions />
                </TabsContent>

                <TabsContent value="completed" className="mt-6">
                  <ProductionTable productions={completedProductions} showActions={false} />
                </TabsContent>

                <TabsContent value="inspected" className="mt-6">
                  <ProductionTable productions={inspectedProductions} showActions={false} />
                </TabsContent>

                <TabsContent value="materials" className="mt-6">
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>자재코드</TableHead>
                          <TableHead>자재명</TableHead>
                          <TableHead>카테고리</TableHead>
                          <TableHead>공급업체</TableHead>
                          <TableHead>현재재고</TableHead>
                          <TableHead>최소재고</TableHead>
                          <TableHead>단가</TableHead>
                          <TableHead>리드타임</TableHead>
                          <TableHead>상태</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {materials.map((material) => {
                          const isInsufficient = material.currentStock < material.minStock
                          return (
                            <TableRow key={material.id}>
                              <TableCell className="font-medium">{material.code}</TableCell>
                              <TableCell>{material.name}</TableCell>
                              <TableCell>{material.category}</TableCell>
                              <TableCell>{material.supplier}</TableCell>
                              <TableCell className={isInsufficient ? "text-red-600 font-semibold" : ""}>
                                {material.currentStock.toLocaleString()}
                              </TableCell>
                              <TableCell>{material.minStock.toLocaleString()}</TableCell>
                              <TableCell>{material.unitPrice.toLocaleString()}원</TableCell>
                              <TableCell>{material.leadTimeDays}일</TableCell>
                              <TableCell>
                                {isInsufficient ? (
                                  <Badge variant="destructive">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    부족
                                  </Badge>
                                ) : (
                                  <Badge className="bg-green-600">충분</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
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
