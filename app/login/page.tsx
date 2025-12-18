"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { testAccounts, type User } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, LogIn } from "lucide-react"

export default function LoginPage() {
  const [selectedAccount, setSelectedAccount] = useState<User | null>(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isTestAccountsOpen, setIsTestAccountsOpen] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleTestAccountSelect = (accountId: string) => {
    const account = testAccounts.find((acc) => acc.id === accountId)
    if (account) {
      setSelectedAccount(account)
      setUsername(account.username)
      setPassword(account.password)
    }
  }

  const handleLogin = () => {
    // Verify credentials
    const account = testAccounts.find((acc) => acc.username === username && acc.password === password)

    if (account) {
      login(account)
      router.push("/")
    } else {
      alert("로그인 정보가 올바르지 않습니다.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-3xl font-bold text-primary-foreground">S</span>
          </div>
          <CardTitle className="text-2xl">세방산업 SCM 시스템</CardTitle>
          <CardDescription>통합 공급망 관리 시스템</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Test Accounts Selector */}
          <Collapsible open={isTestAccountsOpen} onOpenChange={setIsTestAccountsOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between w-full p-3 rounded-md border border-border bg-accent/50 hover:bg-accent transition-colors">
                <span className="text-sm font-medium">테스트 계정 선택</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isTestAccountsOpen ? "rotate-180" : ""}`} />
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-3">
              <div className="space-y-2">
                <Label>테스트 계정</Label>
                <Select onValueChange={handleTestAccountSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="계정을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {testAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{account.fullName}</span>
                          <span className="text-xs text-muted-foreground">
                            ({account.role} - {account.company})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedAccount && (
                  <div className="mt-3 p-3 rounded-md bg-primary/10 border border-primary/20">
                    <div className="text-xs space-y-1">
                      <div>
                        <span className="font-medium">이름:</span> {selectedAccount.fullName}
                      </div>
                      <div>
                        <span className="font-medium">역할:</span> {selectedAccount.role}
                      </div>
                      <div>
                        <span className="font-medium">회사:</span> {selectedAccount.company}
                      </div>
                      <div className="text-muted-foreground mt-2">로그인 정보가 자동으로 입력되었습니다.</div>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Login Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">사용자명</Label>
              <Input
                id="username"
                type="text"
                placeholder="사용자명을 입력하세요"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>

            <Button className="w-full" size="lg" onClick={handleLogin}>
              <LogIn className="w-4 h-4 mr-2" />
              로그인
            </Button>
          </div>

          {/* Info */}
          <div className="text-xs text-center text-muted-foreground space-y-1">
            <p>테스트 계정을 선택하면 자동으로 로그인 정보가 입력됩니다.</p>
            <p className="font-medium">모든 테스트 계정 비밀번호: test123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
