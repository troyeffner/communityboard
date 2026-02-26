import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')

  const { poster_upload_id, mode } = body as { poster_upload_id?: string; mode?: 'unlink' | 'cascade' | 'unlink_events' | 'delete_events' }
  if (!poster_upload_id) return jsonError('poster_upload_id is required')
  const deleteMode = mode === 'cascade' || mode === 'delete_events' ? 'cascade' : 'unlink'

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

  const linkedEvents = await supabase
    .from('poster_event_links')
    .select('event_id')
    .eq('poster_upload_id', poster_upload_id)

  if (linkedEvents.error) return jsonError(linkedEvents.error.message, 500)

  const linkedBusinesses = await supabase
    .from('poster_business_links')
    .select('business_id')
    .eq('poster_upload_id', poster_upload_id)

  if (linkedBusinesses.error && !String(linkedBusinesses.error.message || '').toLowerCase().includes('poster_business_links')) {
    return jsonError(linkedBusinesses.error.message, 500)
  }

  const { error: delLinksErr } = await supabase
    .from('poster_event_links')
    .delete()
    .eq('poster_upload_id', poster_upload_id)

  if (delLinksErr) return jsonError(delLinksErr.message, 500)

  const delBusinessLinks = await supabase
    .from('poster_business_links')
    .delete()
    .eq('poster_upload_id', poster_upload_id)

  if (delBusinessLinks.error && !String(delBusinessLinks.error.message || '').toLowerCase().includes('poster_business_links')) {
    return jsonError(delBusinessLinks.error.message, 500)
  }

  if (deleteMode === 'cascade') {
    const eventIds = Array.from(new Set((linkedEvents.data || []).map((row) => row.event_id).filter(Boolean)))
    if (eventIds.length > 0) {
      const delEvents = await supabase.from('events').delete().in('id', eventIds)
      if (delEvents.error) return jsonError(delEvents.error.message, 500)
    }

    const businessIds = Array.from(
      new Set(((linkedBusinesses.data || []) as Array<{ business_id: string }>).map((row) => row.business_id).filter(Boolean))
    )
    if (businessIds.length > 0) {
      const delBusinesses = await supabase.from('businesses').delete().in('id', businessIds)
      if (delBusinesses.error && !String(delBusinesses.error.message || '').toLowerCase().includes('relation "businesses"')) {
        return jsonError(delBusinesses.error.message, 500)
      }
    }
  }

  const { error: delUploadErr } = await supabase
    .from('poster_uploads')
    .delete()
    .eq('id', poster_upload_id)

  if (delUploadErr) return jsonError(delUploadErr.message, 500)

  if (uploadRow.file_path) {
    const { error: removeStorageErr } = await supabase.storage
      .from('posters')
      .remove([uploadRow.file_path])

    if (removeStorageErr) return jsonError(removeStorageErr.message, 500)
  }

  return NextResponse.json({ ok: true, mode: deleteMode })
}
