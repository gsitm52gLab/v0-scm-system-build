import { NextResponse } from "next/server"
import { db, initializeDatabase } from "@/lib/db"

export async function GET() {
  initializeDatabase()

  try {
    const productions = db.productions.getAll()
    console.log("[v0] Fetched productions:", productions.length)
    return NextResponse.json({ success: true, data: productions })
  } catch (error) {
    console.error("[v0] Failed to fetch productions:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch productions" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  initializeDatabase()

  try {
    const production = await request.json()
    const created = db.productions.create(production)
    console.log("[v0] Created production:", created.id)
    return NextResponse.json({ success: true, data: created })
  } catch (error) {
    console.error("[v0] Failed to create production:", error)
    return NextResponse.json({ success: false, error: "Failed to create production" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  initializeDatabase()

  try {
    const body = await request.json()
    const { id, ...data } = body

    const updated = db.productions.update(id, data)

    if (!updated) {
      return NextResponse.json({ success: false, error: "Production not found" }, { status: 404 })
    }

    console.log("[v0] Updated production:", id)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("[v0] Failed to update production:", error)
    return NextResponse.json({ success: false, error: "Failed to update production" }, { status: 500 })
  }
}
