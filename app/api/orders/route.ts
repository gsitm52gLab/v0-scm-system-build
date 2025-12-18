import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get("month")

  try {
    const orders = month ? db.orders.getByMonth(month) : db.orders.getAll()
    return NextResponse.json({ success: true, data: orders })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    const updatedOrder = db.orders.update(id, data)

    if (!updatedOrder) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updatedOrder })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update order" }, { status: 500 })
  }
}
