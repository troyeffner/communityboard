import { NextResponse } from "next/server"
import { marketingSummary } from "@/lib/marketing/events"

export async function GET() {
  const data = await marketingSummary()
  return NextResponse.json(data)
}
