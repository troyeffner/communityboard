'use client'

import { useState } from 'react'

export default function ManagePage() {
  const [password, setPassword] = useState('')
  const [title, setTitle] = useState('')
  const [startAt, setStartAt] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [message, setMessage] = useState<string>('')

  async function submit() {
    setMessage('Saving...')
    const res = await fetch('/api/manage/create-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, title, start_at: startAt, status }),
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

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 640 }}>
      <h1>Manage</h1>

      <label style={{ display: 'block', marginTop: 12 }}>
        Admin password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ display: 'block', width: '100%', padding: 8, marginTop: 6 }}
        />
      </label>

      <hr style={{ margin: '1rem 0' }} />

      <label style={{ display: 'block', marginTop: 12 }}>
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ display: 'block', width: '100%', padding: 8, marginTop: 6 }}
          placeholder="e.g., Open Mic Night"
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
        onClick={submit}
        style={{ marginTop: 16, padding: '10px 14px' }}
        disabled={!password || !title || !startAt}
      >
        Create event
      </button>

      {message && <p style={{ marginTop: 12, opacity: 0.8 }}>{message}</p>}
    </main>
  )
}
