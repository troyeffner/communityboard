import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function isMissingSeenAtColumnError(error: { code?: string; message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase()
  return (
    error?.code === '42703' ||
    message.includes('seen_at_label') ||
    message.includes('seen_at_name') ||
    message.includes('schema cache')
  )
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')

  const { poster_upload_id, seen_at_label } = body as {
    poster_upload_id?: string
    seen_at_label?: string
  }

  if (!poster_upload_id) return jsonError('poster_upload_id is required')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DEV_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
  const label = seen_at_label?.trim() || null

  const primary = await supabase
    .from('poster_uploads')
    .update({ seen_at_label: label })
    .eq('id', poster_upload_id)

  if (primary.error && !isMissingSeenAtColumnError(primary.error)) {
    return jsonError(primary.error.message, 500)
  }

  if (primary.error) {
    const fallback = await supabase
      .from('poster_uploads')
      .update({ seen_at_name: label })
      .eq('id', poster_upload_id)
    if (fallback.error && !isMissingSeenAtColumnError(fallback.error)) {
      return jsonError(fallback.error.message, 500)
    }
  } else {
    // Best effort mirror for legacy schemas where seen_at_name still exists.
    await supabase
      .from('poster_uploads')
      .update({ seen_at_name: label })
      .eq('id', poster_upload_id)
  }

  return NextResponse.json({ ok: true, seen_at_label: label })
}
