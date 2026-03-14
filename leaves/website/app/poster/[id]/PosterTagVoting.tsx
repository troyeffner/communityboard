'use client'

import { useEffect, useMemo, useState } from 'react'

type TagRow = {
  id: string
  label: string
  kind?: string | null
  slug?: string | null
}

type EventTagBundle = {
  official: TagRow[]
  suggested: Array<TagRow & { votes: number }>
}

type EventItem = {
  event_id: string
  title: string
}

function uniqEvents(events: EventItem[]) {
  const seen = new Set<string>()
  const out: EventItem[] = []
  for (const event of events) {
    if (seen.has(event.event_id)) continue
    seen.add(event.event_id)
    out.push(event)
  }
  return out
}

export default function PosterTagVoting({
  events,
  initialTagsByEvent,
}: {
  events: EventItem[]
  initialTagsByEvent: Record<string, EventTagBundle>
}) {
  const [tagsByEvent, setTagsByEvent] = useState<Record<string, EventTagBundle>>(initialTagsByEvent)
  const [cbVid, setCbVid] = useState('')
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [pendingKey, setPendingKey] = useState<Record<string, boolean>>({})
  const [errorByEvent, setErrorByEvent] = useState<Record<string, string>>({})
  const [pickerOpen, setPickerOpen] = useState(false)
  const uniqueEvents = useMemo(() => uniqEvents(events), [events])

  useEffect(() => {
    setTagsByEvent(initialTagsByEvent)
  }, [initialTagsByEvent])

  useEffect(() => {
    const onOpenPicker = (event: Event) => {
      setPickerOpen(true)
      const custom = event as CustomEvent<{ eventId?: string }>
      const targetEventId = custom.detail?.eventId || uniqueEvents[0]?.event_id || ''
      if (!targetEventId) return
      window.requestAnimationFrame(() => {
        const el = document.getElementById(`tag-input-${targetEventId}`) as HTMLInputElement | null
        el?.focus()
      })
    }
    window.addEventListener('cb-open-tag-picker', onOpenPicker)
    return () => window.removeEventListener('cb-open-tag-picker', onOpenPicker)
  }, [uniqueEvents])

  useEffect(() => {
    try {
      let value = window.localStorage.getItem('cb_vid') || ''
      if (!value) {
        value = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `cb_${Date.now()}_${Math.random().toString(16).slice(2)}`
        window.localStorage.setItem('cb_vid', value)
      }
      setCbVid(value)
    } catch {
      setCbVid('')
    }
  }, [])

  async function voteTag(eventId: string, tagId: string) {
    const key = `${eventId}:${tagId}`
    setPendingKey((prev) => ({ ...prev, [key]: true }))
    setErrorByEvent((prev) => ({ ...prev, [eventId]: '' }))
    try {
      const res = await fetch('/api/public/tag/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cbVid ? { 'x-cb-vid': cbVid } : {}),
        },
        body: JSON.stringify({ event_id: eventId, tag_id: tagId }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error || 'Vote failed')
      const nextVotes = Number(payload?.votes || 0)
      const promoted = Boolean(payload?.promoted)

      setTagsByEvent((prev) => {
        const current = prev[eventId] || { official: [], suggested: [] }
        const target = current.suggested.find((tag) => tag.id === tagId)
        if (!target) return prev
        const nextSuggested = current.suggested
          .map((tag) => (tag.id === tagId ? { ...tag, votes: nextVotes } : tag))
          .sort((a, b) => b.votes - a.votes || a.label.localeCompare(b.label))
        if (!promoted) {
          return { ...prev, [eventId]: { ...current, suggested: nextSuggested } }
        }
        const promotedTag = nextSuggested.find((tag) => tag.id === tagId) || target
        const official = current.official.some((tag) => tag.id === promotedTag.id)
          ? current.official
          : [...current.official, promotedTag].sort((a, b) => a.label.localeCompare(b.label))
        return {
          ...prev,
          [eventId]: {
            official,
            suggested: nextSuggested.filter((tag) => tag.id !== tagId),
          },
        }
      })
    } catch (err) {
      setErrorByEvent((prev) => ({
        ...prev,
        [eventId]: err instanceof Error ? err.message : 'Vote failed',
      }))
    } finally {
      setPendingKey((prev) => ({ ...prev, [key]: false }))
    }
  }

  async function suggestTag(eventId: string) {
    const label = (inputs[eventId] || '').trim()
    if (!label) return
    const key = `${eventId}:suggest`
    setPendingKey((prev) => ({ ...prev, [key]: true }))
    setErrorByEvent((prev) => ({ ...prev, [eventId]: '' }))
    try {
      const res = await fetch('/api/public/tag/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cbVid ? { 'x-cb-vid': cbVid } : {}),
        },
        body: JSON.stringify({ event_id: eventId, label }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error || 'Suggest failed')

      const tag = payload?.tag as TagRow | undefined
      const votes = Number(payload?.votes || 1)
      const promoted = Boolean(payload?.promoted)
      if (!tag?.id) return

      setTagsByEvent((prev) => {
        const current = prev[eventId] || { official: [], suggested: [] }
        const withoutSuggested = current.suggested.filter((item) => item.id !== tag.id)
        if (promoted) {
          const official = current.official.some((item) => item.id === tag.id)
            ? current.official
            : [...current.official, tag].sort((a, b) => a.label.localeCompare(b.label))
          return { ...prev, [eventId]: { official, suggested: withoutSuggested } }
        }
        const suggested = [...withoutSuggested, { ...tag, votes }]
          .sort((a, b) => b.votes - a.votes || a.label.localeCompare(b.label))
        return { ...prev, [eventId]: { official: current.official, suggested } }
      })
      setInputs((prev) => ({ ...prev, [eventId]: '' }))
    } catch (err) {
      setErrorByEvent((prev) => ({
        ...prev,
        [eventId]: err instanceof Error ? err.message : 'Suggest failed',
      }))
    } finally {
      setPendingKey((prev) => ({ ...prev, [key]: false }))
    }
  }

  if (uniqueEvents.length === 0) return null

  return (
    <section id="help-identify-board" style={{ marginTop: 16 }}>
      <details
        open={pickerOpen}
        onToggle={(e) => setPickerOpen((e.currentTarget as HTMLDetailsElement).open)}
        style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff' }}
      >
        <summary style={{ cursor: 'pointer', fontWeight: 700, userSelect: 'none' }}>Suggest tags</summary>
        <p style={{ margin: '8px 0 10px 0', fontSize: 14, opacity: 0.9 }}>
          Help tend this listing. Pin tags that fit each item.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          {uniqueEvents.map((event) => {
            const bundle = tagsByEvent[event.event_id] || { official: [], suggested: [] }
            return (
              <article
                key={event.event_id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 12,
                  background: '#fff',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{event.title}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, opacity: 0.8 }}>Official tags</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {bundle.official.length === 0 ? (
                      <span style={{ fontSize: 13, opacity: 0.65 }}>None yet.</span>
                    ) : (
                      bundle.official.map((tag) => (
                        <span
                          key={tag.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            minHeight: 28,
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: '#1d4ed8',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {tag.label}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, opacity: 0.8 }}>Suggested tags</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {bundle.suggested.length === 0 ? (
                      <span style={{ fontSize: 13, opacity: 0.65 }}>No suggestions yet.</span>
                    ) : (
                      bundle.suggested.map((tag) => {
                        const voteKey = `${event.event_id}:${tag.id}`
                        return (
                          <span
                            key={tag.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              minHeight: 30,
                              padding: '4px 8px',
                              borderRadius: 999,
                              border: '1px solid #cbd5e1',
                              background: '#f8fafc',
                            }}
                          >
                            <span style={{ fontSize: 12 }}>{tag.label} ({tag.votes})</span>
                            <button
                              type="button"
                              onClick={() => voteTag(event.event_id, tag.id)}
                              disabled={Boolean(pendingKey[voteKey])}
                              title="Pin tag to board"
                              style={{
                                border: '1px solid #94a3b8',
                                background: '#fff',
                                color: '#111827',
                                borderRadius: 999,
                                width: 22,
                                height: 22,
                                fontSize: 14,
                                fontWeight: 700,
                                lineHeight: '20px',
                                padding: 0,
                                cursor: 'pointer',
                              }}
                            >
                              +
                            </button>
                          </span>
                        )
                      })
                    )}
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    void suggestTag(event.event_id)
                  }}
                  style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
                >
                  <input
                    id={`tag-input-${event.event_id}`}
                    value={inputs[event.event_id] || ''}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [event.event_id]: e.target.value }))}
                    placeholder="Suggest a tag"
                    aria-label={`Suggest a tag for ${event.title}`}
                    style={{
                      flex: '1 1 220px',
                      minWidth: 0,
                      minHeight: 40,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                    }}
                  />
                  <button
                    type="submit"
                    data-variant="secondary"
                    disabled={Boolean(pendingKey[`${event.event_id}:suggest`]) || !(inputs[event.event_id] || '').trim()}
                  >
                    Add
                  </button>
                </form>
                {errorByEvent[event.event_id] && (
                  <p style={{ margin: 0, color: 'crimson', fontSize: 13 }}>{errorByEvent[event.event_id]}</p>
                )}
                </div>
              </article>
            )
          })}
        </div>
      </details>
    </section>
  )
}
