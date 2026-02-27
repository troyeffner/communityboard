import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')

  const posterUploadId = String(body.poster_upload_id || '').trim()
  const seenAtName = typeof body.seen_at_name === 'string' ? body.seen_at_name.trim() : ''
  if (!posterUploadId) return jsonError('poster_upload_id is required')
  if (!seenAtName) return jsonError('seen_at_name is required')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const result = await supabase
    .from('poster_uploads')
    .update({ seen_at_name: seenAtName })
    .eq('id', posterUploadId)
  if (result.error) {
    const msg = (result.error.message || '').toLowerCase()
    const missingSeenAt = result.error.code === '42703' || msg.includes('seen_at_name') || msg.includes('seen_at') || msg.includes('source_place') || msg.includes('schema cache')
    if (!missingSeenAt) return jsonError(result.error.message, 500)
    const fallback = await supabase
      .from('poster_uploads')
      .update({ seen_at_label: seenAtName })
      .eq('id', posterUploadId)
    if (!fallback.error) return NextResponse.json({ ok: true, seen_at_name: seenAtName })

    const fallbackSeenAt = await supabase
      .from('poster_uploads')
      .update({ seen_at: seenAtName })
      .eq('id', posterUploadId)
    if (!fallbackSeenAt.error) return NextResponse.json({ ok: true, seen_at_name: seenAtName })

    const fallbackSourcePlace = await supabase
      .from('poster_uploads')
      .update({ source_place: seenAtName })
      .eq('id', posterUploadId)
    if (fallbackSourcePlace.error) return jsonError(fallbackSourcePlace.error.message, 500)
  }

  return NextResponse.json({ ok: true, seen_at_name: seenAtName })
}
