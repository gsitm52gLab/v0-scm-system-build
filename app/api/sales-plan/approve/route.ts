import { NextResponse } from "next/server"
import { db, initializeDatabase } from "@/lib/db"

export async function POST(request: Request) {
  initializeDatabase()

  try {
    const body = await request.json()
    const { ids, approvalComment } = body // 승인할 판매계획 ID 배열 및 승인 의견

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: "IDs array is required" }, { status: 400 })
    }

    const approvedPlans = []
    for (const id of ids) {
      const plan = db.salesPlans.getById(id)
      if (plan && plan.status === "draft") {
        const updated = db.salesPlans.update(id, { 
          status: "approved",
          approvalComment: approvalComment || undefined,
        })
        if (updated) {
          approvedPlans.push(updated)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: approvedPlans,
      message: `${approvedPlans.length}건의 판매계획이 승인되었습니다.`,
    })
  } catch (error) {
    console.error("[v0] Failed to approve sales plans:", error)
    return NextResponse.json({ success: false, error: "Failed to approve sales plans" }, { status: 500 })
  }
}
