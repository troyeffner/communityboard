'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { EVENT_STATUSES, eventStatusLabel, normalizeEventStatus } from '@/lib/statuses'

type Row = {
  id: string
  title: string
  description: string | null
  location: string | null
  start_at: string
  status: string
  created_at: string
  is_linked: boolean
}

function normalizeStatusForEdit(raw?: string | null) {
  return normalizeEventStatus(raw, EVENT_STATUSES.DRAFT)
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return ''
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return ''
  const offsetMs = dt.getTimezoneOffset() * 60_000
  return new Date(dt.getTime() - offsetMs).toISOString().slice(0, 16)
}

function statusLabel(statusValue: string) {
  return normalizeEventStatus(statusValue, EVENT_STATUSES.DRAFT) === EVENT_STATUSES.PUBLISHED ? 'Done' : eventStatusLabel(statusValue)
}

export default function BuilderTendPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [status, setStatus] = useState('all')
  const [linked, setLinked] = useState('all')
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStartAt, setEditStartAt] = useState('')
  const [editStatus, setEditStatus] = useState('draft')

  async function load() {
    setError('')
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    if (linked !== 'all') params.set('linked', linked)
    if (q.trim()) params.set('q', q.trim())
    const res = await fetch(`/api/builder/events?${params.toString()}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(data?.error || 'Failed to load')
    setRows(data.rows || [])
  }

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    if (linked !== 'all') params.set('linked', linked)
    if (q.trim()) params.set('q', q.trim())

    fetch(`/api/builder/events?${params.toString()}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!cancelled) {
          if (!ok) setError(data?.error || 'Failed to load')
          else setRows(data.rows || [])
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load')
      })
    return () => { cancelled = true }
  }, [status, linked, q])

  async function markDone(eventId: string) {
    const res = await fetch('/api/builder/publish-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(data?.error || 'Failed to mark done')
    await load()
  }

  async function removeEvent(eventId: string) {
    if (!confirm('Remove this item?')) return
    const res = await fetch('/api/builder/delete-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(data?.error || 'Remove failed')
    await load()
  }

  function beginEdit(row: Row) {
    setError('')
    setEditingId(row.id)
    setEditTitle(row.title || '')
    setEditLocation(row.location || '')
    setEditDescription(row.description || '')
    setEditStartAt(toDateTimeLocal(row.start_at))
    setEditStatus(normalizeStatusForEdit(row.status))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTitle('')
    setEditLocation('')
    setEditDescription('')
    setEditStartAt('')
    setEditStatus('draft')
  }

  async function saveEdit() {
    if (!editingId) return
    if (!editTitle.trim()) return setError('Title is required')
    if (!editStartAt.trim()) return setError('Start is required')

    const res = await fetch('/api/builder/update-event', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: editingId,
        title: editTitle,
        location: editLocation,
        description: editDescription,
        start_at: editStartAt,
        status: editStatus,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(data?.error || 'Save failed')
    cancelEdit()
    await load()
  }

  return (
    <main style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: '100%', overflowX: 'hidden' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Link href="/builder/create" style={{ display: 'inline-block', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#111827', textDecoration: 'none', fontWeight: 700 }}>
          Create drafts
        </Link>
        <Link href="/builder/tend" style={{ display: 'inline-block', padding: '8px 12px', borderRadius: 8, border: '1px solid #1d4ed8', background: '#eff6ff', color: '#1d4ed8', textDecoration: 'none', fontWeight: 700 }}>
          Tend board
        </Link>
      </div>
      <h1 style={{ margin: 0 }}>Tend board</h1>
      <p style={{ marginTop: 6, opacity: 0.8 }}>Tend items and mark done</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}>
          <option value="all">All status</option>
          <option value="draft">Draft</option>
          <option value="published">Done</option>
        </select>
        <select value={linked} onChange={(e) => setLinked(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}>
          <option value="all">Linked + unlinked</option>
          <option value="linked">Linked</option>
          <option value="unlinked">Unlinked</option>
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', minWidth: 160, maxWidth: '100%' }} />
        <button data-variant="secondary" onClick={load}>Apply</button>
      </div>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8 }}>Title</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Start</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Link</th>
              <th style={{ textAlign: 'left', padding: 8 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td style={{ borderTop: '1px solid #eee', padding: 8 }}>{row.title}</td>
                <td style={{ borderTop: '1px solid #eee', padding: 8 }}>{new Date(row.start_at).toLocaleString()}</td>
                <td style={{ borderTop: '1px solid #eee', padding: 8 }}>{statusLabel(row.status)}</td>
                <td style={{ borderTop: '1px solid #eee', padding: 8 }}>{row.is_linked ? 'linked' : 'unlinked'}</td>
                <td style={{ borderTop: '1px solid #eee', padding: 8 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {normalizeEventStatus(row.status, EVENT_STATUSES.DRAFT) !== EVENT_STATUSES.PUBLISHED && (
                      <button onClick={() => markDone(row.id)}>Mark done</button>
                    )}
                    <button data-variant="secondary" onClick={() => beginEdit(row)}>Edit</button>
                    <button data-variant="danger" onClick={() => removeEvent(row.id)}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingId && (
        <section style={{ marginTop: 14, border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, maxWidth: 560 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Edit item</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }} />
            <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Location" style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }} />
            <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} placeholder="Description" style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', resize: 'vertical' }} />
            <input type="datetime-local" value={editStartAt} onChange={(e) => setEditStartAt(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }} />
            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}>
              <option value="draft">Draft</option>
              <option value="published">Done</option>
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveEdit}>Save changes</button>
              <button data-variant="secondary" onClick={cancelEdit}>Cancel</button>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
