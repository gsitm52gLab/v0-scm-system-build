"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
  Area,
  AreaChart,
} from "recharts"
import { Factory, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

type PeriodType = "year" | "month" | "week" | "day"
type ProductionLine = "광주1공장" | "광주2공장"

interface QualityData {
  date: string
  line: ProductionLine
  target: number
  input: number
  goodOutput: number
  defectOutput: number
  defectRate: number
}

interface LossData {
  date: string
  line: ProductionLine
  plannedLoss: {
    maintenance: number // 정비
    changeover: number // 교체
    setup: number // 준비
  }
  unplannedLoss: {
    stop: number // 정지
    deviation: number // 이탈
    performance: number // 성능
  }
  operationRate: number // 종합가동율 (%)
}

export default function ProductionPerformancePage() {
  const [period, setPeriod] = useState<PeriodType>("day")
  const [selectedLine, setSelectedLine] = useState<"all" | ProductionLine>("all")
  const [qualityData, setQualityData] = useState<QualityData[]>([])
  const [lossData, setLossData] = useState<LossData[]>([])

  useEffect(() => {
    generateMockData()
  }, [period, selectedLine])

  const generateMockData = () => {
    const lines: ProductionLine[] = selectedLine === "all" ? ["광주1공장", "광주2공장"] : [selectedLine]
    const periods = getPeriods(period)

    const quality: QualityData[] = []
    const loss: LossData[] = []

    periods.forEach((date) => {
      lines.forEach((line) => {
        const target = line === "광주1공장" ? 1000 : 800
        const input = Math.floor(target * (0.95 + Math.random() * 0.1))
        const defectOutput = Math.floor(input * (0.02 + Math.random() * 0.03))
        const goodOutput = input - defectOutput

        quality.push({
          date,
          line,
          target,
          input,
          goodOutput,
          defectRate: (defectOutput / input) * 100,
          defectOutput,
        })

        const plannedLossTotal = 5 + Math.random() * 10 // 5-15%
        const unplannedLossTotal = 5 + Math.random() * 15 // 5-20%
        const operationRate = 100 - plannedLossTotal - unplannedLossTotal

        loss.push({
          date,
          line,
          plannedLoss: {
            maintenance: plannedLossTotal * 0.4,
            changeover: plannedLossTotal * 0.35,
            setup: plannedLossTotal * 0.25,
          },
          unplannedLoss: {
            stop: unplannedLossTotal * 0.4,
            deviation: unplannedLossTotal * 0.35,
            performance: unplannedLossTotal * 0.25,
          },
          operationRate: Math.round(operationRate * 10) / 10,
        })
      })
    })

    setQualityData(quality)
    setLossData(loss)
  }

  const getPeriods = (type: PeriodType): string[] => {
    const now = new Date()
    switch (type) {
      case "year":
        return Array.from({ length: 12 }, (_, i) => `${now.getFullYear()}년 ${i + 1}월`)
      case "month":
        return Array.from({ length: 4 }, (_, i) => `${i + 1}주차`)
      case "week":
        return Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now)
          date.setDate(date.getDate() - (6 - i))
          return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
        })
      case "day":
        return Array.from({ length: 24 }, (_, i) => `${i}시`)
      default:
        return []
    }
  }

  // Calculate overall statistics
  const stats = {
    totalInput: qualityData.reduce((sum, d) => sum + d.input, 0),
    totalGood: qualityData.reduce((sum, d) => sum + d.goodOutput, 0),
    totalDefect: qualityData.reduce((sum, d) => sum + d.defectOutput, 0),
    avgDefectRate:
      qualityData.length > 0 ? qualityData.reduce((sum, d) => sum + d.defectRate, 0) / qualityData.length : 0,
    avgOperationRate: lossData.length > 0 ? lossData.reduce((sum, d) => sum + d.operationRate, 0) / lossData.length : 0,
    totalPlannedLoss:
      lossData.length > 0
        ? lossData.reduce(
            (sum, d) => sum + d.plannedLoss.maintenance + d.plannedLoss.changeover + d.plannedLoss.setup,
            0,
          ) / lossData.length
        : 0,
    totalUnplannedLoss:
      lossData.length > 0
        ? lossData.reduce(
            (sum, d) => sum + d.unplannedLoss.stop + d.unplannedLoss.deviation + d.unplannedLoss.performance,
            0,
          ) / lossData.length
        : 0,
  }

  // Chart data aggregation
  const chartData = qualityData.map((q) => {
    const loss = lossData.find((l) => l.date === q.date && l.line === q.line)
    return {
      period: q.date,
      line: q.line,
      target: q.target,
      input: q.input,
      good: q.goodOutput,
      defect: q.defectOutput,
      defectRate: q.defectRate,
      operationRate: loss?.operationRate || 0,
    }
  })

  const lossBreakdownData = lossData.map((l) => ({
    period: l.date,
    line: l.line,
    정비: l.plannedLoss.maintenance,
    교체: l.plannedLoss.changeover,
    준비: l.plannedLoss.setup,
    정지: l.unplannedLoss.stop,
    이탈: l.unplannedLoss.deviation,
    성능: l.unplannedLoss.performance,
  }))

  const COLORS = {
    factory1: "#004B91",
    factory2: "#0066CC",
    good: "#10b981",
    defect: "#ef4444",
    planned: "#f59e0b",
    unplanned: "#dc2626",
  }

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">생산 실적 대시보드</h1>
          <p className="text-muted-foreground mt-1">양품/불량 현황과 라인 가동율을 실시간으로 모니터링합니다</p>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="year">연간</SelectItem>
              <SelectItem value="month">월간</SelectItem>
              <SelectItem value="week">주간</SelectItem>
              <SelectItem value="day">일간</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedLine} onValueChange={(v) => setSelectedLine(v as "all" | ProductionLine)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 공장</SelectItem>
              <SelectItem value="광주1공장">광주1공장</SelectItem>
              <SelectItem value="광주2공장">광주2공장</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6 md:grid-cols-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>총 투입</CardDescription>
              <CardTitle className="text-3xl">{stats.totalInput.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">생산라인 투입량</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>양품 생산</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.totalGood.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                {((stats.totalGood / stats.totalInput) * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>불량 발생</CardDescription>
              <CardTitle className="text-3xl text-red-600">{stats.totalDefect.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertTriangle className="w-4 h-4" />
                {stats.avgDefectRate.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>종합가동율</CardDescription>
              <CardTitle className="text-3xl">{stats.avgOperationRate.toFixed(1)}%</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={stats.avgOperationRate} className="h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>계획 Loss</CardDescription>
              <CardTitle className="text-3xl text-orange-600">{stats.totalPlannedLoss.toFixed(1)}%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">정비/교체/준비</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>일반 Loss</CardDescription>
              <CardTitle className="text-3xl text-red-600">{stats.totalUnplannedLoss.toFixed(1)}%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">정지/이탈/성능</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>생산 투입 vs 산출</CardTitle>
              <CardDescription>목표 대비 투입 및 양품/불량 현황</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="target" fill="#94a3b8" name="목표" />
                  <Bar dataKey="input" fill="#3b82f6" name="투입" />
                  <Bar dataKey="good" fill={COLORS.good} name="양품" />
                  <Bar dataKey="defect" fill={COLORS.defect} name="불량" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>종합가동율 추이</CardTitle>
              <CardDescription>시간별 라인 가동율 변화</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="operationRate"
                    stroke={COLORS.factory1}
                    strokeWidth={2}
                    name="가동율 (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>불량률 추이</CardTitle>
              <CardDescription>투입 대비 불량 발생 비율</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="defectRate"
                    stroke={COLORS.defect}
                    fill={COLORS.defect}
                    fillOpacity={0.3}
                    name="불량률 (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Loss 분석</CardTitle>
              <CardDescription>계획/일반 Loss 상세 사유별 분석</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={lossBreakdownData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="period" type="category" width={80} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="정비" stackId="a" fill="#fbbf24" name="정비 (계획)" />
                  <Bar dataKey="교체" stackId="a" fill="#f59e0b" name="교체 (계획)" />
                  <Bar dataKey="준비" stackId="a" fill="#d97706" name="준비 (계획)" />
                  <Bar dataKey="정지" stackId="a" fill="#ef4444" name="정지 (일반)" />
                  <Bar dataKey="이탈" stackId="a" fill="#dc2626" name="이탈 (일반)" />
                  <Bar dataKey="성능" stackId="a" fill="#b91c1c" name="성능 (일반)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>상세 생산 실적</CardTitle>
            <CardDescription>라인별 생산 실적 상세 내역</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="quality">
              <TabsList>
                <TabsTrigger value="quality">품질 실적</TabsTrigger>
                <TabsTrigger value="loss">Loss 상세</TabsTrigger>
              </TabsList>

              <TabsContent value="quality" className="mt-4">
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>기간</TableHead>
                        <TableHead>생산라인</TableHead>
                        <TableHead>목표</TableHead>
                        <TableHead>투입</TableHead>
                        <TableHead>양품</TableHead>
                        <TableHead>불량</TableHead>
                        <TableHead>불량률</TableHead>
                        <TableHead>달성률</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {qualityData.map((data, idx) => {
                        const achievementRate = (data.goodOutput / data.target) * 100
                        return (
                          <TableRow key={idx}>
                            <TableCell>{data.date}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                <Factory className="w-3 h-3 mr-1" />
                                {data.line}
                              </Badge>
                            </TableCell>
                            <TableCell>{data.target.toLocaleString()}</TableCell>
                            <TableCell>{data.input.toLocaleString()}</TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {data.goodOutput.toLocaleString()}
                            </TableCell>
                            <TableCell className="font-semibold text-red-600">
                              {data.defectOutput.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={data.defectRate < 3 ? "secondary" : "destructive"}>
                                {data.defectRate.toFixed(2)}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={achievementRate} className="h-2 w-20" />
                                <span className="text-sm">{achievementRate.toFixed(0)}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="loss" className="mt-4">
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>기간</TableHead>
                        <TableHead>생산라인</TableHead>
                        <TableHead>가동율</TableHead>
                        <TableHead colSpan={3} className="text-center bg-orange-50">
                          계획 Loss
                        </TableHead>
                        <TableHead colSpan={3} className="text-center bg-red-50">
                          일반 Loss
                        </TableHead>
                      </TableRow>
                      <TableRow>
                        <TableHead></TableHead>
                        <TableHead></TableHead>
                        <TableHead></TableHead>
                        <TableHead className="bg-orange-50">정비</TableHead>
                        <TableHead className="bg-orange-50">교체</TableHead>
                        <TableHead className="bg-orange-50">준비</TableHead>
                        <TableHead className="bg-red-50">정지</TableHead>
                        <TableHead className="bg-red-50">이탈</TableHead>
                        <TableHead className="bg-red-50">성능</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lossData.map((data, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{data.date}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              <Factory className="w-3 h-3 mr-1" />
                              {data.line}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={data.operationRate >= 80 ? "bg-green-600" : "bg-orange-600"}>
                              {data.operationRate.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="bg-orange-50/50">{data.plannedLoss.maintenance.toFixed(1)}%</TableCell>
                          <TableCell className="bg-orange-50/50">{data.plannedLoss.changeover.toFixed(1)}%</TableCell>
                          <TableCell className="bg-orange-50/50">{data.plannedLoss.setup.toFixed(1)}%</TableCell>
                          <TableCell className="bg-red-50/50">{data.unplannedLoss.stop.toFixed(1)}%</TableCell>
                          <TableCell className="bg-red-50/50">{data.unplannedLoss.deviation.toFixed(1)}%</TableCell>
                          <TableCell className="bg-red-50/50">{data.unplannedLoss.performance.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
