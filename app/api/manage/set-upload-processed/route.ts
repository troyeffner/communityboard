import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')

  const { poster_upload_id, processed } = body as {
    poster_upload_id?: string
    processed?: boolean
  }

  if (!poster_upload_id) return jsonError('poster_upload_id is required')
  if (typeof processed !== 'boolean') return jsonError('processed must be a boolean')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DEV_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
  const processed_at = processed ? new Date().toISOString() : null

  const update = await supabase
    .from('poster_uploads')
    .update({ processed_at, done: processed })
    .eq('id', poster_upload_id)

  if (update.error) {
    const message = (update.error.message || '').toLowerCase()
    const missingDone = update.error.code === '42703' || message.includes('done') || message.includes('schema cache')
    if (!missingDone) return jsonError(update.error.message, 500)

    const fallback = await supabase
      .from('poster_uploads')
      .update({ processed_at })
      .eq('id', poster_upload_id)

    if (fallback.error) return jsonError(fallback.error.message, 500)
  }

  return NextResponse.json({ ok: true, processed_at, done: processed })
}
