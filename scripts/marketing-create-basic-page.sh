#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

# ------------------------------------------------------------
# Creates:
# - /marketing (shareable marketing page, not linked anywhere)
# - a tiny client component for "fake door" interest capture
# - a minimal CSS block (scoped classes) appended to globals.css
# ------------------------------------------------------------

mkdir -p app/marketing
mkdir -p app/marketing/_components

PAGE="app/marketing/page.tsx"
CLIENT="app/marketing/_components/MarketingInterest.tsx"
CSS_FILE="app/globals.css"

if [[ -f "$PAGE" ]]; then
  echo "OK: $PAGE already exists (won't overwrite)."
else
  cat > "$PAGE" <<'TSX'
import MarketingInterest from './_components/MarketingInterest'

export const metadata = {
  title: 'CommunityBoard — A local community events board',
  description:
    'A simple community board that turns real-world posters into a shared, chronological listing. Built for thousands, not millions.',
}

export default function MarketingPage() {
  return (
    <main className="mk-page">
      <header className="mk-hero">
        <div className="mk-container">
          <div className="mk-kicker">CommunityBoard</div>
          <h1 className="mk-h1">A community events board for the place you actually live.</h1>
          <p className="mk-lede">
            Take photos of posters in coffee shops. Turn them into a shared, chronological board.
            No endless feeds. No engagement traps. Just “what’s happening” and “when.”
          </p>

          <div className="mk-ctaRow">
            <a className="mk-btn mk-btnPrimary" href="/poster/e2e-fixture">
              See a live example
            </a>
            <a className="mk-btn mk-btnGhost" href="/browse">
              Browse (if available)
            </a>
          </div>

          <div className="mk-note">
            This page is intentionally not linked in the app UI. It’s for sharing the idea and collecting signal.
          </div>
        </div>
      </header>

      <section className="mk-section">
        <div className="mk-container mk-grid2">
          <div>
            <h2 className="mk-h2">What it is</h2>
            <ul className="mk-list">
              <li><b>Poster-first:</b> keep the texture of real flyers and bulletin boards.</li>
              <li><b>Chronological:</b> you can reach the bottom; completion creates calm.</li>
              <li><b>Honest:</b> “No events tonight” is real information, not a failure state.</li>
              <li><b>Local by design:</b> built for thousands, not millions.</li>
            </ul>
          </div>

          <div>
            <h2 className="mk-h2">What it isn’t</h2>
            <ul className="mk-list">
              <li>Not a social network.</li>
              <li>Not a growth funnel.</li>
              <li>Not an infinite feed.</li>
              <li>Not “AI as identity.” AI is infrastructure; community is the program.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mk-section mk-surface">
        <div className="mk-container">
          <h2 className="mk-h2">Core thesis</h2>
          <p className="mk-body">
            When the cost of building collapsed, the center of value shifted from polish to framing.
            Communities can now design and govern their own digital infrastructure. That redistribution
            of design power is the real transformation underway.
          </p>

          <div className="mk-divider" />

          <h3 className="mk-h3">The values this is built to embody</h3>
          <div className="mk-cards3">
            <div className="mk-card">
              <div className="mk-cardTitle">Build for Thousands, Not Millions</div>
              <div className="mk-cardBody">Local usefulness beats abstract scale. Neighbors create accountability.</div>
            </div>
            <div className="mk-card">
              <div className="mk-cardTitle">Chronology Is Orientation</div>
              <div className="mk-cardBody">Finite lists reduce stress. “You’re caught up” is a feature.</div>
            </div>
            <div className="mk-card">
              <div className="mk-cardTitle">Delight Is Relief</div>
              <div className="mk-cardBody">Solving real confusion beats decoration. Function builds trust.</div>
            </div>
          </div>

          <div className="mk-cards3">
            <div className="mk-card">
              <div className="mk-cardTitle">Preserve Texture</div>
              <div className="mk-cardBody">A photo of a poster carries social signal structured data erases.</div>
            </div>
            <div className="mk-card">
              <div className="mk-cardTitle">Design Is Governance</div>
              <div className="mk-cardBody">Metaphor and permissions encode power and collaboration.</div>
            </div>
            <div className="mk-card">
              <div className="mk-cardTitle">Restraint Is a Design Choice</div>
              <div className="mk-cardBody">Not everything should be automated. Some friction preserves participation.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-container mk-grid2">
          <div>
            <h2 className="mk-h2">How it could work (simple version)</h2>
            <ol className="mk-steps">
              <li><b>Snap:</b> take a photo of a poster.</li>
              <li><b>Extract:</b> AI suggests title, date/time, location, tags.</li>
              <li><b>Confirm:</b> a human checks it (stewardship beats automation).</li>
              <li><b>Publish:</b> it lands in a chronological feed with closure.</li>
            </ol>
          </div>

          <div>
            <h2 className="mk-h2">Help shape it</h2>
            <p className="mk-body">
              I’m collecting signal in a way that feels like part of the flow, not “a survey.”
              Click what you’d want, and it will record lightweight interest.
            </p>
            <MarketingInterest />
          </div>
        </div>
      </section>

      <footer className="mk-footer">
        <div className="mk-container mk-footerInner">
          <div className="mk-footerTitle">CommunityBoard</div>
          <div className="mk-footerMeta">
            Built for real places. Useful over glossy. Human-scale infrastructure.
          </div>
        </div>
      </footer>
    </main>
  )
}
TSX
  echo "CREATED: $PAGE"
fi

if [[ -f "$CLIENT" ]]; then
  echo "OK: $CLIENT already exists (won't overwrite)."
