import { NextResponse } from 'next/server'

export async function POST() {
  // Placeholder async hook so uploads do not block on OCR.
  // Wire this to background processing when OCR service is available.
  return NextResponse.json({ ok: true, queued: false })
}
