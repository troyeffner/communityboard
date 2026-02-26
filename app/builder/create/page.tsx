'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Upload = {
  id: string
  created_at: string
  status: string
  public_url?: string
  seen_at_label?: string | null
  seen_at_category?: string | null
  is_done?: boolean
  event_count: number
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

export default function BuilderCreatePage() {
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
  const [status, setStatus] = useState('planted')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceRule, setRecurrenceRule] = useState('')
  const [seenAtName, setSeenAtName] = useState('')
  const [seenAtCategory, setSeenAtCategory] = useState('community_board')

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const didDragRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadUploads() {
    const res = await fetch('/api/manage/list-uploads-with-counts')
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(data?.error || 'Failed to load posters')
    setUploads(((data.uploads || []) as Upload[]).filter((u) => !u.is_done))
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
    setStatus('planted')
    setIsRecurring(false)
    setRecurrenceRule('')
    setSeenAtName(upload?.seen_at_label || '')
    setSeenAtCategory(upload?.seen_at_category || 'community_board')
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
    setStatus(row.event.status || 'planted')
    setIsRecurring(Boolean(row.event.is_recurring))
    setRecurrenceRule(row.event.recurrence_rule || '')
    setSeenAtName(selectedUpload?.seen_at_label || '')
    setSeenAtCategory(selectedUpload?.seen_at_category || 'community_board')
  }

  function resetFormToNew() {
    setEditingEventId(null)
    setActiveLinkId(null)
    setTitle('')
    setLocation('')
    setDescription('')
    setStartAt(defaultStartAt2pmLocal())
    setStatus('planted')
    setIsRecurring(false)
    setRecurrenceRule('')
  }

  async function saveSeenAt() {
    if (!selectedPosterId) return true
    const res = await fetch('/api/builder/set-upload-seen-at', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poster_upload_id: selectedPosterId,
        seen_at_name: seenAtName,
        seen_at_category: seenAtCategory,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data?.error || 'Failed to save Seen at')
      return false
    }
    return true
  }

  async function saveEvent() {
    setError('')
    setMessage('')
    if (!selectedPosterId) return setError('Select a poster first.')
    if (!title.trim()) return setError('Title is required.')
    if (!startAt.trim()) return setError('Start time is required.')

    setSaving(true)
    try {
      const seenAtOk = await saveSeenAt()
      if (!seenAtOk) return

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
            status,
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
          status,
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

  return (
    <main style={{ padding: 16, fontFamily: 'sans-serif', display: 'grid', gridTemplateColumns: '320px 1fr 420px', gap: 12, minHeight: '90vh' }}>
      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 10, overflow: 'auto' }}>
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>Recently planted posters</h1>
        <div style={{ display: 'grid', gap: 8 }}>
          {uploads.map((u) => (
            <div key={u.id} style={{ border: selectedPosterId === u.id ? '2px solid #2563eb' : '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
              {u.public_url && <img src={u.public_url} alt="Poster thumb" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }} />}
              <div style={{ fontSize: 12, marginTop: 6 }}>{new Date(u.created_at).toLocaleString()}</div>
              <div style={{ fontSize: 12 }}>{u.is_done ? 'Done' : 'Incomplete'} • Events: {u.event_count}</div>
              <button data-variant="secondary" onClick={() => selectPoster(u.id)} style={{ marginTop: 6 }}>
                {selectedPosterId === u.id ? 'Selected' : 'Select'}
              </button>
            </div>
          ))}
          {uploads.length === 0 && <p style={{ opacity: 0.7 }}>No incomplete posters.</p>}
        </div>
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <h2 style={{ marginTop: 0 }}>Poster workspace</h2>
        {!selectedUpload?.public_url && <p style={{ opacity: 0.7 }}>Select a poster from the left list.</p>}
        {selectedUpload?.public_url && (
          <>
            <div
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
                  src={selectedUpload.public_url}
                  alt="Poster"
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
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button data-variant="secondary" onClick={() => setZoom((z) => Math.min(5, Number((z + 0.2).toFixed(2))))}>Zoom +</button>
              <button data-variant="secondary" onClick={() => setZoom((z) => Math.max(1, Number((z - 0.2).toFixed(2))))}>Zoom -</button>
              <button data-variant="secondary" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Reset</button>
              <button onClick={markDone}>Mark done</button>
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
                  {new Date(row.event.start_at).toLocaleString()} • {row.event.status}
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
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Description" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, resize: 'vertical' }} />
          <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
            <option value="planted">planted</option>
            <option value="on_board">on_board</option>
            <option value="archived">archived</option>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="unpublished">unpublished</option>
          </select>
          <label style={{ fontSize: 13, fontWeight: 600 }}>
            <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} /> Recurring
          </label>
          {isRecurring && (
            <input value={recurrenceRule} onChange={(e) => setRecurrenceRule(e.target.value)} placeholder="Recurrence rule" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          )}

          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
            <h4 style={{ margin: '0 0 6px 0' }}>Seen at</h4>
            <input value={seenAtName} onChange={(e) => setSeenAtName(e.target.value)} placeholder="Seen at name" style={{ width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, marginBottom: 8 }} />
            <select value={seenAtCategory} onChange={(e) => setSeenAtCategory(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
              <option value="community_board">community_board</option>
              <option value="window">window</option>
              <option value="street">street</option>
              <option value="other">other</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveEvent} disabled={saving || !title.trim()}>{saving ? 'Saving...' : editingEventId ? 'Save changes' : 'Create event'}</button>
            {(editingEventId || point) && <button data-variant="secondary" onClick={() => { resetFormToNew(); setPoint(null) }}>Cancel</button>}
          </div>
          {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
          {message && <p style={{ margin: 0 }}>{message}</p>}
        </div>
      </section>
    </main>
  )
}
