import { NextResponse } from "next/server"
import { validateSRMLogin } from "@/lib/mock-srm"

export async function POST(request: Request) {
  try {
    const { customer, username, password, sebangUser } = await request.json()

    // 모의 SRM 로그인 검증
    const result = validateSRMLogin(customer, username, password)

    if (result.success) {
      // 세션 ID 생성 (프로토타입용)
      const sessionId = `SRM-SESSION-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      console.log(`[SRM Login] ${customer} - ${result.user.name} (세방담당자: ${sebangUser})`)

      return NextResponse.json({
        success: true,
        sessionId,
        user: result.user,
        message: `${customer} SRM 로그인 성공`,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error("[SRM Login Error]", error)
    return NextResponse.json({ success: false, error: "SRM 로그인 처리 중 오류 발생" }, { status: 500 })
  }
}

