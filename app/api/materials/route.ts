import { NextResponse } from "next/server"
import { initializeDatabase, db } from "@/lib/db"

export async function GET() {
  initializeDatabase()
  const materials = db.materials.getAll()
  return NextResponse.json(materials)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { code, currentStock } = body

  if (!code || currentStock === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const updated = db.materials.update(code, { currentStock })

  if (!updated) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 })
  }

  return NextResponse.json(updated)
}
