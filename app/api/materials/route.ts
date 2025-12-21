import { NextResponse } from "next/server"
import { initializeDatabase, db } from "@/lib/db"

export async function GET() {
  initializeDatabase()

  try {
    const materials = db.materials.getAll()
    console.log("[v0] Fetched materials:", materials.length)
    return NextResponse.json(materials)
  } catch (error) {
    console.error("[v0] Failed to fetch materials:", error)
    return NextResponse.json({ error: "Failed to fetch materials" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  initializeDatabase()

  const body = await request.json()
  const { code, currentStock } = body

  if (!code || currentStock === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const updated = db.materials.update(code, { currentStock })

  if (!updated) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 })
  }

  console.log("[v0] Updated material:", code, currentStock)
  return NextResponse.json(updated)
}
