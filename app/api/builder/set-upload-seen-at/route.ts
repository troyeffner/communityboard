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
    message.includes('seen_at_category') ||
    message.includes('schema cache')
  )
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')
  const posterUploadId = String(body.poster_upload_id || '').trim()
  if (!posterUploadId) return jsonError('poster_upload_id is required')

  const seenAtName = String(body.seen_at_name || '').trim() || null
  const seenAtCategory = String(body.seen_at_category || '').trim() || null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DEV_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const primary = await supabase
    .from('poster_uploads')
    .update({ seen_at_label: seenAtName, seen_at_name: seenAtName, seen_at_category: seenAtCategory })
    .eq('id', posterUploadId)
  if (primary.error && !isMissingSeenAtColumnError(primary.error)) return jsonError(primary.error.message, 500)

  if (primary.error) {
    const fallback = await supabase
      .from('poster_uploads')
      .update({ seen_at_name: seenAtName })
      .eq('id', posterUploadId)
    if (fallback.error && !isMissingSeenAtColumnError(fallback.error)) return jsonError(fallback.error.message, 500)
  }

  return NextResponse.json({ ok: true, seen_at_name: seenAtName, seen_at_category: seenAtCategory })
}
