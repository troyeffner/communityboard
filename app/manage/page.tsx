'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type EventStatus = 'draft' | 'published'

type PosterUpload = {
  id: string
  created_at: string
  status: string
  type?: string | null
  public_url?: string
  event_count: number
  processed_at: string | null
  done?: boolean
  seen_at_label?: string | null
}

type BBoxPoint = { x: number; y: number }

type EventRecord = {
  id: string
  title: string
  location: string | null
  description: string | null
  source_place?: string | null
  start_at: string
  status: EventStatus
  is_recurring?: boolean
  recurrence_rule?: string | null
}

type PosterEventRow = {
  link_id: string
  bbox: { x: number; y: number } | null
  created_at: string
  event: EventRecord
}

type AllEventRow = EventRecord & {
  created_at: string
  linked_count: number
  is_linked: boolean
  poster_upload_id: string | null
}

type RecurrenceMode = 'weekly' | 'monthly'
type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
type MonthOrdinal = 'first' | 'second' | 'third' | 'fourth'

declare global {
  interface GooglePlaceLike {
    formatted_address?: string
    name?: string
  }

  interface GoogleAutocompleteLike {
    addListener: (eventName: string, handler: () => void) => unknown
    getPlace: () => GooglePlaceLike
  }

  interface GoogleMapsLike {
    maps?: {
      places?: {
        Autocomplete: new (
          input: HTMLInputElement,
          opts?: { fields?: string[]; types?: string[] }
        ) => GoogleAutocompleteLike
      }
      event?: {
        removeListener: (listener: unknown) => void
      }
    }
  }

  interface Window {
    google?: GoogleMapsLike
  }
}

function defaultStartAt2pmLocal() {
  const d = new Date()
  d.setHours(14, 0, 0, 0)
  const offsetMs = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16)
}

