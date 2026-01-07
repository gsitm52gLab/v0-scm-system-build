import { NextResponse } from "next/server"
import { db, initializeDatabase } from "@/lib/db"

export async function GET(request: Request) {
  initializeDatabase()

  const { searchParams } = new URL(request.url)
  const year = searchParams.get("year")

  try {
    if (year) {
      const plan = db.businessPlans.getByYear(parseInt(year))
      return NextResponse.json({ success: true, data: plan || null })
    } else {
      const plans = db.businessPlans.getAll()
      return NextResponse.json({ success: true, data: plans })
    }
  } catch (error) {
    console.error("[v0] Failed to fetch business plans:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch business plans" }, { status: 500 })
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

    const updated = db.businessPlans.update(id, data)
    if (!updated) {
      return NextResponse.json({ success: false, error: "Business plan not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("[v0] Failed to update business plan:", error)
    return NextResponse.json({ success: false, error: "Failed to update business plan" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  initializeDatabase()

  try {
    const body = await request.json()
    const plan = db.businessPlans.create({
      id: `BP-${body.year}`,
      year: body.year,
      totalTarget: body.totalTarget,
      totalRevenue: body.totalRevenue,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, data: plan })
  } catch (error) {
    console.error("[v0] Failed to create business plan:", error)
    return NextResponse.json({ success: false, error: "Failed to create business plan" }, { status: 500 })
  }
}
