import { NextResponse } from "next/server"
import { db, initializeDatabase } from "@/lib/db"

export async function POST(request: Request) {
  initializeDatabase()

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }

    const text = await file.text()
    // BOM 제거 (UTF-8 BOM)
    const cleanText = text.replace(/^\uFEFF/, "")
    const lines = cleanText.split("\n").filter((line) => line.trim())
    
    // 첫 번째 줄은 헤더이므로 제외
    const dataLines = lines.slice(1)
    const plans = []

    for (const line of dataLines) {
      // CSV 파싱: 쉼표로 분리하되, 따옴표 안의 쉼표는 무시
      const parts: string[] = []
      let current = ""
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === "," && !inQuotes) {
          parts.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }
      parts.push(current.trim())
      
      const [yearMonth, customer, productCode, product, category, plannedQuantity, plannedRevenue, status] = parts
      
      if (!yearMonth || !productCode || !customer) continue

      plans.push({
        id: `SP-${yearMonth.trim()}-${customer.trim()}-${productCode.trim()}`,
        yearMonth: yearMonth.trim(),
        customer: customer.trim() as any,
        productCode: productCode.trim(),
        product: product?.trim() || productCode.trim(),
        category: (category?.trim() || "EV") as any,
        plannedQuantity: parseInt(plannedQuantity?.trim() || "0") || 0,
        plannedRevenue: parseInt(plannedRevenue?.trim() || "0") || 0,
        status: (status?.trim() === "approved" ? "approved" : "draft") as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    const updated = db.salesPlans.bulkUpdate(plans)

    return NextResponse.json({ success: true, data: updated, message: `${plans.length}건의 판매계획이 업로드되었습니다.` })
  } catch (error) {
    console.error("[v0] Failed to upload sales plan:", error)
    return NextResponse.json({ success: false, error: "Failed to upload sales plan" }, { status: 500 })
  }
}

