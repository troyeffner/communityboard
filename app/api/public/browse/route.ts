import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getViewerIdFromCookie } from '@/lib/viewer-id'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

type PosterRow = {
  id: string
  file_path: string | null
  created_at: string
  seen_at_name?: string | null
  venue_id?: string | null
  venues?: { name: string | null } | { name: string | null }[] | null
}

type ItemRow = {
  id: string
  poster_id: string
  title: string
  type: string | null
  status: string | null
  start_date: string | null
  time_of_day: string | null
  location_text: string | null
  x: number
  y: number
  upvote_count?: number | null
}

type LegacyBrowseLink = {
  bbox: { x: number; y: number } | null
  events:
    | { id: string; title: string; start_at: string; location: string | null; status?: string | null }
    | { id: string; title: string; start_at: string; location: string | null; status?: string | null }[]
    | null
}

function toStartAt(row: ItemRow) {
  if (!row.start_date) return null
  return `${row.start_date}T${row.time_of_day || '14:00:00'}`
}

export async function GET(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const params = new URL(req.url).searchParams
  const selectedPoster = params.get('poster')?.trim() || ''
  const seenAt = params.get('seenAt')?.trim() || ''
  const viewerId = getViewerIdFromCookie(req.headers.get('cookie'))

  const postersWithVenue = await supabase
    .from('poster_uploads')
    .select('id,file_path,created_at,seen_at_name,venue_id,venues(name)')
    .order('created_at', { ascending: false })
    .limit(200)

  const useNoJoinFallback =
    Boolean(postersWithVenue.error) &&
    (() => {
      const msg = (postersWithVenue.error?.message || '').toLowerCase()
      return msg.includes('could not find a relationship') || msg.includes('relation')
    })()

  const postersNoJoin = useNoJoinFallback
    ? await supabase
        .from('poster_uploads')
        .select('id,file_path,created_at,seen_at_name,venue_id')
        .order('created_at', { ascending: false })
        .limit(200)
    : null

  const postersError = postersNoJoin?.error || postersWithVenue.error

  if (postersError) {
    const msg = (postersError.message || '').toLowerCase()
    const maybeMissingColumns =
      postersError.code === '42703' ||
      msg.includes('seen_at_name') ||
      msg.includes('venue_id') ||
      msg.includes('schema cache')
    if (!maybeMissingColumns) return jsonError(postersError.message, 500)

    const fallback = await supabase
      .from('poster_uploads')
      .select('id,file_path,created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (fallback.error) return jsonError(fallback.error.message, 500)

    const rows = ((fallback.data || []) as PosterRow[]).map((row) => ({
      id: row.id,
      created_at: row.created_at,
      seen_at_name: null,
      public_url: row.file_path ? supabase.storage.from('posters').getPublicUrl(row.file_path).data.publicUrl : null,
    }))

    return NextResponse.json({
      posters: rows,
      seen_at_facets: [],
      active_poster_id: selectedPoster || rows[0]?.id || null,
      items: [],
      tag_facets: [],
    })
  }

  const posterRows = ((postersNoJoin?.data || postersWithVenue.data || []) as PosterRow[])
  const posters = posterRows
    .map((row) => {
      const venue = Array.isArray(row.venues) ? row.venues[0] : row.venues
      const seenAtName = (venue?.name || row.seen_at_name || null)
      return {
        id: row.id,
        created_at: row.created_at,
        seen_at_name: seenAtName,
        public_url: row.file_path ? supabase.storage.from('posters').getPublicUrl(row.file_path).data.publicUrl : null,
      }
    })
    .filter((row) => (seenAt ? (row.seen_at_name || '') === seenAt : true))

  const activePosterId = selectedPoster || posters[0]?.id || null
  const seenAtFacets = Array.from(new Set(posters.map((p) => p.seen_at_name || '').filter(Boolean))).sort()

  let items: Array<{
    id: string
    title: string
    type: string
    status: string
    start_at: string | null
    location_text: string | null
    x: number
    y: number
    upvote_count: number
    did_upvote: boolean
  }> = []

  if (activePosterId) {
    const itemsRes = await supabase
      .from('poster_items')
      .select('id,poster_id,title,type,status,start_date,time_of_day,location_text,x,y,upvote_count')
      .eq('poster_id', activePosterId)
      .eq('status', 'published')
      .order('created_at', { ascending: true })

    if (!itemsRes.error) {
      const rawItems = (itemsRes.data || []) as ItemRow[]
      let didUpvoteSet = new Set<string>()
      if (viewerId && rawItems.length > 0) {
        const ids = rawItems.map((row) => row.id)
        const votesRes = await supabase
          .from('poster_item_upvotes')
          .select('poster_item_id')
          .eq('viewer_id', viewerId)
          .in('poster_item_id', ids)
        if (!votesRes.error) {
          didUpvoteSet = new Set((votesRes.data || []).map((row) => String(row.poster_item_id)))
        }
      }

      items = rawItems.map((row) => ({
        id: row.id,
        title: row.title || 'Item',
        type: row.type || 'event',
        status: row.status || 'published',
        start_at: toStartAt(row),
        location_text: row.location_text || null,
        x: Number(row.x),
        y: Number(row.y),
        upvote_count: Number(row.upvote_count || 0),
        did_upvote: didUpvoteSet.has(row.id),
      }))
    } else {
      const legacy = await supabase
        .from('poster_event_links')
        .select('id,event_id,bbox,events(id,title,start_at,location,status)')
        .eq('poster_upload_id', activePosterId)
        .order('created_at', { ascending: true })
      if (!legacy.error) {
        items = ((legacy.data || []) as LegacyBrowseLink[])
          .map((row) => {
            const event = Array.isArray(row.events) ? row.events[0] : row.events
            if (!event || !row.bbox) return null
            if ((event.status || '').toLowerCase() !== 'published') return null
            return {
              id: String(event.id),
              title: String(event.title || 'Item'),
              type: 'event',
              status: String(event.status || 'published'),
              start_at: String(event.start_at || ''),
              location_text: (event.location as string | null) || null,
              x: Number(row.bbox.x),
              y: Number(row.bbox.y),
              upvote_count: 0,
              did_upvote: false,
            }
          })
          .filter((row): row is NonNullable<typeof row> => row !== null)
      }
    }
  }

  return NextResponse.json({
    posters,
    seen_at_facets: seenAtFacets,
    active_poster_id: activePosterId,
    items,
    tag_facets: [],
  })
}
