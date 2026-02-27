import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function isMissingSeenAtName(error: { code?: string; message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase()
  return error?.code === '42703' || message.includes('seen_at_name') || message.includes('seen_at_label') || message.includes('schema cache')
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')

  const posterUploadId = String(body.poster_upload_id || '').trim()
  if (!posterUploadId) return jsonError('poster_upload_id is required')

  const updates: { seen_at_name?: string | null; status?: string } = {}
  if (typeof body.seen_at_name === 'string') {
    const trimmed = body.seen_at_name.trim()
    if (trimmed) updates.seen_at_name = trimmed
  }
  if (typeof body.status === 'string' && body.status.trim()) {
    updates.status = body.status.trim()
  }
  if (Object.keys(updates).length === 0) {
    return jsonError('No valid fields to update')
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  let result = await supabase
    .from('poster_uploads')
    .update(updates)
    .eq('id', posterUploadId)
    .select('id,file_path,status,created_at,seen_at_name')
    .maybeSingle()

  if (result.error && isMissingSeenAtName(result.error)) {
    const seenAtValue = updates.seen_at_name
    const statusValue = updates.status
    if (typeof seenAtValue !== 'undefined') {
      const labelUpdate = await supabase
        .from('poster_uploads')
        .update({
          ...(typeof statusValue !== 'undefined' ? { status: statusValue } : {}),
          seen_at_label: seenAtValue,
        })
        .eq('id', posterUploadId)
        .select('id,file_path,status,created_at,seen_at_label')
        .maybeSingle()
      if (!labelUpdate.error) {
        return NextResponse.json({
          ok: true,
          row: {
            ...(labelUpdate.data || {}),
            seen_at_name: (labelUpdate.data as { seen_at_label?: string | null } | null)?.seen_at_label || null,
          },
        })
      }
    }

    const fallbackUpdates = { ...updates }
    delete fallbackUpdates.seen_at_name
    if (Object.keys(fallbackUpdates).length === 0) return jsonError('Seen at column is missing on this environment. Run DB migrations.', 500)

    result = await supabase
      .from('poster_uploads')
      .update(fallbackUpdates)
      .eq('id', posterUploadId)
      .select('id,file_path,status,created_at')
      .maybeSingle()
  }

  if (result.error) return jsonError(result.error.message, 500)
  if (!result.data) return jsonError('Poster not found', 404)

  return NextResponse.json({ ok: true, row: result.data })
}
