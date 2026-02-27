'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PosterViewer from '../poster/[id]/PosterViewer'
import { uiStyles, uiTokens } from '@/lib/uiTokens'

type PosterRow = {
  id: string
  created_at: string
  status: string
  item_count: number
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
    <main style={{ width: '100%', maxWidth: '100%', padding: '12px clamp(12px, 3vw, 18px) 20px', fontFamily: 'sans-serif', overflowX: 'clip' }}>
      <p style={{ margin: '0 0 6px 0' }}>
        <Link href="/" style={{ textDecoration: 'none', fontWeight: 600 }}>← Community Board</Link>
      </p>
      <h1 style={{ marginTop: 0, marginBottom: 12 }}>Browse Posters</h1>
      <div className="browse-layout" style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: 12, alignItems: 'start' }}>
        <section style={{ ...uiStyles.panel, padding: 10, display: 'grid', gap: 10 }}>
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
          <div style={{ display: 'grid', gap: 8, maxHeight: 'min(55vh, 520px)', overflow: 'auto' }}>
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
                  ...uiStyles.itemCard,
                  ...(activePosterId === poster.id ? uiStyles.itemCardSelected : {}),
                  padding: uiTokens.spacing[2],
                  textAlign: 'left' as const,
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
                  <div style={{ fontSize: uiTokens.typography.label }}>{poster.seen_at_name || 'Unknown seen at'}</div>
                  <div style={{ fontSize: uiTokens.typography.selectedPill, color: uiTokens.colors.muted, marginTop: 2 }}>Captured: {formatCaptureHour(poster.created_at)}</div>
                  <div style={{ fontSize: uiTokens.typography.selectedPill, color: uiTokens.colors.muted, marginTop: 2 }}>Items: {poster.item_count}</div>
                  <div style={{ fontSize: uiTokens.typography.selectedPill, color: uiTokens.colors.muted, marginTop: 2 }}>Status: {poster.status || 'uploaded'}</div>
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
      <style jsx>{`
        @media (max-width: 980px) {
          .browse-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  )
}