function parseRecurrenceRule(rule?: string | null): {
  isRecurring: boolean
  mode: RecurrenceMode
  weekday: Weekday
  monthOrdinal: MonthOrdinal
} {
  if (!rule) return { isRecurring: false, mode: 'weekly', weekday: 'tuesday', monthOrdinal: 'first' }

  const weekly = /^weekly:(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.exec(rule)
  if (weekly) {
    return { isRecurring: true, mode: 'weekly', weekday: weekly[1].toLowerCase() as Weekday, monthOrdinal: 'first' }
  }

  const monthly = /^monthly:(first|second|third|fourth):(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.exec(rule)
  if (monthly) {
    return {
      isRecurring: true,
      mode: 'monthly',
      monthOrdinal: monthly[1].toLowerCase() as MonthOrdinal,
      weekday: monthly[2].toLowerCase() as Weekday,
    }
  }

  return { isRecurring: true, mode: 'weekly', weekday: 'tuesday', monthOrdinal: 'first' }
}

function buildRecurrenceRule(isRecurring: boolean, mode: RecurrenceMode, weekday: Weekday, monthOrdinal: MonthOrdinal) {
  if (!isRecurring) return null
  return mode === 'weekly' ? `weekly:${weekday}` : `monthly:${monthOrdinal}:${weekday}`
}

export default function ManagePage() {
  const [isNarrow, setIsNarrow] = useState(false)

  const [uploads, setUploads] = useState<PosterUpload[]>([])
  const [uploadsError, setUploadsError] = useState('')

  const [selectedPosterId, setSelectedPosterId] = useState<string | null>(null)
  const [selectedUpload, setSelectedUpload] = useState<PosterUpload | null>(null)

  const [posterEvents, setPosterEvents] = useState<PosterEventRow[]>([])
  const [posterEventsError, setPosterEventsError] = useState('')

  const [allEvents, setAllEvents] = useState<AllEventRow[]>([])
  const [allEventsError, setAllEventsError] = useState('')

  const [typeFilter, setTypeFilter] = useState<'all' | string>('all')
  const [doneFilter, setDoneFilter] = useState<'all' | 'done' | 'incomplete'>('all')
  const [uploadStatusFilter, setUploadStatusFilter] = useState<'all' | string>('all')

  const [statusFilter, setStatusFilter] = useState<'all' | EventStatus>('all')
  const [linkedFilter, setLinkedFilter] = useState<'all' | 'linked' | 'unlinked'>('all')
  const [recurringFilter, setRecurringFilter] = useState<'all' | 'recurring'>('all')

  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [sourcePlace, setSourcePlace] = useState('')
  const [startAt, setStartAt] = useState(defaultStartAt2pmLocal())
  const [status, setStatus] = useState<EventStatus>('published')

  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('weekly')
  const [recurrenceWeekday, setRecurrenceWeekday] = useState<Weekday>('tuesday')
  const [recurrenceMonthOrdinal, setRecurrenceMonthOrdinal] = useState<MonthOrdinal>('first')

  const [point, setPoint] = useState<BBoxPoint | null>(null)
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editingPosterUploadId, setEditingPosterUploadId] = useState<string | null>(null)
  const [pendingFocusEventId, setPendingFocusEventId] = useState<string | null>(null)

  const [savingForm, setSavingForm] = useState(false)
  const [updatingDone, setUpdatingDone] = useState(false)
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null)
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)

  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [processingError, setProcessingError] = useState('')

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [hasUserAdjustedView, setHasUserAdjustedView] = useState(false)
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const didDragRef = useRef(false)
  const viewerRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const locationInputRef = useRef<HTMLInputElement | null>(null)

  const uniqueTypes = useMemo(() => ['all', ...Array.from(new Set(uploads.map((u) => u.type || 'poster')))], [uploads])
  const uniqueUploadStatuses = useMemo(() => ['all', ...Array.from(new Set(uploads.map((u) => u.status)))], [uploads])

  const filteredUploads = useMemo(() => {
    return uploads.filter((u) => {
      if (typeFilter !== 'all' && (u.type || 'poster') !== typeFilter) return false
      if (doneFilter === 'done' && !u.processed_at) return false
      if (doneFilter === 'incomplete' && u.processed_at) return false
      if (uploadStatusFilter !== 'all' && u.status !== uploadStatusFilter) return false
      return true
    })
  }, [uploads, typeFilter, doneFilter, uploadStatusFilter])

  const filteredAllEvents = useMemo(() => {
    return allEvents.filter((event) => {
      if (statusFilter !== 'all' && event.status !== statusFilter) return false
      if (linkedFilter === 'linked' && !event.is_linked) return false
      if (linkedFilter === 'unlinked' && event.is_linked) return false
      if (recurringFilter === 'recurring' && !event.is_recurring) return false
      return true
    })
  }, [allEvents, statusFilter, linkedFilter, recurringFilter])

  const isEditMode = editingEventId !== null

  function formatDateTime(value?: string | null) {
    if (!value) return '—'
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return value
    return dt.toLocaleString()
  }

  function toDateTimeLocal(value?: string | null) {
    if (!value) return defaultStartAt2pmLocal()
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return defaultStartAt2pmLocal()
    const offsetMs = dt.getTimezoneOffset() * 60_000
    return new Date(dt.getTime() - offsetMs).toISOString().slice(0, 16)
  }

  function clearForm() {
    setTitle('')
    setLocation('')
    setDescription('')
    setSourcePlace(selectedUpload?.seen_at_label || '')
    setStartAt(defaultStartAt2pmLocal())
    setStatus('published')
    setIsRecurring(false)
    setRecurrenceMode('weekly')
    setRecurrenceWeekday('tuesday')
    setRecurrenceMonthOrdinal('first')
    setEditingEventId(null)
    setEditingPosterUploadId(null)
  }

  async function loadUploads() {
    setUploadsError('')
    const res = await fetch('/api/manage/list-uploads-with-counts')
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setUploadsError(data?.error || 'Failed to load uploads')
      return
    }
    const rows = (data.uploads || []) as PosterUpload[]
    setUploads(rows)
    if (selectedPosterId) {
      const selected = rows.find((u) => u.id === selectedPosterId) || null
      setSelectedUpload(selected)
      if (!selected) {
        setSelectedPosterId(null)
        setPosterEvents([])
      }
    }
  }

  async function loadPosterEvents(uploadId: string | null) {
    setPosterEventsError('')
    if (!uploadId) {
      setPosterEvents([])
      return
    }

    const res = await fetch(`/api/manage/poster-events?poster_upload_id=${encodeURIComponent(uploadId)}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setPosterEventsError(data?.error || 'Failed to load linked events')
      setPosterEvents([])
      return
    }
    const rows = (data.rows || []) as PosterEventRow[]
    setPosterEvents(rows)

    if (pendingFocusEventId) {
      const match = rows.find((row) => row.event.id === pendingFocusEventId)
      if (match) focusOnLink(match.link_id)
      setPendingFocusEventId(null)
    }
  }

  async function loadAllEvents() {
    setAllEventsError('')
    const res = await fetch('/api/manage/all-events')
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setAllEventsError(data?.error || 'Failed to load events')
      return
    }
    setAllEvents((data.rows || []) as AllEventRow[])
  }

  async function refreshData() {
    await Promise.all([loadUploads(), loadPosterEvents(selectedPosterId), loadAllEvents()])
  }

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1100)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    loadUploads()
    loadAllEvents()
  }, [])

  useEffect(() => {
    const selected = uploads.find((u) => u.id === selectedPosterId) || null
    setSelectedUpload(selected)
  }, [uploads, selectedPosterId])

  useEffect(() => {
    if (!isEditMode) {
      setSourcePlace(selectedUpload?.seen_at_label || '')
    }
  }, [selectedUpload?.id, isEditMode])

  useEffect(() => {
    setPoint(null)
    clearForm()
    setActiveLinkId(null)
    setMessage('')
    setFormError('')
    setProcessingError('')
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setHasUserAdjustedView(false)
    loadPosterEvents(selectedPosterId)
  }, [selectedPosterId])

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey || window.google?.maps?.places) return

    const existing = document.querySelector('script[data-gmaps="places"]')
    if (existing) return

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.dataset.gmaps = 'places'
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!locationInputRef.current || !window.google?.maps?.places) return

    const autocomplete = new window.google.maps.places.Autocomplete(locationInputRef.current, {
      fields: ['formatted_address', 'name'],
      types: ['establishment', 'geocode'],
    })

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const value = place?.formatted_address || place?.name || ''
      if (value) setLocation(value)
    })

    return () => {
      if (listener && window.google?.maps?.event) {
        window.google.maps.event.removeListener(listener)
      }
    }
  }, [locationInputRef.current])

  function startEditingEvent(event: EventRecord, posterUploadId?: string | null) {
    if (posterUploadId && selectedPosterId !== posterUploadId) {
      setSelectedPosterId(posterUploadId)
    }

    setEditingEventId(event.id)
    setEditingPosterUploadId(posterUploadId || selectedPosterId || null)
    setTitle(event.title)
    setLocation(event.location || '')
    setDescription(event.description || '')
    setSourcePlace(event.source_place || '')
    setStartAt(toDateTimeLocal(event.start_at))
    setStatus('published')

    const parsed = parseRecurrenceRule(event.recurrence_rule)
    setIsRecurring(Boolean(event.is_recurring) || parsed.isRecurring)
    setRecurrenceMode(parsed.mode)
    setRecurrenceWeekday(parsed.weekday)
    setRecurrenceMonthOrdinal(parsed.monthOrdinal)

    setMessage('Editing item...')
    setFormError('')
  }

  function focusOnLink(linkId: string) {
    setActiveLinkId(linkId)
    if (hasUserAdjustedView) return
    const row = posterEvents.find((item) => item.link_id === linkId)
    const bbox = row?.bbox
    if (!bbox || !viewerRef.current || !imageRef.current) return

    const currentZoom = zoom
    const nextZoom = Math.max(currentZoom, 1.8)
    const imageWidth = imageRef.current.clientWidth
    const imageHeight = imageRef.current.clientHeight
    if (!imageWidth || !imageHeight) return

    const targetX = bbox.x * imageWidth * nextZoom
    const targetY = bbox.y * imageHeight * nextZoom
    const centerX = viewerRef.current.clientWidth / 2
    const centerY = viewerRef.current.clientHeight / 2

    setZoom(nextZoom)
    setPan({
      x: Number((centerX - targetX).toFixed(1)),
      y: Number((centerY - targetY).toFixed(1)),
    })
  }

  function handleImageMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    dragRef.current = { x: e.clientX, y: e.clientY }
    didDragRef.current = false
  }

  function handleImageMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDragRef.current = true
    if (Math.abs(dx) > 0 || Math.abs(dy) > 0) setHasUserAdjustedView(true)
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
    dragRef.current = { x: e.clientX, y: e.clientY }
  }

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    if (isEditMode) return
    if (didDragRef.current) {
      didDragRef.current = false
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setPoint({ x: Number(Math.max(0, Math.min(1, x)).toFixed(4)), y: Number(Math.max(0, Math.min(1, y)).toFixed(4)) })
  }

  async function submitEvent() {
    setFormError('')
    setMessage('')

    if (!title.trim()) return setFormError('Title is required.')
    if (!startAt.trim()) return setFormError('Start date/time is required.')

    const recurrence_rule = buildRecurrenceRule(isRecurring, recurrenceMode, recurrenceWeekday, recurrenceMonthOrdinal)

    setSavingForm(true)
    try {
      const posterUploadIdForSeenAt = selectedPosterId || editingPosterUploadId
      if (posterUploadIdForSeenAt && sourcePlace.trim()) {
        const seenAtRes = await fetch('/api/manage/set-upload-seen-at', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            poster_upload_id: posterUploadIdForSeenAt,
            seen_at_label: sourcePlace.trim(),
          }),
        })
        const seenAtData = await seenAtRes.json().catch(() => ({}))
        if (!seenAtRes.ok) return setFormError(seenAtData?.error || 'Failed to save Seen at')
      }

      if (isEditMode && editingEventId) {
        const res = await fetch('/api/manage/update-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingEventId,
            poster_upload_id: selectedPosterId || editingPosterUploadId || null,
            title,
            location,
            description,
            source_place: sourcePlace,
            seen_at_label: sourcePlace,
            start_at: startAt,
            status,
            is_recurring: isRecurring,
            recurrence_rule,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return setFormError(data?.error || 'Update failed')

        await refreshData()
        clearForm()
        setMessage('Updated.')
        return
      }

      if (!selectedPosterId) return setFormError('Select a submission first.')
      if (!point) return setFormError('Click on image to place a pin.')

      const effectiveSourcePlace = sourcePlace.trim() || selectedUpload?.seen_at_label || ''
      const res = await fetch('/api/manage/create-event-from-poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poster_upload_id: selectedPosterId,
          title,
          location,
          description,
          source_place: effectiveSourcePlace,
          start_at: startAt,
          status,
          bbox: point,
          is_recurring: isRecurring,
          recurrence_rule,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return setFormError(data?.error || 'Create failed')

      clearForm()
      setPoint(null)
      await refreshData()
      setMessage('Saved.')
    } finally {
      setSavingForm(false)
    }
  }

  async function markDone() {
    if (!selectedPosterId) return
    setProcessingError('')
    setUpdatingDone(true)
    const res = await fetch('/api/manage/set-upload-processed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poster_upload_id: selectedPosterId, processed: true }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) setProcessingError(data?.error || 'Failed to mark done')
    else {
      await loadUploads()
      setMessage('Marked done.')
    }
    setUpdatingDone(false)
  }

  async function deleteSubmission(upload: PosterUpload) {
    const warning = upload.event_count > 0
      ? `This submission has ${upload.event_count} linked item(s). Deleting it unlinks items but keeps events.`
      : ''
    const confirmed = confirm(['Delete this submission image?', warning].filter(Boolean).join('\n\n'))
    if (!confirmed) return

    setDeletingUploadId(upload.id)
    const res = await fetch('/api/manage/delete-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poster_upload_id: upload.id }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) setUploadsError(data?.error || 'Delete submission failed')

    if (selectedPosterId === upload.id) {
      setSelectedPosterId(null)
      setPosterEvents([])
      setPoint(null)
    }

    await refreshData()
    setDeletingUploadId(null)
  }

  async function deleteLinked(linkId: string) {
    if (!confirm('Delete this linked item?')) return
    setDeletingLinkId(linkId)
    const res = await fetch('/api/manage/delete-poster-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link_id: linkId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) setPosterEventsError(data?.error || 'Delete failed')
    await refreshData()
    setDeletingLinkId(null)
  }

  async function deleteAnyEvent(eventId: string) {
    if (!confirm('Delete this event?')) return
    setDeletingEventId(eventId)
    const res = await fetch('/api/manage/delete-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) setAllEventsError(data?.error || 'Delete failed')
    await refreshData()
    setDeletingEventId(null)
  }

  function focusEvent(event: AllEventRow) {
    setPendingFocusEventId(event.id)
    if (event.poster_upload_id) {
      setSelectedPosterId(event.poster_upload_id)
    }
    startEditingEvent(event, event.poster_upload_id)
  }

  return (
    <main style={{ padding: 16, fontFamily: 'sans-serif', height: '100vh', overflow: 'hidden' }}>
      <h1 style={{ margin: '0 0 12px 0' }}>Manage</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isNarrow ? '1fr' : '320px minmax(360px, 1fr) 440px',
          gap: 12,
          height: 'calc(100vh - 92px)',
          minHeight: 520,
          alignItems: 'stretch',
          overflow: 'hidden',
        }}
      >
        <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 10, overflow: 'auto' }}>
          <h2 style={{ marginTop: 0 }}>Submissions</h2>

          <div style={{ display: 'grid', gap: 8 }}>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 8 }}>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>
              ))}
            </select>
            <select value={doneFilter} onChange={(e) => setDoneFilter(e.target.value as 'all' | 'done' | 'incomplete')} style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 8 }}>
              <option value="all">All done states</option><option value="done">Done</option><option value="incomplete">Incomplete</option>
            </select>
            <select value={uploadStatusFilter} onChange={(e) => setUploadStatusFilter(e.target.value)} style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 8 }}>
              {uniqueUploadStatuses.map((s) => (
                <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>
              ))}
            </select>
          </div>

          {uploadsError && <p style={{ color: 'crimson' }}>{uploadsError}</p>}

          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            {filteredUploads.map((u) => (
              <div key={u.id} style={{ border: selectedPosterId === u.id ? '2px solid #2563eb' : '1px solid #e5e7eb', borderRadius: 10, padding: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{formatDateTime(u.created_at)}</div>
                <div style={{ fontSize: 13 }}>{u.status} • {u.type || 'poster'} • linked: {u.event_count}</div>
                {u.seen_at_label && (
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    Seen at: {u.seen_at_label}
                  </div>
                )}
                <div style={{ fontSize: 12, marginTop: 2 }}>
                  {(u.done ?? Boolean(u.processed_at)) ? <span style={{ color: '#166534' }}>Done</span> : <span style={{ color: '#92400e' }}>Incomplete</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button data-variant="secondary" onClick={() => setSelectedPosterId(u.id)}>
                    {selectedPosterId === u.id ? 'Selected' : 'Select'}
                  </button>
                  <button data-variant="danger" onClick={() => deleteSubmission(u)} disabled={deletingUploadId === u.id}>
                    {deletingUploadId === u.id ? 'Deleting...' : 'Delete submission'}
                  </button>
                </div>
              </div>
            ))}
            {filteredUploads.length === 0 && <p style={{ opacity: 0.7 }}>No submissions match filters.</p>}
          </div>
        </section>

        <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h2 style={{ marginTop: 0 }}>Selected Image</h2>
          {!selectedUpload?.public_url && <p style={{ opacity: 0.7 }}>Select a submission to view it.</p>}

          {selectedUpload?.public_url && (
            <>
              {selectedUpload.seen_at_label && (
                <p style={{ margin: '0 0 8px 0', fontSize: 13 }}>
                  Seen at: <strong>{selectedUpload.seen_at_label}</strong>
                </p>
              )}
              <div
                ref={viewerRef}
                onMouseDown={handleImageMouseDown}
                onMouseMove={handleImageMouseMove}
                onMouseUp={() => { dragRef.current = null }}
                onMouseLeave={() => { dragRef.current = null }}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  minHeight: 0,
                  flex: 1,
                  cursor: dragRef.current ? 'grabbing' : 'grab',
                }}
              >
                <div style={{ position: 'relative', transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top left', width: '100%' }}>
                  <img ref={imageRef} src={selectedUpload.public_url} alt="Poster" onClick={handleImageClick} style={{ width: '100%', display: 'block' }} />

                  {posterEvents.filter((r) => r.bbox).map((r) => (
                    <div
                      key={r.link_id}
                      title={r.event.title}
                      style={{
                        position: 'absolute',
                        left: `${r.bbox!.x * 100}%`,
                        top: `${r.bbox!.y * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        width: activeLinkId === r.link_id ? 16 : 12,
                        height: activeLinkId === r.link_id ? 16 : 12,
                        borderRadius: 999,
                        background: 'limegreen',
                        border: activeLinkId === r.link_id ? '3px solid #166534' : '2px solid white',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                        pointerEvents: 'none',
                      }}
                    />
                  ))}

                  {!isEditMode && point && (
                    <div style={{ position: 'absolute', left: `${point.x * 100}%`, top: `${point.y * 100}%`, transform: 'translate(-50%, -50%)', width: 14, height: 14, borderRadius: 999, background: 'red', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.35)', pointerEvents: 'none' }} />
                  )}
                </div>
              </div>

              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={markDone} disabled={updatingDone}>{updatingDone ? 'Saving...' : 'Mark Done'}</button>
                <button data-variant="secondary" onClick={() => { setHasUserAdjustedView(true); setZoom((z) => Math.min(4, Number((z + 0.25).toFixed(2)))) }}>Zoom +</button>
                <button data-variant="secondary" onClick={() => { setHasUserAdjustedView(true); setZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2)))) }}>Zoom -</button>
                <button data-variant="secondary" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setHasUserAdjustedView(false) }}>Reset view</button>
              </div>
              {processingError && <p style={{ color: 'crimson', margin: '8px 0 0 0' }}>{processingError}</p>}
              {posterEventsError && <p style={{ color: 'crimson', margin: '8px 0 0 0' }}>{posterEventsError}</p>}
            </>
          )}
        </section>

        <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 10, overflow: 'auto', minHeight: 0 }}>
          <h2 style={{ marginTop: 0 }}>{isEditMode ? 'Edit Item' : 'Create Event / Business'}</h2>

          <label style={{ display: 'block', marginTop: 8 }}>Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          </label>

          <label style={{ display: 'block', marginTop: 8 }}>Location
            <input ref={locationInputRef} value={location} onChange={(e) => setLocation(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          </label>
          <p style={{ fontSize: 12, opacity: 0.7, margin: '6px 0 0 0' }}>Venue/location: Where the event happens.</p>

          <div style={{ marginTop: 10, border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 16 }}>Seen at</h3>
            <p style={{ fontSize: 12, opacity: 0.7, margin: '0 0 8px 0' }}>Seen at: where you found this poster/business card.</p>
            <label style={{ display: 'block', marginTop: 8 }}>Location name
              <input value={sourcePlace} onChange={(e) => setSourcePlace(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
            </label>
          </div>

          <label style={{ display: 'block', marginTop: 8 }}>Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, resize: 'vertical' }} />
          </label>

          <label style={{ display: 'block', marginTop: 8 }}>Start
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          </label>

          <label style={{ display: 'block', marginTop: 8 }}>Status
            <select value={status} onChange={(e) => setStatus(e.target.value as EventStatus)} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
              <option value="published">published</option>
              <option value="draft">draft</option>
            </select>
          </label>

          <label style={{ display: 'block', marginTop: 8 }}>
            <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} /> Recurring
          </label>

          {isRecurring && (
            <div style={{ marginTop: 8, padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <select value={recurrenceMode} onChange={(e) => setRecurrenceMode(e.target.value as RecurrenceMode)} style={{ width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                <option value="weekly">Weekly</option><option value="monthly">Monthly</option>
              </select>
              {recurrenceMode === 'monthly' && (
                <select value={recurrenceMonthOrdinal} onChange={(e) => setRecurrenceMonthOrdinal(e.target.value as MonthOrdinal)} style={{ width: '100%', marginTop: 8, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                  <option value="first">First</option><option value="second">Second</option><option value="third">Third</option><option value="fourth">Fourth</option>
                </select>
              )}
              <select value={recurrenceWeekday} onChange={(e) => setRecurrenceWeekday(e.target.value as Weekday)} style={{ width: '100%', marginTop: 8, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                <option value="monday">Monday</option><option value="tuesday">Tuesday</option><option value="wednesday">Wednesday</option><option value="thursday">Thursday</option><option value="friday">Friday</option><option value="saturday">Saturday</option><option value="sunday">Sunday</option>
              </select>
            </div>
          )}

          <p style={{ opacity: 0.7 }}>Pin: {isEditMode ? 'unchanged in edit mode' : point ? `x=${point.x}, y=${point.y}` : 'click image'}</p>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={submitEvent} disabled={savingForm || !title || !startAt}>
              {savingForm ? 'Saving...' : isEditMode ? 'Save changes' : 'Create event'}
            </button>
            {isEditMode && <button data-variant="secondary" onClick={clearForm}>Cancel</button>}
          </div>

          {formError && <p style={{ color: 'crimson' }}>{formError}</p>}
          {message && <p>{message}</p>}

          <h3 style={{ marginTop: 18, marginBottom: 8 }}>Linked Items</h3>
          {posterEvents.length === 0 ? <p style={{ opacity: 0.7 }}>No linked items for this submission.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>Title</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Created</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
                  <th style={{ padding: 8 }}></th>
                </tr>
              </thead>
              <tbody>
                {posterEvents.map((row) => (
                  <tr key={row.link_id} onClick={() => focusOnLink(row.link_id)} style={{ background: activeLinkId === row.link_id ? '#f0fdf4' : 'transparent' }}>
                    <td style={{ padding: 8, borderTop: '1px solid #eee' }}>{row.event.title}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #eee' }}>{formatDateTime(row.created_at)}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #eee' }}>{row.event.status}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #eee' }}>
                      <button data-variant="secondary" onClick={(e) => { e.stopPropagation(); startEditingEvent(row.event, selectedPosterId) }}>Edit</button>{' '}
                      <button data-variant="danger" onClick={(e) => { e.stopPropagation(); deleteLinked(row.link_id) }} disabled={deletingLinkId === row.link_id}>
                        {deletingLinkId === row.link_id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 style={{ marginTop: 18, marginBottom: 8 }}>All Events</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | EventStatus)} style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 8 }}>
              <option value="all">All status</option><option value="published">Published</option><option value="draft">Draft</option>
            </select>
            <select value={linkedFilter} onChange={(e) => setLinkedFilter(e.target.value as 'all' | 'linked' | 'unlinked')} style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 8 }}>
              <option value="all">All link states</option><option value="linked">Linked</option><option value="unlinked">Unlinked</option>
            </select>
            <select value={recurringFilter} onChange={(e) => setRecurringFilter(e.target.value as 'all' | 'recurring')} style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 8 }}>
              <option value="all">All recurrence</option><option value="recurring">Recurring only</option>
            </select>
            <button data-variant="secondary" onClick={loadAllEvents}>Refresh</button>
          </div>

          {allEventsError && <p style={{ color: 'crimson' }}>{allEventsError}</p>}

          {filteredAllEvents.length === 0 ? <p style={{ opacity: 0.7 }}>No events match filters.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>Title</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Start</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Link</th>
                  <th style={{ padding: 8 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredAllEvents.map((event) => (
                  <tr key={event.id}>
                    <td style={{ padding: 8, borderTop: '1px solid #eee' }}>{event.title}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #eee' }}>{formatDateTime(event.start_at)}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #eee' }}>{event.status}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #eee' }}>
                      {event.is_linked ? (
                        <span>Linked ({event.linked_count})</span>
                      ) : (
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: '#fee2e2', color: '#b91c1c', fontSize: 12 }}>Unlinked</span>
                      )}
                    </td>
                    <td style={{ padding: 8, borderTop: '1px solid #eee' }}>
                      <button data-variant="secondary" onClick={() => focusEvent(event)}>Edit</button>{' '}
                      <button data-variant="danger" onClick={() => deleteAnyEvent(event.id)} disabled={deletingEventId === event.id}>
                        {deletingEventId === event.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  )
}
