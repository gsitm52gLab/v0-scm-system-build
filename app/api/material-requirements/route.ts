import { NextResponse } from "next/server"
import { db, initializeDatabase, type MaterialRequirement } from "@/lib/db"

initializeDatabase()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const productionId = searchParams.get("productionId")

    if (productionId) {
      const requirements = db.materialRequirements.getByProductionId(productionId)
      return NextResponse.json({ success: true, data: requirements })
    }

    const allRequirements = db.materialRequirements.getAll()
    return NextResponse.json({ success: true, data: allRequirements })
  } catch (error) {
    console.error("[v0] Material requirements API error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch material requirements" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const requirement = db.materialRequirements.create(body as MaterialRequirement)
    return NextResponse.json({ success: true, data: requirement })
  } catch (error) {
    console.error("[v0] Material requirement creation error:", error)
    return NextResponse.json({ success: false, error: "Failed to create material requirement" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    const updated = db.materialRequirements.update(id, data)
    if (!updated) {
      return NextResponse.json({ success: false, error: "Material requirement not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("[v0] Material requirement update error:", error)
    return NextResponse.json({ success: false, error: "Failed to update material requirement" }, { status: 500 })
  }
}
