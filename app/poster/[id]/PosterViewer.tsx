'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ensureCbVid } from '@/lib/viewer-id'
import { eventStatusLabel } from '@/lib/statuses'
import PosterMetaStrip from '@/app/components/poster/PosterMetaStrip'
import PosterItemsList from '@/app/components/poster/PosterItemsList'
import ItemCard from '@/app/components/poster/ItemCard'
import PosterControls from '@/app/components/poster/PosterControls'
import PosterStage from '@/app/components/poster/PosterStage'
import { uiStyles, uiTokens } from '@/lib/uiTokens'

type Pin = {
  link_id: string
  event_id: string
  title: string
  start_at: string
  location: string | null
  status?: string | null
  item_type?: string | null
  upvote_count?: number
  did_upvote?: boolean
  bbox: { x: number; y: number } | null
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function isCalendarType(type?: string | null) {
  const value = (type || 'event').toLowerCase()
  return value === 'event' || value === 'recurring_event' || value === 'class_program'
}

function pinStatusLabel(value?: string | null) {
  return eventStatusLabel(value || 'draft')
}

function formatPhotoTakenHour(value?: string | null) {
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

function toGoogleCalendarUrl({
  title,
  start_at,
  location,
}: {
  title: string
  start_at: string
  location?: string | null
}) {
  const start = new Date(start_at)
  const end = new Date(start.getTime() + 90 * 60 * 1000)
  const toGoogleDate = (value: Date) => value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Event',
    dates: `${toGoogleDate(start)}/${toGoogleDate(end)}`,
    details: '',
    location: location || '',
    ctz: 'America/New_York',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export default function PosterViewer({
  imageUrls,
  pins,
  activeEventId,
  photoTakenAt,
  seenAt,
  browseHref = '/browse',
  seenAtHref = '',
}: {
  imageUrls: string[]
  pins: Pin[]
  activeEventId: string | null
  photoTakenAt?: string | null
  seenAt?: string | null
  browseHref?: string
  seenAtHref?: string
}) {
  const router = useRouter()
  const stageRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const [stageSize, setStageSize] = useState({ width: 1, height: 1 })
  const [imageNatural, setImageNatural] = useState({ width: 1, height: 1 })
  const [imageIndex, setImageIndex] = useState(0)
  const [allFailed, setAllFailed] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => activeEventId || null)
  const [pinVotes, setPinVotes] = useState<Record<string, { upvote_count: number; did_upvote: boolean }>>({})
  const hasAutoCenteredRef = useRef(false)
  const [schemaStatus, setSchemaStatus] = useState('')
  const compactControlButtonStyle = { padding: '6px 10px' }

  useEffect(() => {
    if (!stageRef.current) return
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (!box) return
      setStageSize({
        width: Math.max(1, box.width),
        height: Math.max(1, box.height),
      })
    })
    observer.observe(stageRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch('/api/health/schema')
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.ok) setSchemaStatus('Schema OK')
        else {
          const missing = Array.isArray(data?.missing) ? data.missing.join(', ') : 'poster_uploads.seen_at_name'
          setSchemaStatus(`Schema missing: ${missing} (run migration)`)
        }
      } catch {
        if (!cancelled) setSchemaStatus('Schema check unavailable')
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  const validPins = useMemo(
    () => pins.filter((p): p is Pin & { bbox: { x: number; y: number } } => Boolean(p.bbox)),
    [pins],
  )
  const selectedPin = useMemo(() => {
    if (selectedEventId) {
      return pins.find((pin) => pin.event_id === selectedEventId) || null
    }
    return pins[0] || null
  }, [selectedEventId, pins])
  const orderedPins = useMemo(() => [...pins], [pins])

  const imageUrl = allFailed ? '' : (imageUrls[imageIndex] || imageUrls[0] || '')

  const stageMetrics = useMemo(() => {
    const stageW = stageSize.width || 1
    const stageH = stageSize.height || 1
    const naturalRatio = imageNatural.width / Math.max(1, imageNatural.height)
    const stageRatio = stageW / stageH
    let baseW = stageW
    let baseH = stageH
    if (naturalRatio > stageRatio) {
      baseW = stageW
      baseH = stageW / naturalRatio
    } else {
      baseH = stageH
      baseW = stageH * naturalRatio
    }
    const offsetX = (stageW - baseW) / 2
    const offsetY = (stageH - baseH) / 2
    return { stageW, stageH, baseW, baseH, offsetX, offsetY }
  }, [stageSize, imageNatural])

  function clampPan(nextPan: { x: number; y: number }, nextZoom = zoom) {
    const renderedW = stageMetrics.baseW * nextZoom
    const renderedH = stageMetrics.baseH * nextZoom
    const offsetScaledX = stageMetrics.offsetX * nextZoom
    const offsetScaledY = stageMetrics.offsetY * nextZoom

    let clampedX = nextPan.x
    let clampedY = nextPan.y

    if (renderedW <= stageMetrics.stageW) {
      clampedX = (stageMetrics.stageW - renderedW) / 2 - offsetScaledX
    } else {
      const minX = stageMetrics.stageW - (offsetScaledX + renderedW)
      const maxX = -offsetScaledX
      clampedX = Math.max(minX, Math.min(maxX, clampedX))
    }

    if (renderedH <= stageMetrics.stageH) {
      clampedY = (stageMetrics.stageH - renderedH) / 2 - offsetScaledY
    } else {
      const minY = stageMetrics.stageH - (offsetScaledY + renderedH)
      const maxY = -offsetScaledY
      clampedY = Math.max(minY, Math.min(maxY, clampedY))
    }

    return { x: Number(clampedX.toFixed(1)), y: Number(clampedY.toFixed(1)) }
  }

  function selectPin(pin: Pin) {
    setSelectedEventId(pin.event_id)
    if (pin.bbox) centerOnPin(pin, Math.max(1.4, zoom))
    const params = new URLSearchParams(window.location.search)
    params.set('event_id', pin.event_id)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  function centerOnPin(pin: Pin, targetZoom = Math.max(1.8, zoom)) {
    if (!pin.bbox) return
    const panX = stageMetrics.stageW / 2 - (stageMetrics.offsetX + pin.bbox.x * stageMetrics.baseW) * targetZoom
    const panY = stageMetrics.stageH / 2 - (stageMetrics.offsetY + pin.bbox.y * stageMetrics.baseH) * targetZoom
    const normalizedZoom = Number(targetZoom.toFixed(2))
    setZoom(normalizedZoom)
    setPan(clampPan({ x: Number(panX.toFixed(1)), y: Number(panY.toFixed(1)) }, normalizedZoom))
  }

  function fitToPins() {
    if (validPins.length === 0) return
    if (validPins.length === 1) {
      centerOnPin(validPins[0], 1.6)
      return
    }
    const points = validPins.map((pin) => pin.bbox!)
    const minX = Math.min(...points.map((p) => p.x))
    const minY = Math.min(...points.map((p) => p.y))
    const maxX = Math.max(...points.map((p) => p.x))
    const maxY = Math.max(...points.map((p) => p.y))
    const padding = 0.08
    const boxW = Math.max(0.05, Math.min(1, maxX - minX + padding * 2))
    const boxH = Math.max(0.05, Math.min(1, maxY - minY + padding * 2))
    const targetZoom = clamp(
      Math.min(stageMetrics.stageW / (boxW * stageMetrics.baseW), stageMetrics.stageH / (boxH * stageMetrics.baseH)),
      1,
      5,
    )
    const centerX = clamp(minX + (maxX - minX) / 2, 0, 1)
    const centerY = clamp(minY + (maxY - minY) / 2, 0, 1)
    const panX = stageMetrics.stageW / 2 - (stageMetrics.offsetX + centerX * stageMetrics.baseW) * targetZoom
    const panY = stageMetrics.stageH / 2 - (stageMetrics.offsetY + centerY * stageMetrics.baseH) * targetZoom
    const normalizedZoom = Number(targetZoom.toFixed(2))
    setZoom(normalizedZoom)
    setPan(clampPan({ x: Number(panX.toFixed(1)), y: Number(panY.toFixed(1)) }, normalizedZoom))
  }

  async function toggleUpvote(pin: Pin) {
    const state = pinVotes[pin.event_id] || { upvote_count: Number(pin.upvote_count || 0), did_upvote: Boolean(pin.did_upvote) }
    const method = state.did_upvote ? 'DELETE' : 'POST'
    const viewerId = ensureCbVid()
    const res = await fetch(`/api/items/${encodeURIComponent(pin.event_id)}/upvote`, {
      method,
      headers: { 'x-cb-vid': viewerId },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return
    setPinVotes((prev) => ({
      ...prev,
      [pin.event_id]: {
        upvote_count: Number(data.upvotes || 0),
        did_upvote: Boolean(data.votedByMe),
      },
    }))
  }

  return (
    <div
      className="poster-view-grid"
      data-testid="poster-view-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 420px',
        gap: 12,
        alignItems: 'stretch',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'clip',
      }}
    >{/* E2E nav guardrails (keep labels stable) */}
<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '8px 0 12px' }}>
  <a href="/" aria-label="← Return to Community Board">← Return to Community Board</a>
  <a href="/browse" aria-label="← Browse posters">← Browse posters</a>
</div>

      <div style={{ minWidth: 0, display: 'grid', gap: 8, alignContent: 'start' }}>
      <section
        style={{
          ...uiStyles.panel,
          padding: uiTokens.spacing[2],
          minWidth: 0,
          overflow: 'hidden',
          minHeight: 'clamp(560px, 78vh, 920px)',
          height: '100%',
          display: 'grid',
          gridTemplateRows: 'auto 1fr',
          gap: 6,
        }}
      >
        {process.env.NODE_ENV !== 'production' && schemaStatus ? (
          <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>{schemaStatus}</p>
        ) : null}
        <PosterMetaStrip
          items={[
            { label: 'Captured', value: formatPhotoTakenHour(photoTakenAt) },
            {
              label: 'Seen at',
              value: seenAt
                ? seenAtHref
                  ? <a href={seenAtHref} style={{ color: '#1d4ed8', textDecoration: 'none' }}>{seenAt}</a>
                  : seenAt
                : '—',
            },
            { label: 'Status', value: selectedPin ? pinStatusLabel(selectedPin.status) : '—' },
          ]}
        />
        <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 6, minHeight: 0 }}>
          <PosterControls style={{ gap: uiTokens.spacing[1] }}>
            <button data-variant="secondary" onClick={() => {
            const nextZoom = clamp(Number((zoom - 0.2).toFixed(2)), 1, 5)
            if (selectedPin) centerOnPin(selectedPin, nextZoom)
            else setZoom(nextZoom)
          }} style={compactControlButtonStyle}>Zoom -</button>
          <button data-variant="secondary" onClick={() => {
            const nextZoom = clamp(Number((zoom + 0.2).toFixed(2)), 1, 5)
            if (selectedPin) centerOnPin(selectedPin, nextZoom)
            else setZoom(nextZoom)
          }} style={compactControlButtonStyle}>Zoom +</button>
          <button data-variant="secondary" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} style={compactControlButtonStyle}>Reset</button>
          <button data-variant="secondary" onClick={fitToPins} disabled={validPins.length === 0} style={compactControlButtonStyle}>Fit to pinned items</button>
            <button data-variant="secondary" onClick={() => selectedPin && centerOnPin(selectedPin)} disabled={!selectedPin} style={compactControlButtonStyle}>Center selected</button>
          </PosterControls>
          <PosterStage
            stageRef={stageRef}
            imageUrl={imageUrl}
            loadError={loadError}
            pan={pan}
            zoom={zoom}
            stageMetrics={stageMetrics}
            pins={validPins}
            selectedEventId={selectedEventId}
            onStageMouseDown={(e) => { dragRef.current = { x: e.clientX, y: e.clientY } }}
            onStageMouseMove={(e) => {
              if (!dragRef.current) return
              const dx = e.clientX - dragRef.current.x
              const dy = e.clientY - dragRef.current.y
              setPan((prev) => clampPan({ x: prev.x + dx, y: prev.y + dy }))
              dragRef.current = { x: e.clientX, y: e.clientY }
            }}
            onStageMouseUp={() => { dragRef.current = null }}
            onStageMouseLeave={() => { dragRef.current = null }}
            onImageLoad={(e) => {
              setImageNatural({
                width: Math.max(1, e.currentTarget.naturalWidth || 1),
                height: Math.max(1, e.currentTarget.naturalHeight || 1),
              })
              setLoadError('')
              console.info('[PosterViewer] image loaded', imageUrl)
              if (!hasAutoCenteredRef.current && selectedPin?.bbox) {
                hasAutoCenteredRef.current = true
                centerOnPin(selectedPin, Math.max(1.4, zoom))
              }
            }}
            onImageError={(e) => {
              console.error('[PosterViewer] image failed', imageUrl, e.currentTarget.src)
              if (imageIndex < imageUrls.length - 1) {
                setImageIndex((prev) => prev + 1)
                return
              }
              setAllFailed(true)
              setLoadError('Failed to load poster image.')
            }}
            onPinClick={(pin) => {
              const selected = validPins.find((candidate) => candidate.link_id === pin.link_id)
              if (selected) selectPin(selected)
            }}
          />
        </div>
      </section>
      <div style={{ border: uiTokens.border.soft, borderRadius: uiTokens.radius.md, padding: '6px 8px', background: uiTokens.colors.bgSubtle }}>
        <div style={{ fontSize: uiTokens.typography.body, fontWeight: 600, marginBottom: 2, color: uiTokens.colors.muted }}>Help tend this listing</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href="#help-identify-board"
            onClick={(event) => {
              event.preventDefault()
              window.dispatchEvent(new CustomEvent('cb-open-tag-picker', { detail: { eventId: selectedEventId || undefined } }))
              document.getElementById('help-identify-board')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            style={{ fontSize: uiTokens.typography.body, color: '#1d4ed8', textDecoration: 'none' }}
          >
            Suggest tags
          </a>
          <a
            href="#report-issue-placeholder"
            onClick={(event) => event.preventDefault()}
            title="Report issue flow coming soon"
            style={{ fontSize: uiTokens.typography.body, color: '#1d4ed8', textDecoration: 'none', opacity: 0.75 }}
          >
            Report issue
          </a>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginLeft: 2 }}>
        <a
          href={browseHref}
          style={{
            display: 'inline-block',
            fontSize: 14,
            color: '#1d4ed8',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          ← Browse posters
        </a>
      </div>
      </div>

      <aside
        style={{
          ...uiStyles.panel,
          display: 'grid',
          gap: 10,
          minHeight: 'clamp(560px, 78vh, 920px)',
          height: '100%',
          gridTemplateRows: 'auto 1fr',
        }}
      >
        <div style={{ display: 'grid', gap: 2 }}>
          <h2 className="cb-section-header">Other items on this poster</h2>
          <p style={{ margin: 0, fontSize: uiTokens.typography.helper, color: uiTokens.colors.muted }}>Tap an item to center its pin.</p>
        </div>
        <PosterItemsList title="" maxHeight={10000}>
          {orderedPins.map((pin) => (
            <ItemCard
              key={pin.link_id}
              onClick={() => selectPin(pin)}
              selected={selectedEventId === pin.event_id}
              testId={`poster-item-${pin.event_id}`}
              title={pin.title?.trim() || '(Untitled item)'}
              typeLabel={(pin.item_type || 'event').replace(/_/g, ' ')}
              subtitle={pin.start_at ? new Date(pin.start_at).toLocaleString() : 'No date/time'}
              location={pin.location ? `Location: ${pin.location}` : 'Location: —'}
              status={pinStatusLabel(pin.status)}
            >
              <div>
                <button
                  data-variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleUpvote(pin)
                  }}
                >
                  {(pinVotes[pin.event_id]?.did_upvote ? 'Pinned' : 'Pin to board')} · {pinVotes[pin.event_id]?.upvote_count ?? pin.upvote_count ?? 0}
                </button>
              </div>

              {isCalendarType(pin.item_type) && pin.start_at ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a
                    href={toGoogleCalendarUrl({ title: pin.title, start_at: pin.start_at, location: pin.location })}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: 'inline-block', padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', textDecoration: 'none', color: '#111827', fontWeight: 600 }}
                  >
                    Add to Google Calendar
                  </a>
                  <a
                    href={`/api/items/${encodeURIComponent(pin.event_id)}/ics`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: 'inline-block', padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', textDecoration: 'none', color: '#111827', fontWeight: 600 }}
                  >
                    Download .ics
                  </a>
                </div>
              ) : null}
            </ItemCard>
          ))}
          {orderedPins.length === 0 ? <p style={{ margin: 0, color: uiTokens.colors.muted }}>No items pinned yet.</p> : null}
        </PosterItemsList>
      </aside>
      <div id="report-issue-placeholder" style={{ display: 'none' }} />
      <style jsx>{`
        @media (max-width: 980px) {
          .poster-view-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
