import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { POSTER_STATUSES } from '@/lib/statuses'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function isMissingDoneColumns(error: { code?: string; message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase()
  return (
    error?.code === '42703' ||
    message.includes('done') ||
    message.includes('is_done') ||
    message.includes('processed_at') ||
    message.includes('schema cache')
  )
}

function isStatusEnumError(error: { code?: string; message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase()
  return (
    error?.code === '22P02' ||
    message.includes('invalid input value for enum') ||
    (message.includes('poster_status') && message.includes('enum'))
  )
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')
  const posterUploadId = String(body.poster_upload_id || '').trim()
  const isDone = Boolean(body.is_done)
  if (!posterUploadId) return jsonError('poster_upload_id is required')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // Status transition:
  // new/uploaded -> tending while poster is being worked.
  // tending -> processed when builder marks poster complete.
  // We intentionally do not write status='done' to avoid enum drift across environments.
  const nextStatus = isDone ? POSTER_STATUSES.DONE : POSTER_STATUSES.TENDING

  let update = await supabase
    .from('poster_uploads')
    .update({ status: nextStatus, is_done: isDone, done: isDone, processed_at: isDone ? new Date().toISOString() : null })
    .eq('id', posterUploadId)
  if (update.error && isStatusEnumError(update.error)) {
    // Environment has a poster_status enum that does not include our "done/processed" value yet.
    // Preserve behavior via completion flags instead of failing the action.
    update = await supabase
      .from('poster_uploads')
      .update({ is_done: isDone, done: isDone, processed_at: isDone ? new Date().toISOString() : null })
      .eq('id', posterUploadId)
  }
  if (update.error && isMissingDoneColumns(update.error)) {
    update = await supabase
      .from('poster_uploads')
      .update({ status: nextStatus, processed_at: isDone ? new Date().toISOString() : null })
      .eq('id', posterUploadId)
  }
  if (update.error && isStatusEnumError(update.error)) {
    update = await supabase
      .from('poster_uploads')
      .update({ processed_at: isDone ? new Date().toISOString() : null })
      .eq('id', posterUploadId)
  }
  if (update.error && isMissingDoneColumns(update.error)) {
    update = await supabase
      .from('poster_uploads')
      .update({ status: nextStatus })
      .eq('id', posterUploadId)
  }
  if (update.error) return jsonError(update.error.message, 500)

  return NextResponse.json({ ok: true, is_done: isDone })
}
