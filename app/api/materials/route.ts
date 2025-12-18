import { NextResponse } from "next/server"
import { db, initializeDatabase } from "@/lib/db"

// Initialize database
initializeDatabase()

export async function GET() {
  try {
    const materials = db.materials.getAll()
    return NextResponse.json({ success: true, data: materials })
  } catch (error) {
    console.error("[v0] Material API error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch materials" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { code, ...data } = body

    const updated = db.materials.update(code, data)
    if (!updated) {
      return NextResponse.json({ success: false, error: "Material not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("[v0] Material update error:", error)
    return NextResponse.json({ success: false, error: "Failed to update material" }, { status: 500 })
  }
}
