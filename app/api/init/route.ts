import { NextResponse } from "next/server"
import { initializeDatabase } from "@/lib/db"

export async function GET() {
  try {
    const data = initializeDatabase()

    return NextResponse.json({
      success: true,
      message: "Database initialized successfully",
      stats: {
        orders: data.orders.length,
        productions: data.productions.length,
        materials: data.materials.length,
        inventory: data.inventory.length,
        dispatch: data.dispatch.length,
      },
    })
  } catch (error) {
    console.error("[v0] Database initialization error:", error)
    return NextResponse.json({ success: false, error: "Failed to initialize database" }, { status: 500 })
  }
}
