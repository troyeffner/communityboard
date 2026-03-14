import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildPosterUploadInsertCandidates, isUploadInsertRetryable } from '@/lib/trunk/uploadPolicy'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function isMissingColumn(error: { code?: string; message?: string } | null | undefined, column: string) {
  const message = (error?.message || '').toLowerCase()
  return error?.code === '42703' || message.includes(column.toLowerCase()) || message.includes('schema cache')
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
  const insertCandidates = buildPosterUploadInsertCandidates(filePath, seenAtName)

  let row: { id?: string } | null = null
  let insertErr: { code?: string; message?: string } | null = null

  for (const candidate of insertCandidates) {
    const attempt = await supabase
      .from('poster_uploads')
      .insert([candidate as never])
      .select('id')
      .single()
    if (!attempt.error && attempt.data) {
      row = attempt.data
      insertErr = null
      break
    }
    insertErr = attempt.error
    if (!attempt.error) continue
    if (isUploadInsertRetryable(attempt.error, isMissingColumn)) {
      continue
    }
    return jsonError(attempt.error.message, 500)
  }

  if (insertErr) return jsonError(insertErr.message || 'Failed to create upload record', 500)
  if (!row?.id) return jsonError('Failed to create upload record', 500)
  return NextResponse.json({ ok: true, id: row.id, poster_upload_id: row.id })
}
