import { NextResponse } from "next/server"
import { db, initializeDatabase } from "@/lib/db"

export async function GET(request: Request) {
  initializeDatabase()

  const { searchParams } = new URL(request.url)
  const yearMonth = searchParams.get("yearMonth")
  const year = searchParams.get("year")
  const customer = searchParams.get("customer")
  const status = searchParams.get("status")

  try {
    let plans
    if (yearMonth) {
      plans = db.salesPlans.getByYearMonth(yearMonth)
    } else if (year) {
      plans = db.salesPlans.getByYear(parseInt(year))
    } else {
      plans = db.salesPlans.getAll()
    }

    // 필터링
    if (customer) {
      plans = plans.filter((p) => p.customer === customer)
    }
    if (status) {
      plans = plans.filter((p) => p.status === status)
    }

    return NextResponse.json({ success: true, data: plans })
  } catch (error) {
    console.error("[v0] Failed to fetch sales plans:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch sales plans" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  initializeDatabase()

  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 })
    }

    const updated = db.salesPlans.update(id, data)
    if (!updated) {
      return NextResponse.json({ success: false, error: "Sales plan not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("[v0] Failed to update sales plan:", error)
    return NextResponse.json({ success: false, error: "Failed to update sales plan" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  initializeDatabase()

  try {
    const body = await request.json()
    
    // 단일 계획 생성 또는 bulk 업데이트
    if (Array.isArray(body)) {
      const updated = db.salesPlans.bulkUpdate(body)
      return NextResponse.json({ success: true, data: updated })
    } else {
      const plan = db.salesPlans.create({
        id: body.id || `SP-${body.yearMonth}-${body.customer}-${body.productCode}`,
        yearMonth: body.yearMonth,
        customer: body.customer,
        productCode: body.productCode,
        product: body.product,
        category: body.category,
        plannedQuantity: body.plannedQuantity,
        plannedRevenue: body.plannedRevenue,
        status: body.status || "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      return NextResponse.json({ success: true, data: plan })
    }
  } catch (error) {
    console.error("[v0] Failed to create/update sales plan:", error)
    return NextResponse.json({ success: false, error: "Failed to create/update sales plan" }, { status: 500 })
  }
}
