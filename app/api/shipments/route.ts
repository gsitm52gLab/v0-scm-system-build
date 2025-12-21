import { NextResponse } from "next/server"
import { db, initializeDatabase } from "@/lib/db"

export async function GET(request: Request) {
  initializeDatabase()

  const { searchParams } = new URL(request.url)
  const month = searchParams.get("month")
  const dispatchId = searchParams.get("dispatchId")

  try {
    let shipments = db.shipments.getAll()

    if (month) {
      shipments = shipments.filter((s) => s.shipmentDate.startsWith(month))
    }

    if (dispatchId) {
      shipments = db.shipments.getByDispatchId(dispatchId)
    }

    console.log("[v0] Fetched shipments:", shipments.length)
    return NextResponse.json({ success: true, data: shipments })
  } catch (error) {
    console.error("[v0] Failed to fetch shipments:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch shipments" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  initializeDatabase()

  try {
    const body = await request.json()
    const shipment = db.shipments.create(body)

    console.log("[v0] Created shipment:", shipment.id)
    return NextResponse.json({ success: true, data: shipment })
  } catch (error) {
    console.error("[v0] Failed to create shipment:", error)
    return NextResponse.json({ success: false, error: "Failed to create shipment" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  initializeDatabase()

  try {
    const body = await request.json()
    const { id, ...data } = body

    const updatedShipment = db.shipments.update(id, data)

    if (!updatedShipment) {
      return NextResponse.json({ success: false, error: "Shipment not found" }, { status: 404 })
    }

    console.log("[v0] Updated shipment:", id)
    return NextResponse.json({ success: true, data: updatedShipment })
  } catch (error) {
    console.error("[v0] Failed to update shipment:", error)
    return NextResponse.json({ success: false, error: "Failed to update shipment" }, { status: 500 })
  }
}
