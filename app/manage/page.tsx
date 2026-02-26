'use client'

import { useEffect, useState } from 'react'

type PosterUpload = {
  id: string
  file_path: string
  status: string
  created_at: string
}

export default function ManagePage() {
  const [title, setTitle] = useState('')
  const [startAt, setStartAt] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [message, setMessage] = useState('')
  const [selectedPosterId, setSelectedPosterId] = useState<string | null>(null)

  async function submitEvent() {
    if (!selectedPosterId) {
      setMessage('Select a submission first.')
      return
    }

    setMessage('Saving...')

    const res = await fetch('/api/manage/create-event-from-poster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poster_upload_id: selectedPosterId,
        title,
        start_at: startAt,
        status,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setMessage(data?.error || 'Error')
      return
    }

    setMessage('Saved.')
    setTitle('')
    setStartAt('')
    setStatus('draft')
  }

  const [uploads, setUploads] = useState<PosterUpload[]>([])
  const [uploadsError, setUploadsError] = useState('')

  async function loadUploads() {
    setUploadsError('')
    const res = await fetch('/api/manage/list-uploads')
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setUploadsError(data?.error || 'Failed to load uploads')
      return
    }
    setUploads(data.uploads || [])
  }

  useEffect(() => {
    loadUploads()
  }, [])

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 960 }}>
      <h1>Manage</h1>

      <section style={{ marginTop: 16 }}>
        <h2>Create event from submission</h2>

        <p style={{ opacity: 0.7 }}>
          Selected poster ID: {selectedPosterId || 'none'}
        </p>

        <label style={{ display: 'block', marginTop: 12 }}>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 6 }}
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Start (America/New_York)
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 6 }}
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 6 }}
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </label>

        <button
          onClick={submitEvent}
          style={{ marginTop: 16, padding: '10px 14px' }}
          disabled={!title || !startAt || !selectedPosterId}
        >
          Create event
        </button>

        {message && <p style={{ marginTop: 12 }}>{message}</p>}
      </section>

      <hr style={{ margin: '2rem 0' }} />

      <section>
        <h2>Submissions</h2>

        <button onClick={loadUploads} style={{ padding: '8px 12px' }}>
          Refresh submissions
        </button>

        {uploadsError && (
          <p style={{ marginTop: 12, color: 'crimson' }}>{uploadsError}</p>
        )}

        {uploads.length > 0 && (
          <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Created</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Status</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>File</th>
                <th style={{ borderBottom: '1px solid #ddd', padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((u) => (
                <tr key={u.id}>
                  <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                    {new Date(u.created_at).toLocaleString()}
                  </td>
                  <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{u.status}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                    <code style={{ fontSize: 12 }}>{u.file_path}</code>
                  </td>
                  <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                    <button onClick={() => setSelectedPosterId(u.id)}>
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
