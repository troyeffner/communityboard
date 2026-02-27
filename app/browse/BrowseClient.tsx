'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import PosterViewer from '../poster/[id]/PosterViewer'

type PosterRow = {
  id: string
  created_at: string
  seen_at_name: string | null
  public_url: string | null
}

type ItemRow = {
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
}

function formatCaptureHour(value?: string | null) {
  if (!value) return 'Unknown'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return 'Unknown'
  return dt.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
  })
}

export default function BrowseClient({
  initialPoster,
  initialSeenAt,
  initialTags,
}: {
  initialPoster: string
  initialSeenAt: string
  initialTags: string
}) {
  const router = useRouter()
  const [posterParam, setPosterParam] = useState(initialPoster)
  const [seenAt, setSeenAt] = useState(initialSeenAt)
  const [tags] = useState(initialTags)
  const [posters, setPosters] = useState<PosterRow[]>([])
  const [facets, setFacets] = useState<string[]>([])
  const [items, setItems] = useState<ItemRow[]>([])
  const [activePosterId, setActivePosterId] = useState<string>(initialPoster)
  const [error, setError] = useState('')

  const activePoster = useMemo(() => posters.find((p) => p.id === activePosterId) || null, [posters, activePosterId])

  function updateUrl(next: { poster?: string; seenAt?: string; tags?: string }) {
    const params = new URLSearchParams()
    const poster = next.poster ?? posterParam
    const nextSeenAt = next.seenAt ?? seenAt
    const nextTags = next.tags ?? tags
    if (poster) params.set('poster', poster)
    if (nextSeenAt) params.set('seenAt', nextSeenAt)
    if (nextTags) params.set('tags', nextTags)
    router.replace(`/browse${params.toString() ? `?${params.toString()}` : ''}`)
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const params = new URLSearchParams()
      if (posterParam) params.set('poster', posterParam)
      if (seenAt) params.set('seenAt', seenAt)
      if (tags) params.set('tags', tags)
      const res = await fetch(`/api/public/browse?${params.toString()}`)
      const data = await res.json().catch(() => ({}))
      if (cancelled) return
      if (!res.ok) {
        setError(data?.error || 'Failed to load browse data')
        return
      }
      setError('')
      setPosters((data.posters || []) as PosterRow[])
      setFacets((data.seen_at_facets || []) as string[])
      setItems((data.items || []) as ItemRow[])
      const nextPoster = String(data.active_poster_id || '')
      setActivePosterId(nextPoster)
      if (nextPoster !== posterParam) setPosterParam(nextPoster)
    }
    run()
    return () => { cancelled = true }
  }, [posterParam, seenAt, tags])

  const imageUrls = activePoster?.public_url ? [activePoster.public_url] : []
  const pinRows = items.map((item) => ({
    link_id: `item-${item.id}`,
    event_id: item.id,
    title: item.title,
    start_at: item.start_at || '',
    location: item.location_text,
    item_type: item.type,
    upvote_count: item.upvote_count || 0,
    did_upvote: item.did_upvote || false,
    bbox: { x: item.x, y: item.y },
  }))

  return (
    <main style={{ width: '100%', padding: 16, fontFamily: 'sans-serif' }}>
      <h1 style={{ marginTop: 0 }}>Browse Posters</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <section style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, display: 'grid', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Browse</h2>
          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Seen at</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                data-variant="secondary"
                onClick={() => {
                  setSeenAt('')
                  updateUrl({ seenAt: '', poster: '' })
                }}
              >
                All
              </button>
              {facets.map((facet) => (
                <button
                  key={facet}
                  data-variant="secondary"
                  onClick={() => {
                    setSeenAt(facet)
                    setPosterParam('')
                    updateUrl({ seenAt: facet, poster: '' })
                  }}
                  style={seenAt === facet ? { borderColor: '#1d4ed8', color: '#1d4ed8' } : undefined}
                >
                  {facet}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8, maxHeight: 'calc(100vh - 220px)', overflow: 'auto' }}>
            {posters.map((poster) => (
              <button
                key={poster.id}
                type="button"
                onClick={() => {
                  setPosterParam(poster.id)
                  setActivePosterId(poster.id)
                  updateUrl({ poster: poster.id })
                }}
                style={{
                  border: activePosterId === poster.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 8,
                  textAlign: 'left',
                  background: '#fff',
                  display: 'grid',
                  gridTemplateColumns: '64px 1fr',
                  gap: 8,
                }}
              >
                {poster.public_url ? (
                  <img src={poster.public_url} alt="Poster thumbnail" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: 6, background: '#f8fafc', border: '1px solid #e5e7eb' }} />
                )}
                <div>
                  <div style={{ fontSize: 12 }}>{formatCaptureHour(poster.created_at)}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{poster.seen_at_name || 'Unknown seen at'}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section>
          {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
          <PosterViewer
            imageUrls={imageUrls}
            pins={pinRows}
            activeEventId={pinRows[0]?.event_id || null}
            photoTakenAt={activePoster?.created_at || null}
            seenAt={activePoster?.seen_at_name || null}
            browseHref={`/browse${seenAt ? `?seenAt=${encodeURIComponent(seenAt)}` : ''}`}
          />
        </section>
      </div>
    </main>
  )
}
