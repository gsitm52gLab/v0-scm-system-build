import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const productions = db.productions.getAll()
    return NextResponse.json({ success: true, data: productions })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch productions" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const production = await request.json()
    const created = db.productions.create(production)
    return NextResponse.json({ success: true, data: created })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to create production" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    const updated = db.productions.update(id, data)

    if (!updated) {
      return NextResponse.json({ success: false, error: "Production not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update production" }, { status: 500 })
  }
}
