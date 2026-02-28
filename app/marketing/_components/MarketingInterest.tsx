'use client'

import { useMemo, useState } from 'react'

type Choice = {
  id: string
  label: string
  detail: string
}

const choices: Choice[] = [
  { id: 'want_local_board', label: 'I want this in my town', detail: 'A shared, chronological community board.' },
  { id: 'want_poster_photos', label: 'Poster photos are the point', detail: 'Keep the texture and context of real flyers.' },
  { id: 'want_no_infinite_feed', label: 'No infinite scrolling', detail: 'Completion and closure matter.' },
  { id: 'want_contribute', label: 'I would contribute posters', detail: 'I’d help by submitting and cleaning up entries.' },
  { id: 'want_ownership', label: 'Community-owned infrastructure', detail: 'Local control over data and governance.' },
  { id: 'want_notify', label: 'Notify me when it’s usable', detail: 'I’d want a link when it’s ready for real use.' },
]

async function postEvent(payload: any) {
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

export default function MarketingInterest() {
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)

  const pickedCount = useMemo(() => Object.values(picked).filter(Boolean).length, [picked])

  const toggle = async (c: Choice) => {
    setPicked(prev => {
      const next = { ...prev, [c.id]: !prev[c.id] }
      return next
    })

    await postEvent({
      name: 'marketing_interest_toggle',
      path: '/marketing',
      meta: { id: c.id, label: c.label },
      ts: new Date().toISOString(),
    })
  }

  const submit = async () => {
    setSent(true)
    await postEvent({
      name: 'marketing_interest_submit',
      path: '/marketing',
      meta: {
        picked: Object.entries(picked).filter(([, v]) => v).map(([k]) => k),
        email: email || null,
        note: note || null,
      },
      ts: new Date().toISOString(),
    })
  }

  return (
    <div className="mk-interest">
      <div className="mk-interestGrid">
        {choices.map(c => {
          const on = !!picked[c.id]
          return (
            <button
              key={c.id}
              type="button"
              className={`mk-choice ${on ? 'is-on' : ''}`}
              onClick={() => toggle(c)}
            >
              <div className="mk-choiceTitle">{c.label}</div>
              <div className="mk-choiceDetail">{c.detail}</div>
            </button>
          )
        })}
      </div>

      <div className="mk-interestMeta">
        <div className="mk-small">
          Selected: <b>{pickedCount}</b>
        </div>

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
          <div className="mk-label">One sentence of feedback (optional)</div>
          <textarea
            className="mk-textarea"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="What would make this genuinely useful in your town?"
            rows={3}
          />
        </label>

        <button type="button" className="mk-btn mk-btnPrimary" onClick={submit} disabled={sent}>
          {sent ? 'Thanks — noted' : 'Send'}
        </button>

        <div className="mk-small mk-dim">
          This records lightweight interest. It is meant to feel like part of the page, not a survey.
        </div>
      </div>
    </div>
  )
}
