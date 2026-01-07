import { NextResponse } from "next/server"
import { db, initializeDatabase } from "@/lib/db"

export async function GET() {
  initializeDatabase()

  try {
    const dispatch = db.dispatch.getAll()
    console.log("[v0] Fetched dispatch:", dispatch.length)
    return NextResponse.json({ success: true, data: dispatch })
  } catch (error) {
    console.error("[v0] Failed to fetch dispatch:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch dispatch" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  initializeDatabase()

  try {
    const dispatch = await request.json()
    const created = db.dispatch.create(dispatch)

    // Update inventory
    dispatch.products.forEach((product: { product: string; quantity: number }) => {
      const currentInventory = db.inventory.getByProduct(product.product)
      if (currentInventory) {
        db.inventory.update(product.product, currentInventory.quantity - product.quantity)
      }
    })

    console.log("[v0] Created dispatch:", created.id)
    return NextResponse.json({ success: true, data: created })
  } catch (error) {
    console.error("[v0] Failed to create dispatch:", error)
    return NextResponse.json({ success: false, error: "Failed to create dispatch" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  initializeDatabase()

  try {
    const body = await request.json()
    const { id, ...data } = body

    const updated = db.dispatch.update(id, data)

    if (!updated) {
      return NextResponse.json({ success: false, error: "Dispatch not found" }, { status: 404 })
    }

    console.log("[v0] Updated dispatch:", id)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("[v0] Failed to update dispatch:", error)
    return NextResponse.json({ success: false, error: "Failed to update dispatch" }, { status: 500 })
  }
}