else
  cat > "$CLIENT" <<'TSX'
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
TSX
  echo "CREATED: $CLIENT"
fi

# Append CSS once (guarded by marker)
MARKER="/* marketing-page styles */"
if [[ -f "$CSS_FILE" ]] && grep -qF "$MARKER" "$CSS_FILE"; then
  echo "OK: globals.css already contains marketing styles."
else
  cat >> "$CSS_FILE" <<'CSS'

/* marketing-page styles */
.mk-page {
  min-height: 100vh;
  background: #0b0c0f;
  color: #eaeaf0;
}

.mk-container {
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  padding: 0 16px;
}

.mk-hero {
  padding: 56px 0 28px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background:
    radial-gradient(1200px 600px at 20% -10%, rgba(99, 102, 241, 0.24), transparent 60%),
    radial-gradient(800px 500px at 90% 10%, rgba(16, 185, 129, 0.18), transparent 60%),
    #0b0c0f;
}

.mk-kicker {
  font-size: 13px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(234,234,240,0.72);
  margin-bottom: 10px;
}

.mk-h1 {
  font-size: 40px;
  line-height: 1.08;
  margin: 0 0 12px;
  letter-spacing: -0.02em;
}

.mk-lede {
  font-size: 18px;
  line-height: 1.5;
  color: rgba(234,234,240,0.82);
  max-width: 56ch;
  margin: 0 0 18px;
}

.mk-ctaRow {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin: 18px 0 10px;
}

.mk-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 42px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.16);
  text-decoration: none;
  color: #eaeaf0;
  background: rgba(255,255,255,0.06);
  cursor: pointer;
  font-weight: 600;
}

.mk-btnPrimary {
  background: rgba(99, 102, 241, 0.22);
  border-color: rgba(99, 102, 241, 0.55);
}

.mk-btnGhost {
  background: rgba(255,255,255,0.04);
}

.mk-note {
  margin-top: 10px;
  font-size: 13px;
  color: rgba(234,234,240,0.62);
}

.mk-section {
  padding: 28px 0;
}

.mk-surface {
  background: rgba(255,255,255,0.03);
  border-top: 1px solid rgba(255,255,255,0.07);
  border-bottom: 1px solid rgba(255,255,255,0.07);
}

.mk-grid2 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
}

@media (min-width: 900px) {
  .mk-grid2 { grid-template-columns: 1fr 1fr; gap: 24px; }
}

.mk-h2 {
  font-size: 22px;
  margin: 0 0 10px;
  letter-spacing: -0.01em;
}

.mk-h3 {
  font-size: 18px;
  margin: 0 0 10px;
  color: rgba(234,234,240,0.92);
}

.mk-body {
  font-size: 16px;
  line-height: 1.6;
  color: rgba(234,234,240,0.82);
  margin: 0;
  max-width: 72ch;
}

.mk-list {
  margin: 0;
  padding-left: 18px;
  color: rgba(234,234,240,0.82);
}

.mk-list li { margin: 8px 0; }

.mk-steps {
  margin: 0;
  padding-left: 18px;
  color: rgba(234,234,240,0.82);
}

.mk-steps li { margin: 10px 0; }

.mk-divider {
  height: 1px;
  background: rgba(255,255,255,0.08);
  margin: 18px 0;
}

.mk-cards3 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin: 12px 0;
}

@media (min-width: 900px) {
  .mk-cards3 { grid-template-columns: 1fr 1fr 1fr; }
}

.mk-card {
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  border-radius: 14px;
  padding: 14px;
}

.mk-cardTitle {
  font-weight: 700;
  margin-bottom: 6px;
}

.mk-cardBody {
  color: rgba(234,234,240,0.74);
  line-height: 1.45;
  font-size: 14px;
}

.mk-interest {
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  border-radius: 14px;
  padding: 14px;
}

.mk-interestGrid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

@media (min-width: 600px) {
  .mk-interestGrid { grid-template-columns: 1fr 1fr; }
}

.mk-choice {
  text-align: left;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  color: #eaeaf0;
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
}

.mk-choice.is-on {
  border-color: rgba(16, 185, 129, 0.55);
  background: rgba(16, 185, 129, 0.14);
}

.mk-choiceTitle { font-weight: 700; margin-bottom: 4px; }
.mk-choiceDetail { color: rgba(234,234,240,0.72); font-size: 13px; line-height: 1.35; }

.mk-interestMeta {
  margin-top: 12px;
  display: grid;
  gap: 10px;
}

.mk-field { display: grid; gap: 6px; }
.mk-label { font-size: 12px; color: rgba(234,234,240,0.72); }

.mk-input, .mk-textarea {
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.25);
  color: #eaeaf0;
  padding: 10px 12px;
  outline: none;
}

.mk-small { font-size: 12px; color: rgba(234,234,240,0.72); }
.mk-dim { color: rgba(234,234,240,0.58); }

.mk-footer {
  padding: 22px 0 36px;
  border-top: 1px solid rgba(255,255,255,0.08);
}

.mk-footerInner {
  display: grid;
  gap: 6px;
}

.mk-footerTitle { font-weight: 800; letter-spacing: -0.01em; }
.mk-footerMeta { font-size: 13px; color: rgba(234,234,240,0.62); }
CSS
  echo "UPDATED: appended marketing CSS to $CSS_FILE"
fi

echo ""
echo "DONE."
echo "Start dev server, then open:"
echo "  http://localhost:3000/marketing"
echo ""
echo "Telemetry endpoint used by the page:"
echo "  POST /api/marketing/event"
