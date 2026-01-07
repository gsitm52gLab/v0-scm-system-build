import { NextResponse } from "next/server"
import { initializeDatabase, db } from "@/lib/db"

// Calculate Material Requirements Planning
export async function POST(request: Request) {
  initializeDatabase()
  const body = await request.json()
  const { productionId } = body

  if (!productionId) {
    return NextResponse.json({ error: "Production ID required" }, { status: 400 })
  }

  const production = db.productions.getById(productionId)
  if (!production) {
    return NextResponse.json({ error: "Production not found" }, { status: 404 })
  }

  const order = db.orders.getById(production.orderId)
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  const bom = db.bom.getByProduct(order.product)
  if (!bom) {
    return NextResponse.json({ error: "BOM not found for product" }, { status: 404 })
  }

  // Calculate required materials
  const requirements = bom.materials.map((bomItem) => {
    const material = db.materials.getByCode(bomItem.materialCode)
    const requiredQuantity = bomItem.quantity * production.plannedQuantity
    const currentStock = material?.currentStock || 0
    const shortage = Math.max(0, requiredQuantity - currentStock)
    const isShortage = shortage > 0

    return {
      materialCode: bomItem.materialCode,
      materialName: material?.name || "",
      unit: material?.unit || "",
      requiredPerUnit: bomItem.quantity,
      totalRequired: requiredQuantity,
      currentStock,
      shortage,
      isShortage,
      supplier: material?.supplier || "",
      leadTimeDays: material?.leadTimeDays || 0,
      unitPrice: material?.unitPrice || 0,
      totalCost: shortage * (material?.unitPrice || 0),
    }
  })

  const hasShortage = requirements.some((r) => r.isShortage)
  const maxLeadTime = Math.max(...requirements.filter((r) => r.isShortage).map((r) => r.leadTimeDays), 0)

  // Update production status
  db.productions.update(productionId, { materialShortage: hasShortage })

  return NextResponse.json({
    productionId,
    product: order.product,
    plannedQuantity: production.plannedQuantity,
    requirements,
    hasShortage,
    maxLeadTime,
    estimatedProductionStart: hasShortage
      ? new Date(Date.now() + maxLeadTime * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      : production.estimatedStartDate,
  })
}

// Confirm material order
export async function PUT(request: Request) {
  initializeDatabase()
  const body = await request.json()
  const { materials } = body

  if (!materials || !Array.isArray(materials)) {
    return NextResponse.json({ error: "Materials array required" }, { status: 400 })
  }

  const results = materials.map((item: { materialCode: string; orderQuantity: number }) => {
    const material = db.materials.getByCode(item.materialCode)
    if (material) {
      const newStock = material.currentStock + item.orderQuantity
      db.materials.update(item.materialCode, { currentStock: newStock })
      return {
        materialCode: item.materialCode,
        previousStock: material.currentStock,
        orderedQuantity: item.orderQuantity,
        newStock,
        leadTimeDays: material.leadTimeDays,
        expectedArrival: new Date(Date.now() + material.leadTimeDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      }
    }
    return null
  })

  return NextResponse.json({ success: true, results: results.filter(Boolean) })
}
