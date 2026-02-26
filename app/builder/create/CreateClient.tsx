'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { EVENT_STATUSES, POSTER_STATUSES, normalizeEventStatus, normalizePosterStatus } from '@/lib/statuses'

type Upload = {
  id: string
  created_at: string
  status: string
  public_url?: string
  seen_at_name?: string | null
  is_done?: boolean
  event_count: number
  linked_count?: number
}

type PosterEventRow = {
  link_id: string
  bbox: { x: number; y: number } | null
  created_at: string
  event: {
    id: string
    title: string
    location: string | null
    description?: string | null
    start_at: string
    status: string
    is_recurring?: boolean | null
    recurrence_rule?: string | null
  }
}

function defaultStartAt2pmLocal() {
  const d = new Date()
  d.setHours(14, 0, 0, 0)
  const offsetMs = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16)
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return defaultStartAt2pmLocal()
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return defaultStartAt2pmLocal()
  const offsetMs = dt.getTimezoneOffset() * 60_000
  return new Date(dt.getTime() - offsetMs).toISOString().slice(0, 16)
}

function statusLabel(statusValue: string) {
  const normalized = normalizeEventStatus(statusValue, EVENT_STATUSES.DRAFT)
  if (normalized === EVENT_STATUSES.PLANTED) return 'Recently planted'
  if (normalized === EVENT_STATUSES.PUBLISHED) return 'Published'
  if (normalized === EVENT_STATUSES.UNPUBLISHED) return 'Returned for revision'
  if (normalized === EVENT_STATUSES.DRAFT) return 'Draft'
  return statusValue
}

