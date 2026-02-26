import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type PosterUploadRow = {
  id: string
  file_path: string
  status: string
  type?: string | null
  created_at: string
  processed_at: string | null
  done?: boolean | null
  is_done?: boolean | null
  object_type?: string | null
  seen_at_label?: string | null
  seen_at_name?: string | null
}

type PosterEventLinkRow = {
  poster_upload_id: string
}
type PosterBusinessLinkRow = {
  poster_upload_id: string
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DEV_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const isMissingOptionalColumns = (message: string) => {
    const lower = message.toLowerCase()
    return (
      lower.includes('processed_at') ||
      lower.includes('type') ||
      lower.includes('done') ||
      lower.includes('is_done') ||
      lower.includes('object_type') ||
      lower.includes('seen_at_label') ||
      lower.includes('seen_at_name') ||
      lower.includes('schema cache')
    )
  }

  const { data, error } = await supabase
    .from('poster_uploads')
    .select('id, file_path, status, type, created_at, processed_at, done, is_done, object_type, seen_at_label, seen_at_name')
    .order('created_at', { ascending: false })
    .limit(50)

  let uploads = (data || []) as PosterUploadRow[]

  // Backward compatibility: allow the UI to load before optional columns are applied/cached.
  if (error) {
    if (error.code !== '42703' && !isMissingOptionalColumns(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const fallbackWithSeenAtName = await supabase
      .from('poster_uploads')
      .select('id, file_path, status, created_at, seen_at_name')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!fallbackWithSeenAtName.error) {
      uploads = ((fallbackWithSeenAtName.data || []) as Array<Omit<PosterUploadRow, 'processed_at' | 'type' | 'done' | 'is_done' | 'object_type' | 'seen_at_label'> & { seen_at_name?: string | null }>).map((row) => ({
        ...row,
        type: null,
        processed_at: null,
        done: false,
        is_done: false,
        object_type: 'event_poster',
        seen_at_label: row.seen_at_name || null,
        seen_at_name: row.seen_at_name || null,
      }))
    } else {
    const fallback = await supabase
      .from('poster_uploads')
      .select('id, file_path, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 })
    }

    uploads = ((fallback.data || []) as Omit<PosterUploadRow, 'processed_at' | 'type' | 'done' | 'is_done' | 'object_type' | 'seen_at_label' | 'seen_at_name'>[]).map((row) => ({
      ...row,
      type: null,
      processed_at: null,
      done: false,
      is_done: false,
      object_type: 'event_poster',
      seen_at_label: null,
      seen_at_name: null,
    }))
    }
  }
  const uploadIds = uploads.map((u) => u.id)

  let eventCountByUploadId: Record<string, number> = {}
  let businessCountByUploadId: Record<string, number> = {}
  if (uploadIds.length > 0) {
    const { data: links, error: linksError } = await supabase
      .from('poster_event_links')
      .select('poster_upload_id')
      .in('poster_upload_id', uploadIds)

    if (linksError) {
      return NextResponse.json({ error: linksError.message }, { status: 500 })
    }

    eventCountByUploadId = ((links || []) as PosterEventLinkRow[]).reduce<Record<string, number>>(
      (acc, row) => {
        acc[row.poster_upload_id] = (acc[row.poster_upload_id] || 0) + 1
        return acc
      },
      {}
    )

    const businessLinks = await supabase
      .from('poster_business_links')
      .select('poster_upload_id')
      .in('poster_upload_id', uploadIds)

    if (!businessLinks.error) {
      businessCountByUploadId = ((businessLinks.data || []) as PosterBusinessLinkRow[]).reduce<Record<string, number>>(
        (acc, row) => {
          acc[row.poster_upload_id] = (acc[row.poster_upload_id] || 0) + 1
          return acc
        },
        {}
      )
    }
  }

  const uploadsWithCounts = uploads.map((u) => {
    const publicUrl = u.file_path ? supabase.storage.from('posters').getPublicUrl(u.file_path).data.publicUrl : null
    return {
      id: u.id,
      created_at: u.created_at,
      status: u.status,
      type: u.type || 'poster',
      public_url: publicUrl,
      event_count: eventCountByUploadId[u.id] || 0,
      linked_count: eventCountByUploadId[u.id] || 0,
      business_count: businessCountByUploadId[u.id] || 0,
      processed_at: u.processed_at,
      done: Boolean(u.is_done ?? u.done ?? u.processed_at),
      is_done: Boolean(u.is_done ?? u.done ?? u.processed_at),
      object_type: u.object_type || 'event_poster',
      seen_at_label: u.seen_at_label || u.seen_at_name || null,
    }
  })

  return NextResponse.json({ uploads: uploadsWithCounts })
}
