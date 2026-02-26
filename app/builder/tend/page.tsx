'use client'

import { useEffect, useState } from 'react'

type Row = {
  id: string
  title: string
  location: string | null
  start_at: string
  status: string
  created_at: string
  is_recurring: boolean
  is_linked: boolean
}

export default function BuilderTendPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [status, setStatus] = useState('all')
  const [linked, setLinked] = useState('all')
  const [recurring, setRecurring] = useState(false)
  const [q, setQ] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setError('')
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    if (linked !== 'all') params.set('linked', linked)
    if (recurring) params.set('recurring', 'true')
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
    if (recurring) params.set('recurring', 'true')
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
  }, [status, linked, recurring, q])

  async function publish(eventId: string) {
    const res = await fetch('/api/builder/publish-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(data?.error || 'Publish failed')
    await load()
  }

  async function removeEvent(eventId: string) {
    if (!confirm('Remove this event?')) return
    const res = await fetch('/api/builder/delete-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(data?.error || 'Remove failed')
    await load()
  }

  return (
    <main style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h1 style={{ margin: 0 }}>Builder Tend</h1>
      <p style={{ marginTop: 6, opacity: 0.8 }}>Tend events and publish to board</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}>
          <option value="all">All status</option>
          <option value="planted">Recently planted</option>
          <option value="on_board">On board</option>
          <option value="archived">Archived</option>
        </select>
        <select value={linked} onChange={(e) => setLinked(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}>
          <option value="all">Linked + unlinked</option>
          <option value="linked">Linked</option>
          <option value="unlinked">Unlinked</option>
        </select>
        <label style={{ fontSize: 13, fontWeight: 600 }}>
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /> Recurring
        </label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" style={{ padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }} />
        <button data-variant="secondary" onClick={load}>Apply</button>
      </div>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
              <td style={{ borderTop: '1px solid #eee', padding: 8 }}>{row.status}</td>
              <td style={{ borderTop: '1px solid #eee', padding: 8 }}>{row.is_linked ? 'linked' : 'unlinked'}</td>
              <td style={{ borderTop: '1px solid #eee', padding: 8, display: 'flex', gap: 6 }}>
                {row.status !== 'on_board' && (
                  <button onClick={() => publish(row.id)}>Publish to board</button>
                )}
                <button data-variant="danger" onClick={() => removeEvent(row.id)}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
