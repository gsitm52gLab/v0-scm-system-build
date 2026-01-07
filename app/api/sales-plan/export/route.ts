import { NextResponse } from "next/server"
import { db, initializeDatabase } from "@/lib/db"

export async function GET(request: Request) {
  initializeDatabase()

  const { searchParams } = new URL(request.url)
  const year = searchParams.get("year")

  try {
    const plans = year ? db.salesPlans.getByYear(parseInt(year)) : db.salesPlans.getAll()

    // CSV 형식으로 변환
    const csv = [
      ["연월", "업체", "제품코드", "제품명", "카테고리", "계획수량", "계획매출(만원)", "상태"].join(","),
      ...plans.map((plan) =>
        [
          plan.yearMonth,
          plan.customer,
          plan.productCode,
          plan.product,
          plan.category,
          plan.plannedQuantity,
          plan.plannedRevenue,
          plan.status,
        ].join(","),
      ),
    ].join("\n")

    return new NextResponse("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8;",
        "Content-Disposition": `attachment; filename="sales_plan_${year || "all"}.csv"`,
      },
    })
  } catch (error) {
    console.error("[v0] Failed to export sales plan:", error)
    return NextResponse.json({ success: false, error: "Failed to export sales plan" }, { status: 500 })
  }
}
