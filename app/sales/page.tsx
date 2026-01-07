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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, Upload, Edit2, History, Save, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { BusinessPlan, SalesPlan, SalesPlanHistory, Shipment } from "@/lib/db"

export default function SalesPage() {
  const [businessPlans, setBusinessPlans] = useState<BusinessPlan[]>([])
  const [salesPlans, setSalesPlans] = useState<SalesPlan[]>([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<string>("03") // 3월로 초기값 설정
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<SalesPlan | null>(null)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [approvalPlans, setApprovalPlans] = useState<SalesPlan[]>([])
  const [approvalComment, setApprovalComment] = useState<string>("")
  const [planHistory, setPlanHistory] = useState<SalesPlanHistory[]>([])
  const [editingMode, setEditingMode] = useState(false)
  const [selectedPlans, setSelectedPlans] = useState<string[]>([])
  const { toast } = useToast()

  useEffect(() => {
    fetchBusinessPlans()
    fetchSalesPlans()
  }, [selectedYear])

  useEffect(() => {
    fetchSalesPlans()
  }, [selectedYear, selectedMonth, selectedCustomer, selectedStatus])

  const fetchBusinessPlans = async () => {
    try {
      const response = await fetch("/api/business-plan")
      const data = await response.json()
      if (data.success) {
        setBusinessPlans(data.data)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch business plans:", error)
      toast({
        title: "오류",
        description: "경영계획 데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const fetchSalesPlans = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("year", String(selectedYear))
      if (selectedMonth) {
        params.append("yearMonth", `${selectedYear}-${selectedMonth.padStart(2, "0")}`)
      }
      if (selectedCustomer && selectedCustomer !== "all") {
        params.append("customer", selectedCustomer)
      }
      if (selectedStatus && selectedStatus !== "all") {
        params.append("status", selectedStatus)
      }
      
      const response = await fetch(`/api/sales-plan?${params.toString()}`)
      const data = await response.json()
      if (data.success) {
        setSalesPlans(data.data)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch sales plans:", error)
      toast({
        title: "오류",
        description: "판매계획 데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPlanHistory = async (planId: string) => {
    try {
      const response = await fetch(`/api/sales-plan/history?salesPlanId=${planId}`)
      const data = await response.json()
      if (data.success) {
        setPlanHistory(data.data)
        setShowHistoryDialog(true)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch plan history:", error)
      toast({
        title: "오류",
        description: "이력 데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleSavePlan = async (plan: SalesPlan) => {
    try {
      const response = await fetch("/api/sales-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "저장 완료",
          description: "판매계획이 저장되었습니다.",
        })
        setEditingPlan(null)
        await fetchSalesPlans()
      }
    } catch (error) {
      console.error("[v0] Failed to save plan:", error)
      toast({
        title: "오류",
        description: "판매계획 저장에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleBulkSave = async () => {
    try {
      const response = await fetch("/api/sales-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(salesPlans),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "저장 완료",
          description: "모든 판매계획이 저장되었습니다.",
        })
        setEditingMode(false)
        await fetchSalesPlans()
      }
    } catch (error) {
      console.error("[v0] Failed to save plans:", error)
      toast({
        title: "오류",
        description: "판매계획 저장에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleApprovePlans = async () => {
    if (selectedPlans.length === 0) {
      toast({
        title: "선택 필요",
        description: "승인할 판매계획을 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    // 선택된 계획들을 가져와서 승인 다이얼로그 표시
    const plansToApprove = salesPlans.filter((p) => selectedPlans.includes(p.id))
    setApprovalPlans(plansToApprove)
    setShowApprovalDialog(true)
  }

  const handleConfirmApproval = async () => {
    try {
      const response = await fetch("/api/sales-plan/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedPlans,
          approvalComment: approvalComment,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "승인 완료",
          description: data.message || `${selectedPlans.length}건의 판매계획이 승인되었습니다.`,
        })
        setSelectedPlans([])
        setApprovalComment("")
        setShowApprovalDialog(false)
        await fetchSalesPlans()
      }
    } catch (error) {
      console.error("[v0] Failed to approve plans:", error)
      toast({
        title: "오류",
        description: "판매계획 승인에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleExportExcel = async () => {
    try {
      const response = await fetch(`/api/sales-plan/export?year=${selectedYear}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `sales_plan_${selectedYear}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "다운로드 완료",
        description: "엑셀 파일이 다운로드되었습니다.",
      })
    } catch (error) {
      console.error("[v0] Failed to export:", error)
      toast({
        title: "오류",
        description: "엑셀 다운로드에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleUploadExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/sales-plan/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "업로드 완료",
          description: data.message || "엑셀 파일이 업로드되었습니다.",
        })
        await fetchSalesPlans()
        // 파일 입력 초기화
        event.target.value = ""
      } else {
        toast({
          title: "오류",
          description: data.error || "엑셀 업로드에 실패했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Failed to upload:", error)
      toast({
        title: "오류",
        description: "엑셀 업로드에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  // 출하계획 데이터 가져오기 (shipments API 사용)
  const fetchShipmentPlans = async () => {
    try {
      const response = await fetch(`/api/shipments`)
      const data = await response.json()
      if (data.success) {
        return data.data
      }
      return []
    } catch (error) {
      console.error("[v0] Failed to fetch shipments:", error)
      return []
    }
  }

  // 비교 그래프 데이터 준비
  const [comparisonData, setComparisonData] = useState<any[]>([])

  useEffect(() => {
    const prepareComparisonData = async () => {
      const currentBusinessPlan = businessPlans.find((bp) => bp.year === selectedYear)
      // 승인된 판매계획만 그래프에 포함
      const approvedPlans = salesPlans.filter((p) => p.status === "approved")
      const monthlySalesPlans = approvedPlans.reduce((acc, plan) => {
        const month = plan.yearMonth.split("-")[1]
        if (!acc[month]) {
          acc[month] = { quantity: 0, revenue: 0 }
        }
        acc[month].quantity += plan.plannedQuantity
        acc[month].revenue += plan.plannedRevenue
        return acc
      }, {} as Record<string, { quantity: number; revenue: number }>)

      const shipments = await fetchShipmentPlans()
      const monthlyShipments = shipments.reduce((acc: Record<string, { quantity: number }>, shipment: Shipment) => {
        const shipmentYear = shipment.shipmentDate.split("-")[0]
        if (shipmentYear !== String(selectedYear)) return acc
        const month = shipment.shipmentDate.split("-")[1]
        if (!acc[month]) {
          acc[month] = { quantity: 0 }
        }
        acc[month].quantity += shipment.products.reduce((sum, p) => sum + p.quantity, 0)
        return acc
      }, {} as Record<string, { quantity: number }>)

      const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]
      const monthlyBusinessTarget = currentBusinessPlan ? currentBusinessPlan.totalTarget / 12 : 0

      setComparisonData(
        months.map((month) => ({
          month: `${month}월`,
          경영계획: Math.round(monthlyBusinessTarget),
          판매계획: monthlySalesPlans[month]?.quantity || 0,
          출하계획: monthlyShipments[month]?.quantity || 0,
        })),
      )
    }

    if (businessPlans.length > 0) {
      prepareComparisonData()
    }
  }, [selectedYear, salesPlans, businessPlans])

  const currentBusinessPlan = businessPlans.find((bp) => bp.year === selectedYear)
  // 필터링은 API에서 처리되므로 salesPlans를 그대로 사용

  return (
    <LayoutWrapper>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">판매 계획</h1>
          <p className="text-muted-foreground mt-1">연별 경영계획과 월별 판매계획을 관리하고 비교합니다</p>
        </div>

        {/* 연별 경영계획 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>연별 경영계획</CardTitle>
                <CardDescription>{selectedYear}년도 경영계획 목표</CardDescription>
              </div>
              <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024년</SelectItem>
                  <SelectItem value="2025">2025년</SelectItem>
                  <SelectItem value="2026">2026년</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {currentBusinessPlan ? (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>연간 목표 수량</Label>
                  <div className="text-3xl font-bold">{currentBusinessPlan.totalTarget.toLocaleString()}대</div>
                </div>
                <div className="space-y-2">
                  <Label>연간 목표 매출</Label>
                  <div className="text-3xl font-bold">{currentBusinessPlan.totalRevenue.toLocaleString()}만원</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">해당 연도의 경영계획이 없습니다.</div>
            )}
          </CardContent>
        </Card>

        {/* 비교 그래프 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>계획 비교 그래프</CardTitle>
            <CardDescription>경영계획, 판매계획, 출하계획을 월별로 비교합니다</CardDescription>
          </CardHeader>
          <CardContent>
            {comparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="경영계획" stroke="#8884d8" strokeWidth={2} />
                  <Line type="monotone" dataKey="판매계획" stroke="#82ca9d" strokeWidth={2} />
                  <Line type="monotone" dataKey="출하계획" stroke="#ffc658" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">데이터를 불러오는 중...</div>
            )}
          </CardContent>
        </Card>

        {/* 업체별 판매계획 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>업체별 판매계획</CardTitle>
                <CardDescription>{selectedYear}년 {selectedMonth}월 판매계획 상세</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="전체 업체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 업체</SelectItem>
                    <SelectItem value="현대차">현대차</SelectItem>
                    <SelectItem value="삼성SDI">삼성SDI</SelectItem>
                    <SelectItem value="일본거래처">일본거래처</SelectItem>
                    <SelectItem value="유럽거래처">유럽거래처</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="월 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = String(i + 1).padStart(2, "0")
                      return (
                        <SelectItem key={month} value={month}>
                          {i + 1}월
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="전체 상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 상태</SelectItem>
                    <SelectItem value="draft">변경요청</SelectItem>
                    <SelectItem value="approved">승인</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleExportExcel}>
                  <Download className="w-4 h-4 mr-2" />
                  엑셀 다운로드
                </Button>
                <label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleUploadExcel}
                    className="hidden"
                  />
                  <Button variant="outline" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      엑셀 업로드
                    </span>
                  </Button>
                </label>
                {editingMode ? (
                  <>
                    <Button variant="outline" onClick={() => { setEditingMode(false); fetchSalesPlans(); }}>
                      취소
                    </Button>
                    <Button onClick={handleBulkSave}>
                      <Save className="w-4 h-4 mr-2" />
                      저장
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setEditingMode(true)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      수정 모드
                    </Button>
                    <Button
                      onClick={handleApprovePlans}
                      disabled={selectedPlans.length === 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      승인 ({selectedPlans.length})
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">데이터를 불러오는 중...</div>
            ) : salesPlans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">판매계획 데이터가 없습니다.</div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {!editingMode && (
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={salesPlans.every((p) => selectedPlans.includes(p.id)) && salesPlans.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPlans(salesPlans.map((p) => p.id))
                              } else {
                                setSelectedPlans([])
                              }
                            }}
                            className="rounded border-input"
                          />
                        </TableHead>
                      )}
                      <TableHead>업체</TableHead>
                      <TableHead>연월</TableHead>
                      <TableHead>제품코드</TableHead>
                      <TableHead>제품명</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead>계획수량</TableHead>
                      <TableHead>계획매출(만원)</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesPlans
                      .sort((a, b) => {
                        const customerCompare = a.customer.localeCompare(b.customer)
                        if (customerCompare !== 0) return customerCompare
                        return a.yearMonth.localeCompare(b.yearMonth)
                      })
                      .map((plan) => (
                        <TableRow key={plan.id}>
                          {!editingMode && (
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedPlans.includes(plan.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPlans([...selectedPlans, plan.id])
                                  } else {
                                    setSelectedPlans(selectedPlans.filter((id) => id !== plan.id))
                                  }
                                }}
                                className="rounded border-input"
                              />
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{plan.customer}</TableCell>
                          <TableCell>{plan.yearMonth}</TableCell>
                          <TableCell className="font-medium">{plan.productCode}</TableCell>
                          <TableCell>{plan.product}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{plan.category}</Badge>
                          </TableCell>
                          <TableCell>
                            {editingMode ? (
                              <Input
                                type="number"
                                value={plan.plannedQuantity}
                                onChange={(e) => {
                                  const updatedPlans = salesPlans.map((p) =>
                                    p.id === plan.id
                                      ? { ...p, plannedQuantity: parseInt(e.target.value) || 0, plannedRevenue: (parseInt(e.target.value) || 0) * (plan.plannedRevenue / plan.plannedQuantity || 200) }
                                      : p,
                                  )
                                  setSalesPlans(updatedPlans)
                                }}
                                className="w-24"
                              />
                            ) : (
                              plan.plannedQuantity.toLocaleString()
                            )}
                          </TableCell>
                          <TableCell>
                            {editingMode ? (
                              <Input
                                type="number"
                                value={plan.plannedRevenue}
                                onChange={(e) => {
                                  const updatedPlans = salesPlans.map((p) =>
                                    p.id === plan.id ? { ...p, plannedRevenue: parseInt(e.target.value) || 0 } : p,
                                  )
                                  setSalesPlans(updatedPlans)
                                }}
                                className="w-32"
                              />
                            ) : (
                              plan.plannedRevenue.toLocaleString()
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={plan.status === "approved" ? "default" : "secondary"}>
                              {plan.status === "approved" ? "승인" : "변경요청"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {!editingMode && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingPlan(plan)}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => fetchPlanHistory(plan.id)}
                                  >
                                    <History className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 편집 다이얼로그 */}
        <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>판매계획 수정</DialogTitle>
              <DialogDescription>판매계획 정보를 수정합니다</DialogDescription>
            </DialogHeader>
            {editingPlan && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>업체</Label>
                  <Input value={editingPlan.customer} disabled />
                </div>
                <div className="space-y-2">
                  <Label>연월</Label>
                  <Input value={editingPlan.yearMonth} disabled />
                </div>
                <div className="space-y-2">
                  <Label>제품코드</Label>
                  <Input value={editingPlan.productCode} disabled />
                </div>
                <div className="space-y-2">
                  <Label>제품명</Label>
                  <Input value={editingPlan.product} disabled />
                </div>
                <div className="space-y-2">
                  <Label>계획수량</Label>
                  <Input
                    type="number"
                    value={editingPlan.plannedQuantity}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        plannedQuantity: parseInt(e.target.value) || 0,
                        plannedRevenue: (parseInt(e.target.value) || 0) * (editingPlan.plannedRevenue / editingPlan.plannedQuantity || 200),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>계획매출(만원)</Label>
                  <Input
                    type="number"
                    value={editingPlan.plannedRevenue}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, plannedRevenue: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>변경 요청 의견</Label>
                  <textarea
                    value={editingPlan.changeRequestComment || ""}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, changeRequestComment: e.target.value })
                    }
                    className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="변경 요청 사유를 입력하세요"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingPlan(null)}>
                취소
              </Button>
              <Button onClick={() => editingPlan && handleSavePlan(editingPlan)}>저장</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 승인 다이얼로그 */}
        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>판매계획 승인</DialogTitle>
              <DialogDescription>선택한 판매계획을 승인합니다</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="max-h-[400px] overflow-y-auto space-y-3">
                {approvalPlans.map((plan) => (
                  <div key={plan.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {plan.customer} - {plan.product} ({plan.productCode})
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {plan.yearMonth} | 수량: {plan.plannedQuantity.toLocaleString()} | 매출: {plan.plannedRevenue.toLocaleString()}만원
                        </div>
                        {plan.changeRequestComment && (
                          <div className="mt-2 p-2 bg-muted rounded text-sm">
                            <div className="font-medium mb-1">변경 요청 의견:</div>
                            <div>{plan.changeRequestComment}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>승인 의견</Label>
                <textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="승인 의견을 입력하세요 (선택사항)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowApprovalDialog(false); setApprovalComment(""); }}>
                취소
              </Button>
              <Button onClick={handleConfirmApproval} className="bg-green-600 hover:bg-green-700">
                승인
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 이력 다이얼로그 */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>판매계획 변경 이력</DialogTitle>
              <DialogDescription>판매계획의 변경 내역을 확인합니다</DialogDescription>
            </DialogHeader>
            <div className="max-h-[500px] overflow-y-auto">
              {planHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">변경 이력이 없습니다.</div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>변경일시</TableHead>
                        <TableHead>업체</TableHead>
                        <TableHead>제품코드</TableHead>
                        <TableHead>이전 수량</TableHead>
                        <TableHead>변경 수량</TableHead>
                        <TableHead>이전 매출</TableHead>
                        <TableHead>변경 매출</TableHead>
                        <TableHead>이전 상태</TableHead>
                        <TableHead>변경 상태</TableHead>
                        <TableHead>변경자</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planHistory
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((history) => (
                          <TableRow key={history.id}>
                            <TableCell>{new Date(history.createdAt).toLocaleString("ko-KR")}</TableCell>
                            <TableCell>{history.customer}</TableCell>
                            <TableCell>{history.productCode}</TableCell>
                            <TableCell>{history.previousQuantity.toLocaleString()}</TableCell>
                            <TableCell className="font-semibold">{history.newQuantity.toLocaleString()}</TableCell>
                            <TableCell>{history.previousRevenue.toLocaleString()}</TableCell>
                            <TableCell className="font-semibold">{history.newRevenue.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{history.previousStatus || "-"}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={history.newStatus === "approved" ? "default" : "secondary"}>
                                {history.newStatus || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell>{history.changedBy}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setShowHistoryDialog(false)}>닫기</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Toaster />
      </div>
    </LayoutWrapper>
  )
}
