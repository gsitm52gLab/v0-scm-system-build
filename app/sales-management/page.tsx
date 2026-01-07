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
import { Textarea } from "@/components/ui/textarea"
import type { SalesPlan, SalesPlanHistory } from "@/lib/db"

export default function SalesManagementPage() {
  const [salesPlans, setSalesPlans] = useState<SalesPlan[]>([])
  const [selectedYear, setSelectedYear] = useState(2026)
  const [selectedMonth, setSelectedMonth] = useState<string>("03")
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
  const [historyPage, setHistoryPage] = useState(1)
  const historyItemsPerPage = 10
  const { toast } = useToast()

  useEffect(() => {
    fetchSalesPlans()
  }, [selectedYear, selectedMonth, selectedCustomer, selectedStatus])

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

  const handleSelectPlan = (planId: string, checked: boolean) => {
    if (checked) {
      setSelectedPlans([...selectedPlans, planId])
    } else {
      setSelectedPlans(selectedPlans.filter((id) => id !== planId))
    }
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPlans(salesPlans.map((p) => p.id))
    } else {
      setSelectedPlans([])
    }
  }

  const handlePlanChange = (planId: string, field: string, value: number) => {
    setSalesPlans(
      salesPlans.map((p) => (p.id === planId ? { ...p, [field]: value } : p)),
    )
  }

  const handleSavePlan = async (plan: SalesPlan) => {
    try {
      const response = await fetch(`/api/sales-plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: plan.id,
          plannedQuantity: plan.plannedQuantity,
          plannedRevenue: plan.plannedRevenue,
          changeRequestComment: plan.changeRequestComment,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "성공",
          description: "판매계획이 수정되었습니다.",
        })
        setEditingPlan(null)
        fetchSalesPlans()
      }
    } catch (error) {
      console.error("[v0] Failed to update sales plan:", error)
      toast({
        title: "오류",
        description: "판매계획 수정에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleBulkSave = async () => {
    try {
      const response = await fetch(`/api/sales-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plans: salesPlans.map((p) => ({
            id: p.id,
            plannedQuantity: p.plannedQuantity,
            plannedRevenue: p.plannedRevenue,
          })),
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "성공",
          description: "판매계획이 일괄 수정되었습니다.",
        })
        setEditingMode(false)
        fetchSalesPlans()
      }
    } catch (error) {
      console.error("[v0] Failed to bulk update sales plans:", error)
      toast({
        title: "오류",
        description: "판매계획 일괄 수정에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleApprovePlans = () => {
    const plansToApprove = salesPlans.filter((p) => selectedPlans.includes(p.id))
    if (plansToApprove.length === 0) {
      toast({
        title: "알림",
        description: "승인할 판매계획을 선택해주세요.",
        variant: "destructive",
      })
      return
    }
    setApprovalPlans(plansToApprove)
    setShowApprovalDialog(true)
  }

  const handleConfirmApproval = async () => {
    try {
      const response = await fetch(`/api/sales-plan/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesPlanIds: selectedPlans,
          approvalComment,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "성공",
          description: data.message || "판매계획이 승인되었습니다.",
        })
        setShowApprovalDialog(false)
        setSelectedPlans([])
        setApprovalComment("")
        fetchSalesPlans()
      }
    } catch (error) {
      console.error("[v0] Failed to approve sales plans:", error)
      toast({
        title: "오류",
        description: "판매계획 승인에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const fetchPlanHistory = async (planId: string) => {
    try {
      const response = await fetch(`/api/sales-plan/history?planId=${planId}`)
      const data = await response.json()
      if (data.success) {
        setPlanHistory(data.data)
        setShowHistoryDialog(true)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch plan history:", error)
      toast({
        title: "오류",
        description: "판매계획 이력을 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleExportExcel = async () => {
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

      const response = await fetch(`/api/sales-plan/export?${params.toString()}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `판매계획_${selectedYear}년_${selectedMonth}월.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "성공",
        description: "엑셀 파일이 다운로드되었습니다.",
      })
    } catch (error) {
      console.error("[v0] Failed to export excel:", error)
      toast({
        title: "오류",
        description: "엑셀 다운로드에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/sales-plan/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "성공",
          description: "엑셀 파일이 업로드되었습니다.",
        })
        fetchSalesPlans()
      }
    } catch (error) {
      console.error("[v0] Failed to upload excel:", error)
      toast({
        title: "오류",
        description: "엑셀 업로드에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const filteredPlans = salesPlans

  return (
    <LayoutWrapper>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">판매계획 관리</h1>
          <p className="text-muted-foreground mt-1">업체별 판매계획을 관리하고 승인합니다</p>
        </div>

        {/* 업체별 판매계획 */}
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>업체별 판매계획</CardTitle>
                <CardDescription>{selectedYear}년 {selectedMonth}월 판매계획 상세</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
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
            <div className="flex items-center gap-3 flex-wrap">
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
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">데이터를 불러오는 중...</div>
            ) : filteredPlans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">판매계획 데이터가 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {!editingMode && (
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={filteredPlans.every((p) => selectedPlans.includes(p.id)) && filteredPlans.length > 0}
                            onChange={handleSelectAll}
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
                    {filteredPlans
                      .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth) || a.customer.localeCompare(b.customer))
                      .map((plan) => (
                        <TableRow key={plan.id}>
                          {!editingMode && (
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedPlans.includes(plan.id)}
                                onChange={(e) => handleSelectPlan(plan.id, e.target.checked)}
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
                                onChange={(e) =>
                                  handlePlanChange(plan.id, "plannedQuantity", parseInt(e.target.value) || 0)
                                }
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
                                onChange={(e) =>
                                  handlePlanChange(plan.id, "plannedRevenue", parseInt(e.target.value) || 0)
                                }
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

        {/* 수정 다이얼로그 */}
        <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>판매계획 수정</DialogTitle>
              <DialogDescription>판매계획 정보를 수정합니다</DialogDescription>
            </DialogHeader>
            {editingPlan && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">업체</Label>
                  <Input id="customer" value={editingPlan.customer} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearMonth">연월</Label>
                  <Input id="yearMonth" value={editingPlan.yearMonth} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product">제품</Label>
                  <Input id="product" value={editingPlan.product} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plannedQuantity">계획 수량</Label>
                  <Input
                    id="plannedQuantity"
                    type="number"
                    value={editingPlan.plannedQuantity}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, plannedQuantity: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plannedRevenue">계획 매출 (만원)</Label>
                  <Input
                    id="plannedRevenue"
                    type="number"
                    value={editingPlan.plannedRevenue}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, plannedRevenue: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="changeRequestComment">변경 요청 의견</Label>
                  <Textarea
                    id="changeRequestComment"
                    placeholder="변경 요청 사유를 입력해주세요."
                    value={editingPlan.changeRequestComment || ""}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditingPlan({ ...editingPlan, changeRequestComment: e.target.value })
                    }
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
                        <p className="font-medium">
                          {plan.customer} - {plan.product} ({plan.yearMonth})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          수량: {plan.plannedQuantity.toLocaleString()}대, 매출: {plan.plannedRevenue.toLocaleString()}만원
                        </p>
                      </div>
                      <Badge variant="secondary">{plan.status === "approved" ? "승인" : "변경요청"}</Badge>
                    </div>
                    {plan.changeRequestComment && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <span className="font-semibold">변경 요청 의견:</span> {plan.changeRequestComment}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="approvalComment">승인 의견</Label>
                <Textarea
                  id="approvalComment"
                  placeholder="승인 의견을 입력해주세요."
                  value={approvalComment}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setApprovalComment(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                취소
              </Button>
              <Button onClick={handleConfirmApproval} className="bg-green-600 hover:bg-green-700">
                승인 확정
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 이력 다이얼로그 */}
        <Dialog open={showHistoryDialog} onOpenChange={(open) => {
          setShowHistoryDialog(open)
          if (!open) {
            setHistoryPage(1) // 다이얼로그 닫을 때 페이지 초기화
          }
        }}>
          <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>판매계획 변경 이력</DialogTitle>
              <DialogDescription>판매계획의 변경 이력을 확인합니다</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
              {planHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">변경 이력이 없습니다.</div>
              ) : (
                <>
                  <div className="flex-1 overflow-auto border rounded-lg">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead className="min-w-[150px]">변경일시</TableHead>
                            <TableHead className="min-w-[100px]">변경자</TableHead>
                            <TableHead className="min-w-[100px]">이전 수량</TableHead>
                            <TableHead className="min-w-[100px]">변경 수량</TableHead>
                            <TableHead className="min-w-[100px]">이전 매출</TableHead>
                            <TableHead className="min-w-[100px]">변경 매출</TableHead>
                            <TableHead className="min-w-[120px]">변경 사유</TableHead>
                            <TableHead className="min-w-[150px]">변경 요청 의견</TableHead>
                            <TableHead className="min-w-[150px]">승인 의견</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {planHistory
                            .slice((historyPage - 1) * historyItemsPerPage, historyPage * historyItemsPerPage)
                            .map((history) => (
                              <TableRow key={history.id}>
                                <TableCell className="whitespace-nowrap">{new Date(history.createdAt).toLocaleString()}</TableCell>
                                <TableCell>{history.changedBy}</TableCell>
                                <TableCell>{history.previousQuantity.toLocaleString()}</TableCell>
                                <TableCell>{history.newQuantity.toLocaleString()}</TableCell>
                                <TableCell>{history.previousRevenue.toLocaleString()}</TableCell>
                                <TableCell>{history.newRevenue.toLocaleString()}</TableCell>
                                <TableCell>{history.changeReason || "-"}</TableCell>
                                <TableCell className="max-w-[200px] break-words">{history.changeRequestComment || "-"}</TableCell>
                                <TableCell className="max-w-[200px] break-words">{history.approvalComment || "-"}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  {/* 페이지네이션 */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      전체 {planHistory.length}건 중 {((historyPage - 1) * historyItemsPerPage) + 1}-
                      {Math.min(historyPage * historyItemsPerPage, planHistory.length)}건 표시
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                        disabled={historyPage === 1}
                      >
                        이전
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.ceil(planHistory.length / historyItemsPerPage) }, (_, i) => i + 1)
                          .filter((page) => {
                            // 현재 페이지 주변 2페이지씩만 표시
                            const totalPages = Math.ceil(planHistory.length / historyItemsPerPage)
                            if (totalPages <= 7) return true
                            return (
                              page === 1 ||
                              page === totalPages ||
                              (page >= historyPage - 1 && page <= historyPage + 1)
                            )
                          })
                          .map((page, idx, arr) => {
                            // 생략 표시 추가
                            const prevPage = arr[idx - 1]
                            const showEllipsis = prevPage && page - prevPage > 1
                            return (
                              <div key={page} className="flex items-center gap-1">
                                {showEllipsis && <span className="px-2">...</span>}
                                <Button
                                  variant={historyPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setHistoryPage(page)}
                                  className="min-w-[40px]"
                                >
                                  {page}
                                </Button>
                              </div>
                            )
                          })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage((prev) => Math.min(Math.ceil(planHistory.length / historyItemsPerPage), prev + 1))}
                        disabled={historyPage >= Math.ceil(planHistory.length / historyItemsPerPage)}
                      >
                        다음
                      </Button>
                    </div>
                  </div>
                </>
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
