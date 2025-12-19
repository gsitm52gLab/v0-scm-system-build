import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import type { PurchaseOrder } from "@/lib/db"

export async function GET() {
  try {
    const purchaseOrders = db.purchaseOrders.getAll()
    return NextResponse.json({ success: true, data: purchaseOrders })
  } catch (error) {
    console.error("[v0] Failed to fetch purchase orders:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch purchase orders" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const newOrder: PurchaseOrder = {
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const created = db.purchaseOrders.create(newOrder)
    return NextResponse.json({ success: true, data: created })
  } catch (error) {
    console.error("[v0] Failed to create purchase order:", error)
    return NextResponse.json({ success: false, error: "Failed to create purchase order" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    const updated = db.purchaseOrders.update(id, data)
    if (!updated) {
      return NextResponse.json({ success: false, error: "Purchase order not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("[v0] Failed to update purchase order:", error)
    return NextResponse.json({ success: false, error: "Failed to update purchase order" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ success: false, error: "Purchase order ID is required" }, { status: 400 })
    }
    const deleted = db.purchaseOrders.delete(id)
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Purchase order not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to delete purchase order:", error)
    return NextResponse.json({ success: false, error: "Failed to delete purchase order" }, { status: 500 })
  }
}

