import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import fs from 'node:fs'
import path from 'node:path'

export const runtime = 'nodejs'

type MarketingEvent = {
  name: string
  path?: string
  ts?: string
  meta?: any
}

function safeJson(obj: any) {
  try {
    return JSON.stringify(obj)
  } catch {
    return JSON.stringify({ error: 'stringify_failed' })
  }
}

export async function POST(req: Request) {
  let body: MarketingEvent | null = null
  try {
    body = (await req.json()) as MarketingEvent
  } catch {
    body = null
  }

  const h = await headers()
  const ua = h.get('user-agent')
  const referer = h.get('referer')
  const ip = h.get('x-forwarded-for') || h.get('x-real-ip')

  const evt = {
    ...body,
    ts: body?.ts || new Date().toISOString(),
    _meta: {
      ua,
      referer,
      ip,
    },
  }

  // Dev-friendly, no-db storage:
  // Append NDJSON line into ./.local/marketing-events.ndjson
  try {
    const dir = path.join(process.cwd(), '.local')
    const fp = path.join(dir, 'marketing-events.ndjson')
    fs.mkdirSync(dir, { recursive: true })
    fs.appendFileSync(fp, safeJson(evt) + '\n', { encoding: 'utf-8' })
  } catch {
    // ignore
  }

  // Always log (useful in server logs)
  console.log('[marketing-event]', safeJson(evt))

  return NextResponse.json({ ok: true })
}
