import { NextResponse } from "next/server"
import { fetchMockSRMOrders, transformSRMToOrder } from "@/lib/mock-srm"
import { db } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { customer, orderNumbers, sebangUser, sessionId } = await request.json()

    // 세션 검증
    if (!sessionId || !sessionId.startsWith("SRM-SESSION-")) {
      return NextResponse.json({ success: false, error: "유효하지 않은 SRM 세션입니다." }, { status: 401 })
    }

    // SRM 주문 가져오기
    const month = orderNumbers[0].split("-")[2].substring(0, 6) // YYYYMM 추출
    const yearMonth = `${month.substring(0, 4)}-${month.substring(4, 6)}`
    const allSRMOrders = fetchMockSRMOrders(customer, yearMonth)

    // 선택된 주문만 필터링
    const selectedSRMOrders = allSRMOrders.filter((order) => orderNumbers.includes(order.srmOrderNumber))

    // 세방 Order로 변환 및 저장
    const syncedOrders = selectedSRMOrders.map((srmOrder) => {
      const order = transformSRMToOrder(srmOrder, customer, sebangUser)
      return db.orders.create(order)
    })

    // 동기화 이력 저장 (프로토타입에서는 로그만)
    console.log(`[SRM Sync] ${customer} - ${syncedOrders.length}건 동기화 완료 by ${sebangUser}`)

    return NextResponse.json({
      success: true,
      syncedCount: syncedOrders.length,
      orders: syncedOrders,
      message: `${customer} SRM에서 ${syncedOrders.length}건의 주문을 가져왔습니다.`,
    })
  } catch (error) {
    console.error("[SRM Sync Error]", error)
    return NextResponse.json({ success: false, error: "주문 동기화 실패" }, { status: 500 })
  }
}

