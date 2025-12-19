import { NextResponse } from "next/server"
import { fetchMockSRMOrders } from "@/lib/mock-srm"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const customer = searchParams.get("customer") as "현대차" | "삼성SDI"
    const month = searchParams.get("month") || "2025-12"
    const sessionId = searchParams.get("session")

    // 세션 검증 (프로토타입에서는 단순 체크)
    if (!sessionId || !sessionId.startsWith("SRM-SESSION-")) {
      return NextResponse.json({ success: false, error: "유효하지 않은 SRM 세션입니다." }, { status: 401 })
    }

    // 모의 SRM 주문 조회
    const orders = fetchMockSRMOrders(customer, month)

    console.log(`[SRM Orders] ${customer} - ${month}: ${orders.length}건 조회`)

    return NextResponse.json({
      success: true,
      data: orders,
      customer,
      month,
      count: orders.length,
    })
  } catch (error) {
    console.error("[SRM Orders Error]", error)
    return NextResponse.json({ success: false, error: "SRM 주문 조회 실패" }, { status: 500 })
  }
}

