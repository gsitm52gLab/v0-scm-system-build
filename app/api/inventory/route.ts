import { NextResponse } from "next/server"
import { db, initializeDatabase } from "@/lib/db"

export async function GET() {
  initializeDatabase()

  try {
    const inventory = db.inventory.getAll()
    console.log("[v0] Fetched inventory:", inventory.length)
    return NextResponse.json({ success: true, data: inventory })
  } catch (error) {
    console.error("[v0] Failed to fetch inventory:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch inventory" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  initializeDatabase()

  try {
    const body = await request.json()
    const { product, quantity } = body

    const updated = db.inventory.update(product, quantity)

    if (!updated) {
      return NextResponse.json({ success: false, error: "Inventory not found" }, { status: 404 })
    }

    console.log("[v0] Updated inventory:", product, quantity)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("[v0] Failed to update inventory:", error)
    return NextResponse.json({ success: false, error: "Failed to update inventory" }, { status: 500 })
  }
}