export default function BuilderCreatePage({
  initialPosterId,
  initialManualMode = false,
}: {
  initialPosterId: string | null
  initialManualMode?: boolean
}) {
  const manualMode = initialManualMode
  const posterUploadFromQuery = initialPosterId

  const [uploads, setUploads] = useState<Upload[]>([])
  const [selectedPosterId, setSelectedPosterId] = useState<string | null>(null)
  const selectedUpload = useMemo(() => uploads.find((u) => u.id === selectedPosterId) || null, [uploads, selectedPosterId])
  const [rows, setRows] = useState<PosterEventRow[]>([])
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)

  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [startAt, setStartAt] = useState(defaultStartAt2pmLocal())
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceRule, setRecurrenceRule] = useState('')
  const [seenAtName, setSeenAtName] = useState('')
  const [eventStatus, setEventStatus] = useState<'draft' | 'published' | 'planted' | 'unpublished'>(EVENT_STATUSES.DRAFT)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadingPoster, setUploadingPoster] = useState(false)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const stageRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [imageNatural, setImageNatural] = useState({ width: 1, height: 1 })
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const didDragRef = useRef(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'unlink' | 'delete_with_events'>('unlink')
  const [deletingPoster, setDeletingPoster] = useState(false)
  const [savingSeenAt, setSavingSeenAt] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadUploads() {
    const res = await fetch('/api/manage/list-uploads-with-counts')
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(data?.error || 'Failed to load posters')
    setUploads((data.uploads || []) as Upload[])
  }

  async function loadRows(uploadId: string | null) {
    if (!uploadId) {
      setRows([])
      return
    }
    const res = await fetch(`/api/manage/poster-events?poster_upload_id=${encodeURIComponent(uploadId)}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(data?.error || 'Failed to load events on poster')
    setRows((data.rows || []) as PosterEventRow[])
  }

  useEffect(() => {
    loadUploads()
  }, [])

  useEffect(() => {
    if (!posterUploadFromQuery || selectedPosterId) return
    const exists = uploads.find((u) => u.id === posterUploadFromQuery)
    if (exists) {
      selectPoster(posterUploadFromQuery)
    }
  }, [posterUploadFromQuery, selectedPosterId, uploads])

  useEffect(() => {
    if (!manualMode) return
    try {
      const savedSeenAt = window.localStorage.getItem('submit_seen_at_name') || ''
      if (savedSeenAt && !seenAtName) setSeenAtName(savedSeenAt)
    } catch {
      // ignore localStorage failures
    }
  }, [manualMode, seenAtName])

  async function goToNextUntendedPoster() {
    const res = await fetch('/api/builder/next-poster')
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(data?.error || 'Failed to load next poster')
    const nextId = data?.poster?.id as string | undefined
    if (!nextId) return setMessage('No untended posters in queue.')
    await loadUploads()
    await selectPoster(nextId)
  }

  async function selectPoster(posterId: string) {
    const upload = uploads.find((u) => u.id === posterId) || null
    setSelectedPosterId(posterId)
    setError('')
    setMessage('')
    setActiveLinkId(null)
    setEditingEventId(null)
    setPoint(null)
    setTitle('')
    setLocation('')
    setDescription('')
    setStartAt(defaultStartAt2pmLocal())
    setIsRecurring(false)
    setRecurrenceRule('')
    setEventStatus(EVENT_STATUSES.DRAFT)
    setSeenAtName(upload?.seen_at_name || '')
    setZoom(1)
    setPan({ x: 0, y: 0 })
    await loadRows(posterId)
  }

  function startEdit(row: PosterEventRow) {
    setEditingEventId(row.event.id)
    setActiveLinkId(row.link_id)
    setPoint(null)
    setTitle(row.event.title || '')
    setLocation(row.event.location || '')
    setDescription(row.event.description || '')
    setStartAt(toDateTimeLocal(row.event.start_at))
    setEventStatus(normalizeEventStatus(row.event.status, EVENT_STATUSES.DRAFT))
    setIsRecurring(Boolean(row.event.is_recurring))
    setRecurrenceRule(row.event.recurrence_rule || '')
    setSeenAtName(selectedUpload?.seen_at_name || '')
  }

  function resetFormToNew() {
    setEditingEventId(null)
    setActiveLinkId(null)
    setTitle('')
    setLocation('')
    setDescription('')
    setStartAt(defaultStartAt2pmLocal())
    setIsRecurring(false)
    setRecurrenceRule('')
    setEventStatus(EVENT_STATUSES.DRAFT)
  }

  async function saveSeenAt() {
    if (!selectedPosterId || !seenAtName.trim()) return true
    setSavingSeenAt(true)
    try {
      const res = await fetch('/api/manage/update-poster', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poster_upload_id: selectedPosterId,
          seen_at_name: seenAtName,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Failed to save Seen at')
        return false
      }
      try {
        window.localStorage.setItem('submit_seen_at_name', seenAtName.trim())
      } catch {
        // ignore localStorage failures
      }
      await loadUploads()
      return true
    } finally {
      setSavingSeenAt(false)
    }
  }

  async function saveEvent() {
    setError('')
    setMessage('')
    if (!title.trim()) return setError('Title is required.')
    if (!startAt.trim()) return setError('Start time is required.')
    if (!selectedPosterId && !manualMode) return setError('Select a poster first.')

    setSaving(true)
    try {
      if (editingEventId) {
        const res = await fetch('/api/builder/update-event', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: editingEventId,
            title,
            location,
            description,
            start_at: startAt,
            is_recurring: isRecurring,
            recurrence_rule: isRecurring ? recurrenceRule : null,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return setError(data?.error || 'Failed to update event')
        setMessage('Updated.')
        await loadRows(selectedPosterId)
        await loadUploads()
        return
      }

      if (!selectedPosterId) {
        const manualRes = await fetch('/api/submit/manual-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            location,
            description,
            start_at: startAt,
            is_recurring: isRecurring,
            recurrence_rule: isRecurring ? recurrenceRule : null,
            status: eventStatus,
          }),
        })
        const manualData = await manualRes.json().catch(() => ({}))
        if (!manualRes.ok) return setError(manualData?.error || 'Failed to create draft event')
        setMessage('Saved as draft.')
        resetFormToNew()
        return
      }

      if (!point) return setError('Click image to place a pin for new event.')
      const res = await fetch('/api/builder/create-event-from-poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poster_upload_id: selectedPosterId,
          bbox: point,
          title,
          location,
          description,
          start_at: startAt,
          status: eventStatus,
          is_recurring: isRecurring,
          recurrence_rule: isRecurring ? recurrenceRule : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return setError(data?.error || 'Failed to create event')
      setMessage('Saved.')
      setPoint(null)
      resetFormToNew()
      await loadRows(selectedPosterId)
      await loadUploads()
    } finally {
      setSaving(false)
    }
  }

  async function uploadFromCreate() {
    if (!uploadFile) return
    setUploadingPoster(true)
    setError('')
    setMessage('')
    try {
      const form = new FormData()
      form.append('file', uploadFile)
      if (seenAtName.trim()) form.append('seen_at_name', seenAtName.trim())
      const res = await fetch('/api/submit/upload', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return setError(data?.error || 'Upload failed')
      const newPosterId = String(data?.poster_upload_id || data?.id || '').trim()
      if (!newPosterId) return setError('Upload succeeded but missing poster ID')
      setMessage('Poster uploaded.')
      setUploadFile(null)
      if (uploadInputRef.current) uploadInputRef.current.value = ''
      await loadUploads()
      await selectPoster(newPosterId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingPoster(false)
    }
  }

  async function deleteEventRow(row: PosterEventRow) {
    const choice = prompt('Type "unlink" to remove only this pin link, or "cascade" to delete link + event.', 'unlink')
    if (!choice) return
    const mode = choice.trim().toLowerCase()
    if (mode !== 'unlink' && mode !== 'cascade') return setError('Delete cancelled. Use unlink or cascade.')
    if (!confirm(mode === 'cascade' ? 'Delete link and event?' : 'Remove link only?')) return

    setError('')
    const res = await fetch('/api/builder/delete-poster-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link_id: row.link_id, mode }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(data?.error || 'Delete failed')
    if (editingEventId === row.event.id) resetFormToNew()
    setPoint(null)
    await loadRows(selectedPosterId)
    await loadUploads()
  }

  async function markDone() {
    if (!selectedPosterId) return
    const res = await fetch('/api/builder/mark-upload-done', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poster_upload_id: selectedPosterId, is_done: true }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(data?.error || 'Failed to mark done')
    setSelectedPosterId(null)
    setRows([])
    await loadUploads()
  }

  function getStageMetrics() {
    const stage = stageRef.current
    if (!stage) return null
    const stageW = stage.clientWidth || 1
    const stageH = stage.clientHeight || 1
    const baseW = stageW
    const baseH = Math.max(1, stageW * (imageNatural.height / imageNatural.width))
    return { stageW, stageH, baseW, baseH }
  }

  function centerOnPoint(pointToCenter: { x: number; y: number }, targetZoom = zoom) {
    const m = getStageMetrics()
    if (!m) return
    const panX = m.stageW / 2 - pointToCenter.x * m.baseW * targetZoom
    const panY = m.stageH / 2 - pointToCenter.y * m.baseH * targetZoom
    setZoom(Number(targetZoom.toFixed(2)))
    setPan({ x: Number(panX.toFixed(1)), y: Number(panY.toFixed(1)) })
  }

  function fitToPins() {
    const pins = rows.filter((row) => row.bbox).map((row) => row.bbox!)
    if (pins.length === 0) return
    if (pins.length === 1) {
      centerOnPoint(pins[0], Math.max(1.6, zoom))
      return
    }

    const m = getStageMetrics()
    if (!m) return
    const minX = Math.min(...pins.map((p) => p.x))
    const minY = Math.min(...pins.map((p) => p.y))
    const maxX = Math.max(...pins.map((p) => p.x))
    const maxY = Math.max(...pins.map((p) => p.y))

    const paddingX = 0.08
    const paddingY = 0.08
    const startX = Math.max(0, minX - paddingX)
    const startY = Math.max(0, minY - paddingY)
    const boxWidth = Math.max(0.04, Math.min(1, maxX - minX + paddingX * 2))
    const boxHeight = Math.max(0.04, Math.min(1, maxY - minY + paddingY * 2))

    const boxWpx = boxWidth * m.baseW
    const boxHpx = boxHeight * m.baseH
    const targetZoom = Math.max(1, Math.min(5, Math.min(m.stageW / boxWpx, m.stageH / boxHpx)))
    const centerPoint = {
      x: Math.min(1, startX + boxWidth / 2),
      y: Math.min(1, startY + boxHeight / 2),
    }
    centerOnPoint(centerPoint, targetZoom)
  }

  function centerOnActivePin() {
    const active = rows.find((row) => row.link_id === activeLinkId && row.bbox)?.bbox || point
    if (!active) return
    centerOnPoint(active, Math.max(1.8, zoom))
  }

  async function deletePoster(mode: 'unlink' | 'delete_with_events') {
    if (!selectedPosterId) return
    setDeletingPoster(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/manage/delete-poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poster_upload_id: selectedPosterId, mode }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return setError(data?.error || 'Failed to delete poster')

      setDeleteModalOpen(false)
      setSelectedPosterId(null)
      setRows([])
      setActiveLinkId(null)
      setEditingEventId(null)
      setPoint(null)
      setMessage(mode === 'delete_with_events' ? 'Poster and linked events deleted.' : 'Poster deleted. Linked events were unlinked.')
      await loadUploads()
    } finally {
      setDeletingPoster(false)
    }
  }

  async function handleDeletePosterClick() {
    if (!selectedUpload) return
    const linkedCount = selectedUpload.linked_count ?? selectedUpload.event_count ?? 0
    if (linkedCount === 0) {
      if (!confirm('Delete this poster?')) return
      await deletePoster('unlink')
      return
    }
    setDeleteMode('unlink')
    setDeleteModalOpen(true)
  }

  return (
    <main style={{ padding: 16, fontFamily: 'sans-serif', display: 'grid', gridTemplateColumns: '320px 1fr 420px', gap: 12, minHeight: '90vh' }}>
      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 10, overflow: 'auto' }}>
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>Submissions</h1>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, marginBottom: 8 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              data-variant="secondary"
              onClick={() => uploadInputRef.current?.click()}
              disabled={uploadingPoster}
            >
              {uploadFile ? 'Change photo' : 'Choose file'}
            </button>
            {uploadFile ? <div style={{ fontSize: 12, color: '#166534' }}>Photo selected</div> : null}
            <button onClick={uploadFromCreate} disabled={!uploadFile || uploadingPoster}>
              {uploadingPoster ? 'Uploading...' : 'Upload and select'}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button data-variant="secondary" onClick={goToNextUntendedPoster}>Next untended poster</button>
              <button data-variant="secondary" onClick={loadUploads}>Refresh</button>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {uploads.filter((u) => normalizePosterStatus(u.status) !== POSTER_STATUSES.DONE).map((u) => (
            <div key={u.id} style={{ border: selectedPosterId === u.id ? '2px solid #2563eb' : '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '76px 1fr auto', gap: 8, alignItems: 'start' }}>
                {u.public_url ? (
                  <img
                    src={u.public_url}
                    alt="Poster thumb"
                    style={{ width: 76, height: 76, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }}
                  />
                ) : (
                  <div style={{ width: 76, height: 76, borderRadius: 6, border: '1px solid #e5e7eb', background: '#f8fafc' }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12 }}>{new Date(u.created_at).toLocaleString()}</div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    {(normalizePosterStatus(u.status) === POSTER_STATUSES.DONE || u.is_done) ? 'Done' : 'Incomplete'} • status: {normalizePosterStatus(u.status)} • Linked: {u.linked_count ?? u.event_count ?? 0}
                  </div>
                  {!!u.seen_at_name && (
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Seen at: {u.seen_at_name}
                    </div>
                  )}
                </div>
                <button data-variant="secondary" onClick={() => selectPoster(u.id)}>
                  {selectedPosterId === u.id ? 'Selected' : 'Select'}
                </button>
              </div>
            </div>
          ))}
          {uploads.length === 0 && <p style={{ opacity: 0.7 }}>No incomplete posters.</p>}
        </div>
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <h2 style={{ marginTop: 0 }}>Poster workspace</h2>
        {!selectedUpload?.public_url && <p style={{ opacity: 0.7 }}>{manualMode ? 'Manual mode: no poster selected.' : 'Select a poster from the left list.'}</p>}
        {selectedUpload?.public_url && (
          <>
            <div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button data-variant="secondary" onClick={() => setZoom((z) => Math.max(1, Number((z - 0.2).toFixed(2))))}>Zoom out</button>
              <button data-variant="secondary" onClick={() => setZoom((z) => Math.min(5, Number((z + 0.2).toFixed(2))))}>Zoom in</button>
              <button data-variant="secondary" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Reset</button>
              <button data-variant="secondary" onClick={fitToPins} disabled={rows.filter((r) => r.bbox).length === 0}>Fit-to-pins</button>
              <button data-variant="secondary" onClick={centerOnActivePin} disabled={!activeLinkId && !point}>Center active pin</button>
            </div>
            <div
              ref={stageRef}
              onMouseDown={(e) => { dragRef.current = { x: e.clientX, y: e.clientY }; didDragRef.current = false }}
              onMouseMove={(e) => {
                if (!dragRef.current) return
                const dx = e.clientX - dragRef.current.x
                const dy = e.clientY - dragRef.current.y
                if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDragRef.current = true
                setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
                dragRef.current = { x: e.clientX, y: e.clientY }
              }}
              onMouseUp={() => { dragRef.current = null }}
              onMouseLeave={() => { dragRef.current = null }}
              style={{ position: 'relative', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', flex: 1, minHeight: 520 }}
            >
              <div style={{ position: 'relative', transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top left', width: '100%' }}>
                <img
                  ref={imageRef}
                  src={selectedUpload.public_url}
                  alt="Poster"
                  onLoad={(e) => {
                    setImageNatural({
                      width: Math.max(1, e.currentTarget.naturalWidth || 1),
                      height: Math.max(1, e.currentTarget.naturalHeight || 1),
                    })
                  }}
                  onClick={(e) => {
                    if (didDragRef.current) {
                      didDragRef.current = false
                      return
                    }
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = (e.clientX - rect.left) / rect.width
                    const y = (e.clientY - rect.top) / rect.height
                    setPoint({ x: Number(Math.max(0, Math.min(1, x)).toFixed(4)), y: Number(Math.max(0, Math.min(1, y)).toFixed(4)) })
                    setActiveLinkId(null)
                    setEditingEventId(null)
                    resetFormToNew()
                  }}
                  style={{ width: '100%', display: 'block' }}
                />
                {rows.filter((row) => row.bbox).map((row) => {
                  const active = activeLinkId === row.link_id
                  return (
                    <button
                      key={row.link_id}
                      type="button"
                      title={row.event.title}
                      onClick={(e) => {
                        e.stopPropagation()
                        startEdit(row)
                      }}
                      style={{
                        position: 'absolute',
                        left: `${row.bbox!.x * 100}%`,
                        top: `${row.bbox!.y * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        width: active ? 16 : 12,
                        height: active ? 16 : 12,
                        borderRadius: 999,
                        background: active ? '#ef4444' : '#22c55e',
                        border: '2px solid #fff',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                        cursor: 'pointer',
                      }}
                    />
                  )
                })}
                {!editingEventId && point && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${point.x * 100}%`,
                      top: `${point.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 14,
                      height: 14,
                      borderRadius: 999,
                      background: '#ef4444',
                      border: '2px solid #fff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                    }}
                  />
                )}
              </div>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button onClick={markDone}>Mark Done</button>
              <button data-variant="danger" onClick={handleDeletePosterClick}>Delete poster...</button>
            </div>
          </>
        )}
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 10, overflow: 'auto' }}>
        <h2 style={{ marginTop: 0 }}>Events on this poster</h2>
        {rows.length === 0 ? (
          <p style={{ opacity: 0.75 }}>No events yet. Click image to add a new pin and event.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {rows.map((row) => (
              <div key={row.link_id} style={{ border: activeLinkId === row.link_id ? '2px solid #ef4444' : '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                <div style={{ fontWeight: 600 }}>{row.event.title}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  {new Date(row.event.start_at).toLocaleString()} • {statusLabel(row.event.status)}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>linked: {new Date(row.created_at).toLocaleString()}</div>
                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                  <button data-variant="secondary" onClick={() => startEdit(row)}>Edit</button>
                  <button data-variant="danger" onClick={() => deleteEventRow(row)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h3 style={{ marginTop: 14 }}>{editingEventId ? 'Edit event' : 'Create event'}</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>New submissions are saved as draft and published later via approval workflow.</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          <select value={eventStatus} onChange={(e) => setEventStatus(e.target.value as 'draft' | 'published' | 'planted' | 'unpublished')} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
            <option value={EVENT_STATUSES.DRAFT}>draft</option>
            <option value={EVENT_STATUSES.PLANTED}>planted</option>
            <option value={EVENT_STATUSES.PUBLISHED}>published</option>
            <option value={EVENT_STATUSES.UNPUBLISHED}>unpublished</option>
          </select>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Description" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, resize: 'vertical' }} />
          <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          <label style={{ fontSize: 13, fontWeight: 600 }}>
            <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} /> Recurring
          </label>
          {isRecurring && (
            <input value={recurrenceRule} onChange={(e) => setRecurrenceRule(e.target.value)} placeholder="Recurrence rule" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          )}

          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
            <h4 style={{ margin: '0 0 6px 0' }}>Seen at</h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={seenAtName} onChange={(e) => setSeenAtName(e.target.value)} placeholder="Seen at" style={{ width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
              <button data-variant="secondary" type="button" onClick={saveSeenAt} disabled={!selectedPosterId || !seenAtName.trim() || savingSeenAt}>
                {savingSeenAt ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveEvent} disabled={saving || !title.trim()}>{saving ? 'Saving...' : editingEventId ? 'Save changes' : 'Create Draft Event'}</button>
            {(editingEventId || point) && <button data-variant="secondary" onClick={() => { resetFormToNew(); setPoint(null) }}>Cancel</button>}
          </div>
          {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
          {message && <p style={{ margin: 0 }}>{message}</p>}
        </div>
      </section>

      {deleteModalOpen && selectedUpload && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 50,
            padding: 16,
          }}
          onClick={() => !deletingPoster && setDeleteModalOpen(false)}
        >
          <div
            style={{ background: '#fff', width: '100%', maxWidth: 520, borderRadius: 12, border: '1px solid #e5e7eb', padding: 14 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 10px 0' }}>Delete poster</h3>
            <div style={{ fontSize: 14, marginBottom: 8 }}>
              <div>Created: {new Date(selectedUpload.created_at).toLocaleString()}</div>
              {selectedUpload.seen_at_name ? <div>Seen at: {selectedUpload.seen_at_name}</div> : null}
              <div>Linked events: {selectedUpload.linked_count ?? selectedUpload.event_count ?? 0}</div>
            </div>
            <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <input
                  type="radio"
                  name="delete_mode"
                  checked={deleteMode === 'unlink'}
                  onChange={() => setDeleteMode('unlink')}
                />
                <span>
                  <strong>Delete poster only</strong>
                  <br />
                  Unlink linked events and keep events.
                </span>
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <input
                  type="radio"
                  name="delete_mode"
                  checked={deleteMode === 'delete_with_events'}
                  onChange={() => setDeleteMode('delete_with_events')}
                />
                <span>
                  <strong>Delete poster + linked events</strong>
                  <br />
                  Remove this poster and all events linked from it.
                </span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button data-variant="secondary" onClick={() => setDeleteModalOpen(false)} disabled={deletingPoster}>Cancel</button>
              <button data-variant="danger" onClick={() => deletePoster(deleteMode)} disabled={deletingPoster}>
                {deletingPoster ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
