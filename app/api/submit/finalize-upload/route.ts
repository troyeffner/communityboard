import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { POSTER_STATUSES } from '@/lib/statuses'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function isPosterStatusEnumMismatch(error: { message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase()
  return message.includes('poster_status') && message.includes('new')
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')
  const filePath = String(body.file_path || '').trim()
  const seenAtName = String(body.seen_at_name || '').trim() || null
  if (!filePath) return jsonError('file_path is required')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
  let insert = await supabase
    .from('poster_uploads')
    .insert([{ file_path: filePath, status: POSTER_STATUSES.NEW, seen_at_name: seenAtName, is_done: false }])
    .select('id')
    .single()

  if (insert.error && isPosterStatusEnumMismatch(insert.error)) {
    insert = await supabase
      .from('poster_uploads')
      .insert([{ file_path: filePath, status: POSTER_STATUSES.UPLOADED, seen_at_name: seenAtName }])
      .select('id')
      .single()
  }
  if (insert.error) {
    const msg = (insert.error.message || '').toLowerCase()
    const missingSeenAt = insert.error.code === '42703' || msg.includes('seen_at_name') || msg.includes('schema cache')
    if (missingSeenAt) return jsonError('Run migration: poster_uploads.seen_at_name', 500)
  }
  if (insert.error) {
    const msg = (insert.error.message || '').toLowerCase()
    const missingSeenAtAny = insert.error.code === '42703' || msg.includes('seen_at_name') || msg.includes('schema cache')
    if (missingSeenAtAny) {
      insert = await supabase
        .from('poster_uploads')
        .insert([{ file_path: filePath, status: POSTER_STATUSES.UPLOADED }])
        .select('id')
        .single()
    }
  }

  if (insert.error) return jsonError(insert.error.message, 500)
  if (!insert.data?.id) return jsonError('Failed to create upload record', 500)
  return NextResponse.json({ ok: true, id: insert.data.id, poster_upload_id: insert.data.id })
}
