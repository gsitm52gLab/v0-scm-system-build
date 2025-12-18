import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const dispatch = db.dispatch.getAll()
    return NextResponse.json({ success: true, data: dispatch })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch dispatch" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const dispatch = await request.json()
    const created = db.dispatch.create(dispatch)

    // Update inventory
    dispatch.products.forEach((product: { product: "EV" | "SUV"; quantity: number }) => {
      const currentInventory = db.inventory.getByProduct(product.product)
      if (currentInventory) {
        db.inventory.update(product.product, currentInventory.quantity - product.quantity)
      }
    })

    return NextResponse.json({ success: true, data: created })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to create dispatch" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    const updated = db.dispatch.update(id, data)

    if (!updated) {
      return NextResponse.json({ success: false, error: "Dispatch not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update dispatch" }, { status: 500 })
  }
}
