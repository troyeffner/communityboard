import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')

  const posterUploadId = String(body.poster_upload_id || '').trim()
  const modeRaw = String(body.mode || 'unlink').trim().toLowerCase()
  const mode: 'unlink' | 'delete_with_events' = modeRaw === 'delete_with_events' ? 'delete_with_events' : 'unlink'
  if (!posterUploadId) return jsonError('poster_upload_id is required')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const uploadLookup = await supabase
    .from('poster_uploads')
    .select('id,file_path')
    .eq('id', posterUploadId)
    .maybeSingle()
  if (uploadLookup.error) return jsonError(uploadLookup.error.message, 500)
  if (!uploadLookup.data) return jsonError('Poster not found or already deleted.', 404)

  const linkedEvents = await supabase
    .from('poster_event_links')
    .select('event_id')
    .eq('poster_upload_id', posterUploadId)
  if (linkedEvents.error && linkedEvents.error.code !== '42P01') return jsonError(linkedEvents.error.message, 500)

  const eventIds = Array.from(new Set((linkedEvents.data || []).map((row) => row.event_id).filter(Boolean)))

  const itemIdsRes = await supabase.from('poster_items').select('id').eq('poster_id', posterUploadId)
  const itemIds = itemIdsRes.error ? [] : (itemIdsRes.data || []).map((row) => row.id)

  if (mode === 'delete_with_events' && itemIds.length > 0) {
    const delItems = await supabase.from('poster_items').delete().in('id', itemIds)
    if (delItems.error) return jsonError(delItems.error.message, 500)
  } else {
    const delItems = await supabase.from('poster_items').delete().eq('poster_id', posterUploadId)
    if (delItems.error && delItems.error.code !== '42P01') return jsonError(delItems.error.message, 500)
  }

  const deleteLinks = await supabase
    .from('poster_event_links')
    .delete()
    .eq('poster_upload_id', posterUploadId)
  if (deleteLinks.error && deleteLinks.error.code !== '42P01') return jsonError(deleteLinks.error.message, 500)

  if (mode === 'delete_with_events' && eventIds.length > 0) {
    const deleteEvents = await supabase.from('events').delete().in('id', eventIds)
    if (deleteEvents.error && deleteEvents.error.code !== '42P01') return jsonError(deleteEvents.error.message, 500)
  }

  const deleteUpload = await supabase
    .from('poster_uploads')
    .delete()
    .eq('id', posterUploadId)
  if (deleteUpload.error) return jsonError(deleteUpload.error.message, 500)

  if (uploadLookup.data.file_path) {
    const removeStorage = await supabase.storage.from('posters').remove([uploadLookup.data.file_path])
    if (removeStorage.error) return jsonError(removeStorage.error.message, 500)
  }

  return NextResponse.json({ ok: true, mode })
}
