import { NextResponse } from "next/server"
import { db, initializeDatabase } from "@/lib/db"

export async function GET(request: Request) {
  initializeDatabase()

  const { searchParams } = new URL(request.url)
  const shipmentId = searchParams.get("shipmentId")
  const customer = searchParams.get("customer")

  try {
    if (shipmentId) {
      const history = db.shipmentPlanHistory.getByShipmentId(shipmentId)
      return NextResponse.json({ success: true, data: history })
    } else if (customer) {
      const history = db.shipmentPlanHistory.getByCustomer(customer)
      return NextResponse.json({ success: true, data: history })
    } else {
      const history = db.shipmentPlanHistory.getAll()
      return NextResponse.json({ success: true, data: history })
    }
  } catch (error) {
    console.error("[v0] Failed to fetch shipment plan history:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch shipment plan history" }, { status: 500 })
  }
}
