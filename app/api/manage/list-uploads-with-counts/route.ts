import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type UploadRow = {
  id: string
  file_path: string | null
  status: string
  created_at: string
  done?: boolean | null
  is_done?: boolean | null
  processed_at?: string | null
  object_type?: string | null
  seen_at_name?: string | null
}

type LinkRow = { poster_upload_id: string }

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const uploadsRes = await supabase
    .from('poster_uploads')
    .select('id,file_path,status,created_at,done,is_done,processed_at,object_type,seen_at_name')
    .order('created_at', { ascending: false })
    .limit(100)

  if (uploadsRes.error) return NextResponse.json({ error: uploadsRes.error.message }, { status: 500 })

  const uploads = (uploadsRes.data || []) as UploadRow[]
  const uploadIds = uploads.map((u) => u.id)

  let linkedCountByUpload: Record<string, number> = {}
  if (uploadIds.length > 0) {
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

  const rows = uploads.map((u) => ({
    id: u.id,
    created_at: u.created_at,
    status: u.status,
    public_url: u.file_path ? supabase.storage.from('posters').getPublicUrl(u.file_path).data.publicUrl : null,
    seen_at_name: u.seen_at_name || null,
    done: Boolean(u.is_done ?? u.done ?? u.processed_at),
    is_done: Boolean(u.is_done ?? u.done ?? u.processed_at),
    object_type: u.object_type || 'event_poster',
    event_count: linkedCountByUpload[u.id] || 0,
    linked_count: linkedCountByUpload[u.id] || 0,
    linked_events_count: linkedCountByUpload[u.id] || 0,
  }))

  return NextResponse.json({ uploads: rows })
}

