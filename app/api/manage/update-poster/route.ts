import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
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

  const result = await supabase
    .from('poster_uploads')
    .update(updates)
    .eq('id', posterUploadId)
    .select('id,file_path,status,created_at,seen_at_name,done,is_done,processed_at')
    .maybeSingle()

  if (result.error) return jsonError(result.error.message, 500)
  if (!result.data) return jsonError('Poster not found', 404)

  return NextResponse.json({ ok: true, row: result.data })
}

