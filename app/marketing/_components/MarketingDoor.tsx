'use client'

import { useState } from 'react'

async function postEvent(payload: unknown) {
  try {
    await fetch('/api/marketing/event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // ignore
  }
}

export default function MarketingDoor(props: { doorId: string; doorLabel: string }) {
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)

  const click = async () => {
    await postEvent({
      name: 'marketing_fake_door_click',
      path: typeof window !== 'undefined' ? window.location.pathname : '',
      meta: { doorId: props.doorId, doorLabel: props.doorLabel },
      ts: new Date().toISOString(),
    })
  }

  const submit = async () => {
    setSent(true)
    await postEvent({
      name: 'marketing_fake_door_submit',
      path: typeof window !== 'undefined' ? window.location.pathname : '',
      meta: {
        doorId: props.doorId,
        doorLabel: props.doorLabel,
        email: email || null,
        note: note || null,
      },
      ts: new Date().toISOString(),
    })
  }

  return (
    <div className="mk-interest">
      <button type="button" className="mk-btn mk-btnPrimary" onClick={click}>
        {props.doorLabel}
      </button>

      <div style={{ height: 10 }} />

      <label className="mk-field">
        <div className="mk-label">Email (optional)</div>
        <input
          className="mk-input"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          inputMode="email"
        />
      </label>

      <label className="mk-field">
        <div className="mk-label">One sentence (optional)</div>
        <textarea
          className="mk-textarea"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="What would make this feel worth contributing to?"
          rows={3}
        />
      </label>

      <button type="button" className="mk-btn mk-btnGhost" onClick={submit} disabled={sent}>
        {sent ? 'Thanks — noted' : 'Send'}
      </button>
    </div>
  )
}
