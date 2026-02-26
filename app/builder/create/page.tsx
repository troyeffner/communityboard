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

type PosterEvent = {
  link_id: string
  bbox: { x: number; y: number } | null
  event: { id: string; title: string }
}

function defaultStartAt2pmLocal() {
  const d = new Date()
  d.setHours(14, 0, 0, 0)
  const offsetMs = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16)
}

export default function BuilderCreatePage() {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(() => uploads.find((u) => u.id === selectedId) || null, [uploads, selectedId])
  const [rows, setRows] = useState<PosterEvent[]>([])
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [startAt, setStartAt] = useState(defaultStartAt2pmLocal())
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const [msg, setMsg] = useState('')

  async function loadUploads() {
    const res = await fetch('/api/manage/list-uploads-with-counts')
    const data = await res.json().catch(() => ({}))
    if (res.ok) setUploads((data.uploads || []).filter((u: Upload) => !u.is_done))
  }
  async function loadRows(uploadId: string | null) {
    if (!uploadId) return setRows([])
    const res = await fetch(`/api/manage/poster-events?poster_upload_id=${encodeURIComponent(uploadId)}`)
    const data = await res.json().catch(() => ({}))
    if (res.ok) setRows(data.rows || [])
  }
  useEffect(() => {
    let cancelled = false
    fetch('/api/manage/list-uploads-with-counts')
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!cancelled && ok) setUploads((data.uploads || []).filter((u: Upload) => !u.is_done))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!selectedId) {
      return () => { cancelled = true }
    }
    fetch(`/api/manage/poster-events?poster_upload_id=${encodeURIComponent(selectedId)}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!cancelled && ok) setRows(data.rows || [])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [selectedId])

  async function createPlanted() {
    if (!selectedId || !point || !title.trim()) return
    const res = await fetch('/api/builder/create-event-from-poster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poster_upload_id: selectedId,
        bbox: point,
        title,
        location,
        start_at: startAt,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setMsg(data?.error || 'Failed to plant event')
    setTitle('')
    setLocation('')
    setStartAt(defaultStartAt2pmLocal())
    setPoint(null)
    setMsg('Planted.')
    await loadRows(selectedId)
    await loadUploads()
  }

  async function markDone() {
    if (!selectedId) return
    const res = await fetch('/api/builder/mark-upload-done', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poster_upload_id: selectedId, is_done: true }),
    })
    if (res.ok) {
      setSelectedId(null)
      setRows([])
      await loadUploads()
    }
  }

  return (
    <main style={{ padding: 16, fontFamily: 'sans-serif', display: 'grid', gridTemplateColumns: '320px 1fr', gap: 12 }}>
      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 10, maxHeight: '90vh', overflow: 'auto' }}>
        <h1 style={{ marginTop: 0 }}>Builder Create</h1>
        <p style={{ marginTop: 0, opacity: 0.8 }}>Recently planted workflow</p>
        <div style={{ display: 'grid', gap: 8 }}>
          {uploads.map((u) => (
            <div key={u.id} style={{ border: selectedId === u.id ? '2px solid #2563eb' : '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
              <div style={{ fontSize: 12 }}>{new Date(u.created_at).toLocaleString()}</div>
              <div style={{ fontSize: 13 }}>events: {u.event_count}</div>
              {u.seen_at_label && <div style={{ fontSize: 12 }}>Seen at: {u.seen_at_label}</div>}
              <button data-variant="secondary" onClick={() => setSelectedId(u.id)}>{selectedId === u.id ? 'Selected' : 'Select'}</button>
            </div>
          ))}
        </div>
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 10 }}>
        <h2 style={{ marginTop: 0 }}>Plant from poster</h2>
        {!selected?.public_url ? <p>Select a poster.</p> : (
          <>
            <div
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
              style={{ position: 'relative', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', height: 520 }}
            >
              <div style={{ position: 'relative', transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: 'top left', width: '100%' }}>
                <img
                  src={selected.public_url}
                  alt="Poster"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = (e.clientX - rect.left) / rect.width
                    const y = (e.clientY - rect.top) / rect.height
                    setPoint({ x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) })
                  }}
                  style={{ width: '100%', display: 'block' }}
                />
                {rows.filter((r) => r.bbox).map((r) => (
                  <div key={r.link_id} title={r.event.title} style={{ position: 'absolute', left: `${r.bbox!.x * 100}%`, top: `${r.bbox!.y * 100}%`, transform: 'translate(-50%, -50%)', width: 12, height: 12, borderRadius: 999, background: '#22c55e', border: '2px solid #fff' }} />
                ))}
                {point && <div style={{ position: 'absolute', left: `${point.x * 100}%`, top: `${point.y * 100}%`, transform: 'translate(-50%, -50%)', width: 14, height: 14, borderRadius: 999, background: '#ef4444', border: '2px solid #fff' }} />}
              </div>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button data-variant="secondary" onClick={() => setZoom((z) => Math.min(5, z + 0.2))}>Zoom +</button>
              <button data-variant="secondary" onClick={() => setZoom((z) => Math.max(1, z - 0.2))}>Zoom -</button>
              <button data-variant="secondary" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Reset</button>
              <button onClick={markDone}>Mark done</button>
            </div>
          </>
        )}

        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          <button onClick={createPlanted} disabled={!selectedId || !point || !title.trim()}>Create planted event</button>
          {msg && <p style={{ margin: 0 }}>{msg}</p>}
        </div>
      </section>
    </main>
  )
}
