import { NextResponse } from "next/server"
import { db, initializeDatabase } from "@/lib/db"

export async function GET(request: Request) {
  initializeDatabase()

  const { searchParams } = new URL(request.url)
  const month = searchParams.get("month")

  try {
    const orders = month ? db.orders.getByMonth(month) : db.orders.getAll()
    console.log("[v0] Fetched orders:", orders.length)
    return NextResponse.json({ success: true, data: orders })
  } catch (error) {
    console.error("[v0] Failed to fetch orders:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  initializeDatabase()

  try {
    const body = await request.json()
    const { id, ...data } = body

    const updatedOrder = db.orders.update(id, data)

    if (!updatedOrder) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
    }

    console.log("[v0] Updated order:", id)
    return NextResponse.json({ success: true, data: updatedOrder })
  } catch (error) {
    console.error("[v0] Failed to update order:", error)
    return NextResponse.json({ success: false, error: "Failed to update order" }, { status: 500 })
  }
}
