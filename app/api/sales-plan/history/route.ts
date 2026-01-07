import { NextResponse } from "next/server"
import { db, initializeDatabase } from "@/lib/db"

export async function GET(request: Request) {
  initializeDatabase()

  const { searchParams } = new URL(request.url)
  const salesPlanId = searchParams.get("salesPlanId")
  const yearMonth = searchParams.get("yearMonth")

  try {
    if (salesPlanId) {
      const history = db.salesPlanHistory.getBySalesPlanId(salesPlanId)
      return NextResponse.json({ success: true, data: history })
    } else if (yearMonth) {
      const history = db.salesPlanHistory.getByYearMonth(yearMonth)
      return NextResponse.json({ success: true, data: history })
    } else {
      const history = db.salesPlanHistory.getAll()
      return NextResponse.json({ success: true, data: history })
    }
  } catch (error) {
    console.error("[v0] Failed to fetch sales plan history:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch sales plan history" }, { status: 500 })
  }
}
