import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const inventory = db.inventory.getAll()
    return NextResponse.json({ success: true, data: inventory })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch inventory" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { product, quantity } = body

    const updated = db.inventory.update(product, quantity)

    if (!updated) {
      return NextResponse.json({ success: false, error: "Inventory not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update inventory" }, { status: 500 })
  }
}
