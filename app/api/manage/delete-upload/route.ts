import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')

  const { poster_upload_id } = body as { poster_upload_id?: string }
  if (!poster_upload_id) return jsonError('poster_upload_id is required')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data: uploadRow, error: loadErr } = await supabase
    .from('poster_uploads')
    .select('id, file_path')
    .eq('id', poster_upload_id)
    .maybeSingle()

  if (loadErr) return jsonError(loadErr.message, 500)
  if (!uploadRow) return jsonError('Submission not found', 404)

  const { error: linkedEventIdsErr } = await supabase
    .from('poster_event_links')
    .select('event_id')
    .eq('poster_upload_id', poster_upload_id)

  if (linkedEventIdsErr) return jsonError(linkedEventIdsErr.message, 500)

  const { error: delLinksErr } = await supabase
    .from('poster_event_links')
    .delete()
    .eq('poster_upload_id', poster_upload_id)

  if (delLinksErr) return jsonError(delLinksErr.message, 500)

  const { error: delUploadErr } = await supabase
    .from('poster_uploads')
    .delete()
    .eq('id', poster_upload_id)

  if (delUploadErr) return jsonError(delUploadErr.message, 500)

  const { error: removeStorageErr } = await supabase.storage
    .from('posters')
    .remove([uploadRow.file_path])

  if (removeStorageErr) return jsonError(removeStorageErr.message, 500)

  return NextResponse.json({ ok: true })
}
