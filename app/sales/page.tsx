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
  const [selectedYear, setSelectedYear] = useState(2026) // 2026년으로 초기값 설정
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
  const [shipments, setShipments] = useState<Shipment[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const loadData = async () => {
      await fetchBusinessPlans()
      await fetchSalesPlans()
      const shipmentData = await fetchShipmentPlans()
      setShipments(shipmentData || [])
    }
    loadData()
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
        return data.data || []
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
      if (!currentBusinessPlan) return
      
      // 전체 판매계획 데이터 가져오기 (필터링 없이)
      const allSalesPlansResponse = await fetch(`/api/sales-plan?year=${selectedYear}`)
      const allSalesPlansData = await allSalesPlansResponse.json()
      const allSalesPlans = allSalesPlansData.success ? (allSalesPlansData.data || []) : []
      
      // 승인된 판매계획만 그래프에 포함
      const approvedPlans = allSalesPlans.filter((p: SalesPlan) => p.status === "approved")
      const monthlySalesPlans = approvedPlans.reduce((acc: Record<string, { quantity: number; revenue: number }>, plan: SalesPlan) => {
        const planYear = plan.yearMonth.split("-")[0]
        if (planYear !== String(selectedYear)) return acc
        const month = plan.yearMonth.split("-")[1]
        if (!acc[month]) {
          acc[month] = { quantity: 0, revenue: 0 }
        }
        acc[month].quantity += plan.plannedQuantity
        acc[month].revenue += plan.plannedRevenue
        return acc
      }, {} as Record<string, { quantity: number; revenue: number }>)

      // 출하계획 데이터 가져오기 (항상 최신 데이터 가져오기)
      const shipmentsData = await fetchShipmentPlans()
      
      const monthlyShipments = (shipmentsData || []).reduce((acc: Record<string, { quantity: number; revenue: number }>, shipment: Shipment) => {
        if (!shipment || !shipment.shipmentDate) return acc
        const shipmentYear = shipment.shipmentDate.split("-")[0]
        if (shipmentYear !== String(selectedYear)) return acc
        const month = shipment.shipmentDate.split("-")[1]
        if (!month || month.length !== 2) return acc
        if (!acc[month]) {
          acc[month] = { quantity: 0, revenue: 0 }
        }
        const shipmentQuantity = shipment.products?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0
        const shipmentRevenue = (shipment.totalAmount || 0) / 10000 // 원 단위를 만원 단위로 변환
        acc[month].quantity += shipmentQuantity
        acc[month].revenue += shipmentRevenue
        return acc
      }, {} as Record<string, { quantity: number; revenue: number }>)
      
      // 출하계획 데이터를 state에 저장
      if (shipmentsData && shipmentsData.length > 0) {
        setShipments(shipmentsData)
      }

      const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]
      
      setComparisonData(
        months.map((month) => {
          const monthNum = parseInt(month)
          const monthlyBusinessTarget = currentBusinessPlan?.monthlyTargets?.find((mt) => mt.month === monthNum)?.target || 
                                       (currentBusinessPlan ? Math.round(currentBusinessPlan.totalTarget / 12) : 0)
          
          return {
            month: `${month}월`,
            경영계획: monthlyBusinessTarget,
            판매계획: monthlySalesPlans[month]?.quantity || 0,
            출하계획: monthlyShipments[month]?.quantity || 0,
          }
        }),
      )
    }

    if (businessPlans.length > 0) {
      prepareComparisonData()
    }
  }, [selectedYear, businessPlans])

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
                <CardDescription>{selectedYear}년도 경영계획 목표 및 실적 (3월 기준)</CardDescription>
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
              <div className="space-y-6">
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
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {selectedYear >= 2026 ? "3월 누적 실적" : "12월 누적 실적"}
                  </h3>
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>목표 매출 ({selectedYear >= 2026 ? "1-3월" : "1-12월"})</Label>
                      <div className="text-2xl font-bold">
                        {(() => {
                          const targetMonths = selectedYear >= 2026 ? 3 : 12
                          return currentBusinessPlan.monthlyTargets
                            ?.slice(0, targetMonths)
                            .reduce((sum, mt) => sum + mt.revenue, 0)
                            .toLocaleString() || Math.round((currentBusinessPlan.totalRevenue / 12) * targetMonths).toLocaleString()
                        })()}
                        만원
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>누적 출하 실적 ({selectedYear >= 2026 ? "1-3월" : "1-12월"})</Label>
                      <div className="text-2xl font-bold text-blue-600">
                        {(() => {
                          const targetMonths = selectedYear >= 2026 ? 3 : 12
                          const cumulativeShipments = (shipments || []).filter((s) => {
                            if (!s.shipmentDate) return false
                            const year = s.shipmentDate.split("-")[0]
                            const month = parseInt(s.shipmentDate.split("-")[1])
                            return year === String(selectedYear) && month >= 1 && month <= targetMonths
                          })
                          const totalRevenue = cumulativeShipments.reduce((sum, s) => sum + ((s.totalAmount || 0) / 10000), 0)
                          return `${Math.round(totalRevenue).toLocaleString()}만원`
                        })()}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>달성률</Label>
                      <div className="text-2xl font-bold text-green-600">
                        {(() => {
                          const targetMonths = selectedYear >= 2026 ? 3 : 12
                          const targetRevenue = currentBusinessPlan.monthlyTargets
                            ?.slice(0, targetMonths)
                            .reduce((sum, mt) => sum + mt.revenue, 0) || Math.round((currentBusinessPlan.totalRevenue / 12) * targetMonths)
                          const cumulativeShipments = (shipments || []).filter((s) => {
                            if (!s.shipmentDate) return false
                            const year = s.shipmentDate.split("-")[0]
                            const month = parseInt(s.shipmentDate.split("-")[1])
                            return year === String(selectedYear) && month >= 1 && month <= targetMonths
                          })
                          const actualRevenue = cumulativeShipments.reduce((sum, s) => sum + ((s.totalAmount || 0) / 10000), 0)
                          const achievementRate = targetRevenue > 0 ? Math.round((actualRevenue / targetRevenue) * 100) : 0
                          return `${achievementRate}`
                        })()}
                        %
                      </div>
                    </div>
                  </div>
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

        {/* 업체별 판매계획 관리는 판매계획 관리 페이지(/sales-management)로 이동됨 */}

        <Toaster />
      </div>
    </LayoutWrapper>
  )
}
