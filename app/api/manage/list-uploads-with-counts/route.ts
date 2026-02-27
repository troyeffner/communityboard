import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPosterSeenAt } from '@/lib/seenAt'

type UploadRow = {
  id: string
  file_path: string | null
  status: string
  created_at: string
  done?: boolean | null
  is_done?: boolean | null
  processed_at?: string | null
  seen_at_name?: string | null
}

type LinkRow = { poster_upload_id: string }
type ItemCountRow = { poster_id: string }

function isMissingDoneColumns(error: { code?: string; message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase()
  return (
    error?.code === '42703' ||
    message.includes('done') ||
    message.includes('is_done') ||
    message.includes('processed_at') ||
    message.includes('seen_at_name') ||
    message.includes('schema cache')
  )
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const uploadsRes = await supabase
    .from('poster_uploads')
    .select('id,file_path,status,created_at,done,is_done,processed_at,seen_at_name')
    .order('created_at', { ascending: false })
    .limit(100)

  let uploads = (uploadsRes.data || []) as UploadRow[]
  if (uploadsRes.error) {
    if (!isMissingDoneColumns(uploadsRes.error)) {
      return NextResponse.json({ error: uploadsRes.error.message }, { status: 500 })
    }

    const fallback = await supabase
      .from('poster_uploads')
      .select('id,file_path,status,created_at,seen_at_name')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!fallback.error) {
      uploads = ((fallback.data || []) as UploadRow[]).map((row) => ({
        ...row,
        done: false,
        is_done: false,
        processed_at: null,
      }))
    } else {
      const fallbackNoSeenAt = await supabase
        .from('poster_uploads')
        .select('id,file_path,status,created_at')
        .order('created_at', { ascending: false })
        .limit(100)
      if (fallbackNoSeenAt.error) return NextResponse.json({ error: fallbackNoSeenAt.error.message }, { status: 500 })
      uploads = ((fallbackNoSeenAt.data || []) as UploadRow[]).map((row) => ({
        ...row,
        seen_at_name: null,
        done: false,
        is_done: false,
        processed_at: null,
      }))
    }
  }
  const uploadIds = uploads.map((u) => u.id)

  let linkedCountByUpload: Record<string, number> = {}
  if (uploadIds.length > 0) {
    const itemsRes = await supabase
      .from('poster_items')
      .select('poster_id')
      .in('poster_id', uploadIds)
    if (!itemsRes.error) {
      linkedCountByUpload = ((itemsRes.data || []) as ItemCountRow[]).reduce<Record<string, number>>((acc, row) => {
        acc[row.poster_id] = (acc[row.poster_id] || 0) + 1
        return acc
      }, {})
    } else {
      const linksRes = await supabase
        .from('poster_event_links')
        .select('poster_upload_id')
        .in('poster_upload_id', uploadIds)
      if (linksRes.error) return NextResponse.json({ error: linksRes.error.message }, { status: 500 })
      linkedCountByUpload = ((linksRes.data || []) as LinkRow[]).reduce<Record<string, number>>((acc, row) => {
        acc[row.poster_upload_id] = (acc[row.poster_upload_id] || 0) + 1
        return acc
      }, {})
    }
  }

  const rows = uploads.map((u) => ({
    id: u.id,
    created_at: u.created_at,
    status: u.status,
    public_url: u.file_path ? supabase.storage.from('posters').getPublicUrl(u.file_path).data.publicUrl : null,
    seen_at_name: getPosterSeenAt(u),
    done: ['done', 'processed'].includes((u.status || '').toLowerCase()) || Boolean(u.is_done ?? u.done ?? u.processed_at),
    is_done: ['done', 'processed'].includes((u.status || '').toLowerCase()) || Boolean(u.is_done ?? u.done ?? u.processed_at),
    event_count: linkedCountByUpload[u.id] || 0,
    linked_count: linkedCountByUpload[u.id] || 0,
    linked_events_count: linkedCountByUpload[u.id] || 0,
  }))

  return NextResponse.json({ uploads: rows })
}
