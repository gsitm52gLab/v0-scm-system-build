"use client"

import { useEffect, useState } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Dispatch, Inventory } from "@/lib/db"
import { Truck, Plus, Weight } from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const VEHICLE_CAPACITIES = {
  "5톤": 5000,
  "11톤": 11000,
  "25톤": 25000,
}

const PRODUCT_WEIGHTS = {
  EV: 2.5, // tons per unit
  SUV: 2.0, // tons per unit
}

export default function DispatchPage() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([])
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showWeightDialog, setShowWeightDialog] = useState(false)
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null)
  const { toast } = useToast()

  const [newDispatch, setNewDispatch] = useState({
    vehicleNumber: "",
    vehicleSize: "11톤" as "5톤" | "11톤" | "25톤",
    destination: "",
    products: [] as { product: "EV" | "SUV"; quantity: number; weight: number }[],
  })

  const [actualWeight, setActualWeight] = useState(0)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [dispatchResponse, inventoryResponse] = await Promise.all([fetch("/api/dispatch"), fetch("/api/inventory")])

      const [dispatchData, inventoryData] = await Promise.all([dispatchResponse.json(), inventoryResponse.json()])

      if (dispatchData.success && inventoryData.success) {
        setDispatches(dispatchData.data)
        setInventory(inventoryData.data)
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

  const addProductToDispatch = (product: "EV" | "SUV") => {
    const productInventory = inventory.find((i) => i.product === product)
    if (!productInventory || productInventory.quantity === 0) {
      toast({
        title: "재고 부족",
        description: `${product} 재고가 부족합니다.`,
        variant: "destructive",
      })
      return
    }

    setNewDispatch((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          product,
          quantity: 0,
          weight: 0,
        },
      ],
    }))
  }

  const updateProductQuantity = (index: number, quantity: number) => {
    const product = newDispatch.products[index]
    const weight = quantity * PRODUCT_WEIGHTS[product.product]

    setNewDispatch((prev) => ({
      ...prev,
      products: prev.products.map((p, i) => (i === index ? { ...p, quantity, weight } : p)),
    }))
  }

  const removeProduct = (index: number) => {
    setNewDispatch((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
    }))
  }

  const calculateEstimatedWeight = () => {
    return newDispatch.products.reduce((sum, p) => sum + p.weight, 0)
  }

  const handleCreateDispatch = async () => {
    if (!newDispatch.vehicleNumber || !newDispatch.destination || newDispatch.products.length === 0) {
      toast({
        title: "입력 오류",
        description: "모든 필수 항목을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    const estimatedWeight = calculateEstimatedWeight()
    const capacity = VEHICLE_CAPACITIES[newDispatch.vehicleSize]

    if (estimatedWeight > capacity) {
      toast({
        title: "중량 초과",
        description: `차량 용량(${capacity}kg)을 초과했습니다. (${estimatedWeight.toFixed(1)}kg)`,
        variant: "destructive",
      })
      return
    }

    try {
      const dispatchId = `DSP-${Date.now()}`
      const dispatch: Dispatch = {
        id: dispatchId,
        dispatchNumber: `DN-${Date.now().toString().slice(-8)}`,
        vehicleNumber: newDispatch.vehicleNumber,
        vehicleSize: newDispatch.vehicleSize,
        destination: newDispatch.destination,
        products: newDispatch.products,
        estimatedWeight,
        actualWeight: null,
        dispatchDate: new Date().toISOString().split("T")[0],
        status: "planned",
        createdAt: new Date().toISOString(),
      }

      const response = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dispatch),
      })

      const result = await response.json()
      if (result.success) {
        toast({
          title: "배차 생성 완료",
          description: "배차가 성공적으로 생성되었습니다.",
        })

        setShowCreateDialog(false)
        setNewDispatch({
          vehicleNumber: "",
          vehicleSize: "11톤",
          destination: "",
          products: [],
        })

        await fetchData()
      }
    } catch (error) {
      console.error("[v0] Failed to create dispatch:", error)
      toast({
        title: "오류",
        description: "배차 생성에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateWeight = async () => {
    if (!selectedDispatch || !actualWeight) {
      return
    }

    try {
      const response = await fetch("/api/dispatch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedDispatch.id,
          actualWeight,
          status: "completed",
        }),
      })

      const result = await response.json()
      if (result.success) {
        const variance = actualWeight - selectedDispatch.estimatedWeight
        const variancePercent = ((variance / selectedDispatch.estimatedWeight) * 100).toFixed(1)

        toast({
          title: "계근 데이터 입력 완료",
          description: `실제 중량: ${actualWeight.toFixed(1)}kg (오차: ${variancePercent}%)`,
        })

        setShowWeightDialog(false)
        setSelectedDispatch(null)
        setActualWeight(0)

        await fetchData()
      }
    } catch (error) {
      console.error("[v0] Failed to update weight:", error)
      toast({
        title: "오류",
        description: "계근 데이터 업데이트에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const stats = {
    total: dispatches.length,
    planned: dispatches.filter((d) => d.status === "planned").length,
    dispatched: dispatches.filter((d) => d.status === "dispatched").length,
    completed: dispatches.filter((d) => d.status === "completed").length,
    totalWeight: dispatches.reduce((sum, d) => sum + d.estimatedWeight, 0),
  }

  const plannedDispatches = dispatches.filter((d) => d.status === "planned")
  const dispatchedDispatches = dispatches.filter((d) => d.status === "dispatched")
  const completedDispatches = dispatches.filter((d) => d.status === "completed")

  return (
    <LayoutWrapper>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">배차 관리</h1>
              <p className="text-muted-foreground mt-1">출하 계획을 수립하고 차량 배차를 관리합니다</p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              신규 배차
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>현재 재고 현황</CardTitle>
              <CardDescription>
                총 {inventory.reduce((sum, i) => sum + i.quantity, 0).toLocaleString()}대
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {inventory.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">{inv.product}</p>
                    <p className="text-lg font-bold">{inv.quantity.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>총 배차</CardDescription>
                <CardTitle className="text-3xl">{stats.total}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">전체 배차 건수</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>계획 중</CardDescription>
                <CardTitle className="text-3xl">{stats.planned}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">배차 대기</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>배차 완료</CardDescription>
                <CardTitle className="text-3xl">{stats.completed}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">계근 완료</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>총 중량</CardDescription>
                <CardTitle className="text-3xl">{(stats.totalWeight / 1000).toFixed(1)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">톤</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="planned" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="planned">계획 중 ({plannedDispatches.length})</TabsTrigger>
            <TabsTrigger value="dispatched">배차 완료 ({dispatchedDispatches.length})</TabsTrigger>
            <TabsTrigger value="completed">출하 완료 ({completedDispatches.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="planned" className="mt-6">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">데이터를 불러오는 중...</div>
            ) : plannedDispatches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">배차 계획이 없습니다.</div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>배차번호</TableHead>
                      <TableHead>차량번호</TableHead>
                      <TableHead>차량크기</TableHead>
                      <TableHead>목적지</TableHead>
                      <TableHead>출하품목</TableHead>
                      <TableHead>예상중량</TableHead>
                      <TableHead>실제중량</TableHead>
                      <TableHead>오차</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plannedDispatches.map((dispatch) => {
                      const variance = dispatch.actualWeight ? dispatch.actualWeight - dispatch.estimatedWeight : null
                      const variancePercent = variance ? ((variance / dispatch.estimatedWeight) * 100).toFixed(1) : null

                      return (
                        <TableRow key={dispatch.id}>
                          <TableCell className="font-medium">{dispatch.dispatchNumber}</TableCell>
                          <TableCell>{dispatch.vehicleNumber}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              <Truck className="w-3 h-3 mr-1" />
                              {dispatch.vehicleSize}
                            </Badge>
                          </TableCell>
                          <TableCell>{dispatch.destination}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {dispatch.products.map((p, i) => (
                                <div key={i} className="text-sm">
                                  {p.product}: {p.quantity}대
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{dispatch.estimatedWeight.toFixed(1)}kg</TableCell>
                          <TableCell>{dispatch.actualWeight ? `${dispatch.actualWeight.toFixed(1)}kg` : "-"}</TableCell>
                          <TableCell>
                            {variancePercent ? (
                              <Badge
                                variant={Math.abs(Number.parseFloat(variancePercent)) > 5 ? "destructive" : "secondary"}
                              >
                                {Number.parseFloat(variancePercent) > 0 ? "+" : ""}
                                {variancePercent}%
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {dispatch.status === "planned" && <Badge variant="secondary">계획</Badge>}
                            {dispatch.status === "dispatched" && <Badge>배차중</Badge>}
                            {dispatch.status === "completed" && <Badge className="bg-green-600">완료</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            {dispatch.status !== "completed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedDispatch(dispatch)
                                  setActualWeight(dispatch.estimatedWeight)
                                  setShowWeightDialog(true)
                                }}
                              >
                                <Weight className="w-4 h-4 mr-1" />
                                계근입력
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
          </TabsContent>

          <TabsContent value="dispatched" className="mt-6">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">데이터를 불러오는 중...</div>
            ) : dispatchedDispatches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">배차 완료된 배차가 없습니다.</div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>배차번호</TableHead>
                      <TableHead>차량번호</TableHead>
                      <TableHead>차량크기</TableHead>
                      <TableHead>목적지</TableHead>
                      <TableHead>출하품목</TableHead>
                      <TableHead>예상중량</TableHead>
                      <TableHead>실제중량</TableHead>
                      <TableHead>오차</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispatchedDispatches.map((dispatch) => {
                      const variance = dispatch.actualWeight ? dispatch.actualWeight - dispatch.estimatedWeight : null
                      const variancePercent = variance ? ((variance / dispatch.estimatedWeight) * 100).toFixed(1) : null

                      return (
                        <TableRow key={dispatch.id}>
                          <TableCell className="font-medium">{dispatch.dispatchNumber}</TableCell>
                          <TableCell>{dispatch.vehicleNumber}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              <Truck className="w-3 h-3 mr-1" />
                              {dispatch.vehicleSize}
                            </Badge>
                          </TableCell>
                          <TableCell>{dispatch.destination}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {dispatch.products.map((p, i) => (
                                <div key={i} className="text-sm">
                                  {p.product}: {p.quantity}대
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{dispatch.estimatedWeight.toFixed(1)}kg</TableCell>
                          <TableCell>{dispatch.actualWeight ? `${dispatch.actualWeight.toFixed(1)}kg` : "-"}</TableCell>
                          <TableCell>
                            {variancePercent ? (
                              <Badge
                                variant={Math.abs(Number.parseFloat(variancePercent)) > 5 ? "destructive" : "secondary"}
                              >
                                {Number.parseFloat(variancePercent) > 0 ? "+" : ""}
                                {variancePercent}%
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {dispatch.status === "planned" && <Badge variant="secondary">계획</Badge>}
                            {dispatch.status === "dispatched" && <Badge>배차중</Badge>}
                            {dispatch.status === "completed" && <Badge className="bg-green-600">완료</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            {dispatch.status !== "completed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedDispatch(dispatch)
                                  setActualWeight(dispatch.estimatedWeight)
                                  setShowWeightDialog(true)
                                }}
                              >
                                <Weight className="w-4 h-4 mr-1" />
                                계근입력
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
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">데이터를 불러오는 중...</div>
            ) : completedDispatches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">출하 완료된 배차가 없습니다.</div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>배차번호</TableHead>
                      <TableHead>차량번호</TableHead>
                      <TableHead>차량크기</TableHead>
                      <TableHead>목적지</TableHead>
                      <TableHead>출하품목</TableHead>
                      <TableHead>예상중량</TableHead>
                      <TableHead>실제중량</TableHead>
                      <TableHead>오차</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedDispatches.map((dispatch) => {
                      const variance = dispatch.actualWeight ? dispatch.actualWeight - dispatch.estimatedWeight : null
                      const variancePercent = variance ? ((variance / dispatch.estimatedWeight) * 100).toFixed(1) : null

                      return (
                        <TableRow key={dispatch.id}>
                          <TableCell className="font-medium">{dispatch.dispatchNumber}</TableCell>
                          <TableCell>{dispatch.vehicleNumber}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              <Truck className="w-3 h-3 mr-1" />
                              {dispatch.vehicleSize}
                            </Badge>
                          </TableCell>
                          <TableCell>{dispatch.destination}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {dispatch.products.map((p, i) => (
                                <div key={i} className="text-sm">
                                  {p.product}: {p.quantity}대
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{dispatch.estimatedWeight.toFixed(1)}kg</TableCell>
                          <TableCell>{dispatch.actualWeight ? `${dispatch.actualWeight.toFixed(1)}kg` : "-"}</TableCell>
                          <TableCell>
                            {variancePercent ? (
                              <Badge
                                variant={Math.abs(Number.parseFloat(variancePercent)) > 5 ? "destructive" : "secondary"}
                              >
                                {Number.parseFloat(variancePercent) > 0 ? "+" : ""}
                                {variancePercent}%
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {dispatch.status === "planned" && <Badge variant="secondary">계획</Badge>}
                            {dispatch.status === "dispatched" && <Badge>배차중</Badge>}
                            {dispatch.status === "completed" && <Badge className="bg-green-600">완료</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            {dispatch.status !== "completed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedDispatch(dispatch)
                                  setActualWeight(dispatch.estimatedWeight)
                                  setShowWeightDialog(true)
                                }}
                              >
                                <Weight className="w-4 h-4 mr-1" />
                                계근입력
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
          </TabsContent>
        </Tabs>

        {/* Create Dispatch Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>배차 생성</DialogTitle>
              <DialogDescription>차량 정보와 출하 품목을 입력하여 배차를 생성합니다</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>차량번호</Label>
                  <Input
                    placeholder="예: 12가3456"
                    value={newDispatch.vehicleNumber}
                    onChange={(e) => setNewDispatch((prev) => ({ ...prev, vehicleNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>차량크기</Label>
                  <Select
                    value={newDispatch.vehicleSize}
                    onValueChange={(value) =>
                      setNewDispatch((prev) => ({ ...prev, vehicleSize: value as "5톤" | "11톤" | "25톤" }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5톤">5톤 ({VEHICLE_CAPACITIES["5톤"]}kg)</SelectItem>
                      <SelectItem value="11톤">11톤 ({VEHICLE_CAPACITIES["11톤"]}kg)</SelectItem>
                      <SelectItem value="25톤">25톤 ({VEHICLE_CAPACITIES["25톤"]}kg)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>목적지</Label>
                <Input
                  placeholder="예: 현대차 울산공장"
                  value={newDispatch.destination}
                  onChange={(e) => setNewDispatch((prev) => ({ ...prev, destination: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>출하 품목</Label>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => addProductToDispatch("EV")}>
                      EV 추가
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => addProductToDispatch("SUV")}>
                      SUV 추가
                    </Button>
                  </div>
                </div>

                {newDispatch.products.length === 0 ? (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                    출하할 품목을 추가해주세요
                  </div>
                ) : (
                  <div className="space-y-2">
                    {newDispatch.products.map((product, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="flex-1 grid grid-cols-3 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">품목</Label>
                            <p className="font-semibold">{product.product}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">수량</Label>
                            <Input
                              type="number"
                              value={product.quantity || ""}
                              onChange={(e) => updateProductQuantity(index, Number.parseInt(e.target.value) || 0)}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">중량 (kg)</Label>
                            <p className="font-semibold">{product.weight.toFixed(1)}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removeProduct(index)}>
                          삭제
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="font-semibold">예상 총 중량</span>
                <span className="text-2xl font-bold">{calculateEstimatedWeight().toFixed(1)} kg</span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                취소
              </Button>
              <Button onClick={handleCreateDispatch}>배차 생성</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Weight Input Dialog */}
        <Dialog open={showWeightDialog} onOpenChange={setShowWeightDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>계근 데이터 입력</DialogTitle>
              <DialogDescription>실제 차량 통과 시 측정된 중량을 입력합니다</DialogDescription>
            </DialogHeader>

            {selectedDispatch && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">배차번호</span>
                    <span className="font-medium">{selectedDispatch.dispatchNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">차량번호</span>
                    <span className="font-medium">{selectedDispatch.vehicleNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">예상 중량</span>
                    <span className="font-semibold">{selectedDispatch.estimatedWeight.toFixed(1)} kg</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>실제 계근 중량 (kg)</Label>
                  <Input
                    type="number"
                    value={actualWeight || ""}
                    onChange={(e) => setActualWeight(Number.parseFloat(e.target.value) || 0)}
                    placeholder="실제 중량 입력"
                  />
                </div>

                {actualWeight > 0 && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium">
                      오차: {actualWeight - selectedDispatch.estimatedWeight > 0 ? "+" : ""}
                      {(actualWeight - selectedDispatch.estimatedWeight).toFixed(1)} kg (
                      {(
                        ((actualWeight - selectedDispatch.estimatedWeight) / selectedDispatch.estimatedWeight) *
                        100
                      ).toFixed(1)}
                      %)
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWeightDialog(false)}>
                취소
              </Button>
              <Button onClick={handleUpdateWeight}>저장</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Toaster />
      </div>
    </LayoutWrapper>
  )
}
