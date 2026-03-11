import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getViewerIdFromCookie } from '@/lib/viewer-id'
import { getPosterSeenAt } from '@/lib/seenAt'
import { internalServerError, jsonError } from '@/lib/apiErrors'
import { loadInteractionReadmodels, readFromTrunkEnabled } from '@/lib/trunk/readmodels'

type PosterRow = {
  id: string
  file_path: string | null
  created_at: string
  status?: string | null
  seen_at_name?: string | null
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
  const useTrunkRead = readFromTrunkEnabled()
  const interactionModels = useTrunkRead
    ? await loadInteractionReadmodels().catch(() => ({
        eventVotes: new Map<string, number>(),
        tagVotes: new Map<string, number>(),
        itemUpvotes: new Map<string, number>(),
      }))
    : null

  const postersWithVenue = await supabase
    .from('poster_uploads')
    .select('id,file_path,created_at,status,seen_at_name')
    .order('created_at', { ascending: false })
    .limit(200)

  const postersError = postersWithVenue.error

  if (postersError) {
    const msg = (postersError.message || '').toLowerCase()
    const maybeMissingColumns =
      postersError.code === '42703' ||
      msg.includes('seen_at_name') ||
      msg.includes('schema cache')
    if (!maybeMissingColumns) return internalServerError('public/browse posters query failed', postersError)

    const fallback = await supabase
      .from('poster_uploads')
      .select('id,file_path,created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (fallback.error) return internalServerError('public/browse fallback posters query failed', fallback.error)

    const rows = ((fallback.data || []) as PosterRow[]).map((row) => ({
      id: row.id,
      created_at: row.created_at,
      status: row.status || 'uploaded',
      item_count: 0,
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

  const posterRows = ((postersWithVenue.data || []) as PosterRow[])
  const filteredPosterRows = posterRows
    .map((row) => {
      const seenAtName = getPosterSeenAt(row)
      return {
        id: row.id,
        created_at: row.created_at,
        status: row.status || 'uploaded',
        seen_at_name: seenAtName,
        public_url: row.file_path ? supabase.storage.from('posters').getPublicUrl(row.file_path).data.publicUrl : null,
      }
    })
    .filter((row) => (seenAt ? (row.seen_at_name || '') === seenAt : true))

  const filteredPosterIds = filteredPosterRows.map((p) => p.id)
  const countMap = new Map<string, number>()
  if (filteredPosterIds.length > 0) {
    const countsRes = await supabase
      .from('poster_items')
      .select('poster_id')
      .in('poster_id', filteredPosterIds)

    if (!countsRes.error) {
      for (const row of countsRes.data || []) {
        const key = String((row as { poster_id?: string }).poster_id || '')
        if (!key) continue
        countMap.set(key, (countMap.get(key) || 0) + 1)
      }
    } else {
      const legacyCounts = await supabase
        .from('poster_event_links')
        .select('poster_upload_id')
        .in('poster_upload_id', filteredPosterIds)
      if (!legacyCounts.error) {
        for (const row of legacyCounts.data || []) {
          const key = String((row as { poster_upload_id?: string }).poster_upload_id || '')
          if (!key) continue
          countMap.set(key, (countMap.get(key) || 0) + 1)
        }
      }
    }
  }

  const posters = filteredPosterRows.map((row) => ({
    ...row,
    item_count: countMap.get(row.id) || 0,
  }))

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
        // Trunk overlay is opt-in by feature flag; legacy value remains fallback.
        upvote_count: interactionModels?.itemUpvotes.get(row.id) ?? Number(row.upvote_count || 0),
        id: row.id,
        title: row.title || 'Item',
        type: row.type || 'event',
        status: row.status || 'published',
        start_at: toStartAt(row),
        location_text: row.location_text || null,
        x: Number(row.x),
        y: Number(row.y),
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
    read_source: useTrunkRead ? 'trunk-overlay-with-legacy-fallback' : 'legacy',
  })
}
