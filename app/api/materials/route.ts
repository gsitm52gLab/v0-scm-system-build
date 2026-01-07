import { NextResponse } from "next/server"
import { initializeDatabase, db } from "@/lib/db"

export async function GET() {
  initializeDatabase()

  try {
    const materials = db.materials.getAll()
    console.log("[v0] Fetched materials:", materials.length)
    return NextResponse.json({ success: true, data: materials })
  } catch (error) {
    console.error("[v0] Failed to fetch materials:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch materials" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  initializeDatabase()

  try {
    const body = await request.json()
    const { code, currentStock } = body

    if (!code || currentStock === undefined) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const updated = db.materials.update(code, { currentStock })

    if (!updated) {
      return NextResponse.json({ success: false, error: "Material not found" }, { status: 404 })
    }

    console.log("[v0] Updated material:", code, currentStock)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("[v0] Failed to update material:", error)
    return NextResponse.json({ success: false, error: "Failed to update material" }, { status: 500 })
  }
}
