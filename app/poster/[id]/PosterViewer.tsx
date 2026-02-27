'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ensureCbVid } from '@/lib/viewer-id'

type Pin = {
  link_id: string
  event_id: string
  title: string
  start_at: string
  location: string | null
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

  const validPins = useMemo(() => pins.filter((p) => p.bbox), [pins])
  const selectedPin = useMemo(() => {
    if (selectedEventId) {
      return validPins.find((pin) => pin.event_id === selectedEventId) || null
    }
    return validPins[0] || null
  }, [selectedEventId, validPins])

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

  function selectPin(pin: Pin) {
    setSelectedEventId(pin.event_id)
    router.push(`?event_id=${encodeURIComponent(pin.event_id)}`)
  }

  function centerOnPin(pin: Pin, targetZoom = Math.max(1.8, zoom)) {
    if (!pin.bbox) return
    const panX = stageMetrics.stageW / 2 - (stageMetrics.offsetX + pin.bbox.x * stageMetrics.baseW) * targetZoom
    const panY = stageMetrics.stageH / 2 - (stageMetrics.offsetY + pin.bbox.y * stageMetrics.baseH) * targetZoom
    setZoom(Number(targetZoom.toFixed(2)))
    setPan({ x: Number(panX.toFixed(1)), y: Number(panY.toFixed(1)) })
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
    setZoom(Number(targetZoom.toFixed(2)))
    setPan({ x: Number(panX.toFixed(1)), y: Number(panY.toFixed(1)) })
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
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 420px',
        gap: 20,
        alignItems: 'start',
      }}
    >
      <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 10, minWidth: 0 }}>
        <a
          href={browseHref}
          style={{
            display: 'inline-block',
            marginBottom: 8,
            fontSize: 14,
            color: '#1d4ed8',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          ← Browse posters
        </a>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <button data-variant="secondary" onClick={() => setZoom((z) => clamp(Number((z - 0.2).toFixed(2)), 1, 5))}>Zoom -</button>
          <button data-variant="secondary" onClick={() => setZoom((z) => clamp(Number((z + 0.2).toFixed(2)), 1, 5))}>Zoom +</button>
          <button data-variant="secondary" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Reset</button>
          <button data-variant="secondary" onClick={fitToPins} disabled={validPins.length === 0}>Fit to pins</button>
          <button data-variant="secondary" onClick={() => selectedPin && centerOnPin(selectedPin)} disabled={!selectedPin}>Center selected</button>
        </div>

        <div
          ref={stageRef}
          onMouseDown={(e) => { dragRef.current = { x: e.clientX, y: e.clientY } }}
          onMouseMove={(e) => {
            if (!dragRef.current) return
            const dx = e.clientX - dragRef.current.x
            const dy = e.clientY - dragRef.current.y
            setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
            dragRef.current = { x: e.clientX, y: e.clientY }
          }}
          onMouseUp={() => { dragRef.current = null }}
          onMouseLeave={() => { dragRef.current = null }}
          style={{
            position: 'relative',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            overflow: 'hidden',
            height: 'min(70vh, 720px)',
            minHeight: 480,
            aspectRatio: '16 / 9',
            background: '#f8fafc',
          }}
        >
          {imageUrl ? (
            <div style={{ position: 'absolute', inset: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top left' }}>
              <img
                src={imageUrl}
                alt="Poster"
                onLoad={(e) => {
                  setImageNatural({
                    width: Math.max(1, e.currentTarget.naturalWidth || 1),
                    height: Math.max(1, e.currentTarget.naturalHeight || 1),
                  })
                  setLoadError('')
                  console.info('[PosterViewer] image loaded', imageUrl)
                }}
                onError={(e) => {
                  console.error('[PosterViewer] image failed', imageUrl, e.currentTarget.src)
                  if (imageIndex < imageUrls.length - 1) {
                    setImageIndex((prev) => prev + 1)
                    return
                  }
                  setAllFailed(true)
                  setLoadError('Failed to load poster image.')
                }}
                draggable={false}
                style={{
                  position: 'absolute',
                  left: `${stageMetrics.offsetX}px`,
                  top: `${stageMetrics.offsetY}px`,
                  width: `${stageMetrics.baseW}px`,
                  height: `${stageMetrics.baseH}px`,
                  objectFit: 'contain',
                  display: 'block',
                  userSelect: 'none',
                }}
              />
              {validPins.map((pin) => {
                const active = selectedEventId === pin.event_id
                return (
                  <button
                    key={pin.link_id}
                    type="button"
                    title={pin.title}
                    onClick={(e) => {
                      e.stopPropagation()
                      selectPin(pin)
                    }}
                    style={{
                      position: 'absolute',
                      left: `${stageMetrics.offsetX + pin.bbox!.x * stageMetrics.baseW}px`,
                      top: `${stageMetrics.offsetY + pin.bbox!.y * stageMetrics.baseH}px`,
                      transform: 'translate(-50%, -50%)',
                      width: active ? 18 : 12,
                      height: active ? 18 : 12,
                      borderRadius: 999,
                      background: active ? '#ef4444' : '#22c55e',
                      border: '2px solid #fff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                      cursor: 'pointer',
                    }}
                  />
                )
              })}
            </div>
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#6b7280', padding: 12, textAlign: 'center' }}>
              {loadError || 'Poster image unavailable for this record.'}
            </div>
          )}
        </div>
      </section>

      <aside style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0 }}>Inspector</h2>
        <div style={{ fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
          <div><strong>Photo taken:</strong> {formatPhotoTakenHour(photoTakenAt)}</div>
          {seenAt ? (
            <div>
              <strong>Seen at:</strong>{' '}
              {seenAtHref ? (
                <a href={seenAtHref} style={{ color: '#1d4ed8', textDecoration: 'none' }}>{seenAt}</a>
              ) : seenAt}
            </div>
          ) : null}
          <div><strong>Items:</strong> {validPins.length}</div>
        </div>

        {selectedPin ? (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <strong>{selectedPin.title || '(Untitled)'}</strong>
              <span style={{ fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 999, padding: '2px 8px' }}>
                {(selectedPin.item_type || 'event').replace(/_/g, ' ')}
              </span>
            </div>
            {selectedPin.start_at ? <div style={{ fontSize: 13, marginTop: 6 }}>{new Date(selectedPin.start_at).toLocaleString()}</div> : null}
            {selectedPin.location ? <div style={{ fontSize: 13, marginTop: 4 }}>Location: {selectedPin.location}</div> : null}
            <div style={{ marginTop: 8 }}>
              <button
                data-variant="secondary"
                onClick={() => toggleUpvote(selectedPin)}
              >
                {(pinVotes[selectedPin.event_id]?.did_upvote ? 'Upvoted' : 'Upvote')} · {pinVotes[selectedPin.event_id]?.upvote_count ?? selectedPin.upvote_count ?? 0}
              </button>
            </div>
            {isCalendarType(selectedPin.item_type) && selectedPin.start_at ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <a
                  href={toGoogleCalendarUrl({ title: selectedPin.title, start_at: selectedPin.start_at, location: selectedPin.location })}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-block', padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', textDecoration: 'none', color: '#111827', fontWeight: 600 }}
                >
                  Add to Google Calendar
                </a>
                <a
                  href={`/api/items/${encodeURIComponent(selectedPin.event_id)}/ics`}
                  style={{ display: 'inline-block', padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', textDecoration: 'none', color: '#111827', fontWeight: 600 }}
                >
                  Download .ics
                </a>
              </div>
            ) : null}
          </div>
        ) : (
          <p style={{ margin: 0, opacity: 0.75 }}>Select an item pin.</p>
        )}

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
          <strong style={{ display: 'block', marginBottom: 6 }}>Items on this poster</strong>
          <div style={{ display: 'grid', gap: 6, maxHeight: 260, overflow: 'auto' }}>
            {validPins.map((pin) => (
              <button
                key={pin.link_id}
                type="button"
                onClick={() => selectPin(pin)}
                style={{
                  textAlign: 'left',
                  padding: 8,
                  borderRadius: 8,
                  border: selectedEventId === pin.event_id ? '2px solid #ef4444' : '1px solid #e5e7eb',
                  background: '#fff',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{pin.title || '(Untitled)'}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  {(pin.item_type || 'event').replace(/_/g, ' ')}
                </div>
              </button>
            ))}
            {validPins.length === 0 ? <p style={{ margin: 0, opacity: 0.75 }}>No items pinned.</p> : null}
          </div>
        </div>
      </aside>
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
