import { NextResponse } from "next/server"
import { initializeDatabase, db } from "@/lib/db"

export async function GET() {
  try {
    initializeDatabase()

    console.log("[v0] Calculating material requirements...")

    const productions = db.productions.getAll().filter((p) => p.status === "planned" || p.status === "in_progress")
    const materials = db.materials.getAll()
    const orders = db.orders.getAll()
    const bom = db.bom.getAll()

    console.log("[v0] Productions for MRP:", productions.length)
    console.log("[v0] Materials available:", materials.length)

    // Calculate total requirements
    const requirements = materials.map((material) => {
      let totalRequired = 0

      // Calculate from all planned and in-progress productions
      productions.forEach((production) => {
        const order = orders.find((o) => o.id === production.orderId)
        if (!order) return

        const productBom = bom.find((b) => b.productCode === order.product)
        if (!productBom) return

        const materialReq = productBom.materials.find((m) => m.materialCode === material.code)
        if (materialReq) {
          totalRequired += materialReq.quantity * production.plannedQuantity
        }
      })

      const shortage = Math.max(0, totalRequired - material.currentStock)

      return {
        material,
        required: totalRequired,
        available: material.currentStock,
        shortage,
        orderNeeded: shortage > 0,
      }
    })

    console.log("[v0] Material requirements calculated:", requirements.length)

    return NextResponse.json({
      success: true,
      data: requirements,
    })
  } catch (error) {
    console.error("[v0] Material requirements error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate material requirements",
      },
      { status: 500 },
    )
  }
}
