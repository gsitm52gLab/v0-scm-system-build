"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, Lock, User, ArrowRight, AlertCircle } from "lucide-react"

export default function SRMLoginPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<"현대차" | "삼성SDI">("현대차")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { user } = useAuth()

  // 세방산업 영업담당자 또는 관리자만 접근 가능
  if (!user || (user.role !== "영업담당자" && user.role !== "관리자")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Alert className="max-w-md" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>이 페이지는 세방산업 영업담당자 또는 관리자만 접근할 수 있습니다.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const handleSRMLogin = async () => {
    if (!username || !password) {
      setError("SRM 로그인 정보를 모두 입력해주세요.")
      return
    }

    setLoading(true)
    setError("")

    try {
      // SRM 로그인 검증
      const response = await fetch("/api/srm/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: selectedCustomer,
          username,
          password,
          sebangUser: user.fullName, // 세방 담당자 정보
        }),
      })

      const result = await response.json()

      if (result.success) {
        // SRM 로그인 성공 - 주문 조회 페이지로 이동
        router.push(`/srm-orders?customer=${selectedCustomer}&session=${result.sessionId}`)
      } else {
        setError(result.error || "SRM 로그인에 실패했습니다.")
      }
    } catch (error) {
      setError("SRM 시스템 연결에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const srmInfo = {
    현대차: {
      url: "srm.hyundai-mock.com",
      color: "bg-blue-600",
      logo: "🚗",
      testAccount: "sebang_hyundai / srm2025!",
    },
    삼성SDI: {
      url: "srm.samsungsdi-mock.com",
      color: "bg-blue-700",
      logo: "🔋",
      testAccount: "sebang_sdi / srm2025!",
    },
  }

  const currentSRM = srmInfo[selectedCustomer]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.push("/")}>
            ← 세방산업 SCM으로 돌아가기
          </Button>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* 프로세스 안내 */}
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                고객사 SRM 시스템 접속
              </CardTitle>
              <CardDescription>세방산업 담당자가 고객사 SRM에 로그인하여 주문을 가져옵니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                    1
                  </div>
                  <span>세방 SCM 로그인</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                    2
                  </div>
                  <span className="font-semibold">고객사 SRM 로그인</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-300 text-white flex items-center justify-center font-bold">
                    3
                  </div>
                  <span>주문 가져오기</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 현재 로그인 정보 */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">세방산업 로그인 사용자</p>
                  <p className="text-lg font-semibold">
                    {user.fullName} ({user.role})
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  {user.fullName[0]}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SRM 로그인 폼 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-lg ${currentSRM.color} text-white flex items-center justify-center text-2xl`}
                >
                  {currentSRM.logo}
                </div>
                <div>
                  <CardTitle>고객사 SRM 로그인</CardTitle>
                  <CardDescription className="font-mono text-xs">{currentSRM.url}</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* 고객사 선택 */}
              <div className="space-y-2">
                <Label>고객사 SRM 시스템</Label>
                <Select value={selectedCustomer} onValueChange={(v: any) => setSelectedCustomer(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="현대차">
                      <div className="flex items-center gap-2">
                        🚗 <span>현대차 SRM</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="삼성SDI">
                      <div className="flex items-center gap-2">
                        🔋 <span>삼성SDI SRM</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* SRM 사용자명 */}
              <div className="space-y-2">
                <Label htmlFor="srm-username">SRM 사용자명</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="srm-username"
                    type="text"
                    placeholder="SRM 계정 입력"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* SRM 비밀번호 */}
              <div className="space-y-2">
                <Label htmlFor="srm-password">SRM 비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="srm-password"
                    type="password"
                    placeholder="SRM 비밀번호 입력"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSRMLogin()}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* 테스트 계정 안내 */}
              <Alert>
                <AlertDescription className="text-xs">
                  <strong>프로토타입 테스트 계정:</strong>
                  <br />
                  {currentSRM.testAccount}
                </AlertDescription>
              </Alert>

              {/* 로그인 버튼 */}
              <Button className="w-full" size="lg" onClick={handleSRMLogin} disabled={loading}>
                {loading ? (
                  "SRM 접속 중..."
                ) : (
                  <>
                    <Building2 className="w-4 h-4 mr-2" />
                    {selectedCustomer} SRM 로그인
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

