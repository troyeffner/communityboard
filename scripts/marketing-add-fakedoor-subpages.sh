#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

mkdir -p app/marketing/stewards
mkdir -p app/marketing/owners

STEWARD="app/marketing/stewards/page.tsx"
OWNERS="app/marketing/owners/page.tsx"
HUB="app/marketing/page.tsx"

# --- create stewards page ---
cat > "$STEWARD" <<'TSX'
import Link from 'next/link'
import MarketingDoor from '../_components/MarketingDoor'

export const metadata = {
  title: 'CommunityBoard — Stewards',
  description: 'Signal interest in contributing posters and stewarding a local board.',
}

export default function StewardsPage() {
  return (
    <main className="mk-page">
      <header className="mk-hero">
        <div className="mk-container">
          <div className="mk-kicker">CommunityBoard</div>
          <h1 className="mk-h1">Stewardship: the board works because people do.</h1>
          <p className="mk-lede">
            AI can scaffold the infrastructure, but a local board lives or dies by human participation.
            This is the “community runs the program” part.
          </p>

          <div className="mk-ctaRow">
            <Link className="mk-btn mk-btnGhost" href="/marketing">Back</Link>
            <a className="mk-btn mk-btnPrimary" href="/poster/e2e-fixture">See example</a>
          </div>
        </div>
      </header>

      <section className="mk-section">
        <div className="mk-container mk-grid2">
          <div>
            <h2 className="mk-h2">What stewardship looks like</h2>
            <ul className="mk-list">
              <li>Take photos of posters when you see them.</li>
              <li>Confirm title / time / place (human check beats automation).</li>
              <li>Optionally tag and group things in a way that matches local reality.</li>
              <li>Accept that some nights are quiet. “Nothing tonight” is honest.</li>
            </ul>
          </div>

          <div>
            <h2 className="mk-h2">Signal interest</h2>
            <p className="mk-body">
              This is a fake-door test. Clicking and leaving a note helps me understand
              whether “stewardship” is a real draw or an abstract idea.
            </p>
            <div style={{ height: 12 }} />
            <MarketingDoor doorId="stewards_interest" doorLabel="I would contribute as a steward" />
          </div>
        </div>
      </section>
    </main>
  )
}
TSX

# --- create owners page ---
cat > "$OWNERS" <<'TSX'
import Link from 'next/link'
import MarketingDoor from '../_components/MarketingDoor'

export const metadata = {
  title: 'CommunityBoard — Ownership',
  description: 'Signal interest in community-owned infrastructure and governance.',
}

export default function OwnersPage() {
  return (
    <main className="mk-page">
      <header className="mk-hero">
        <div className="mk-container">
          <div className="mk-kicker">CommunityBoard</div>
          <h1 className="mk-h1">Ownership changes power.</h1>
          <p className="mk-lede">
            When communities own the infrastructure, incentives shift.
            Usefulness beats engagement. Policies reflect local values. Dependency drops.
          </p>

          <div className="mk-ctaRow">
            <Link className="mk-btn mk-btnGhost" href="/marketing">Back</Link>
            <a className="mk-btn mk-btnPrimary" href="/poster/e2e-fixture">See example</a>
          </div>
        </div>
      </header>

      <section className="mk-section">
        <div className="mk-container mk-grid2">
          <div>
            <h2 className="mk-h2">What “owned” could mean (practical)</h2>
            <ul className="mk-list">
              <li>Local hosting or a co-op model.</li>
              <li>Transparent policies for data and visibility.</li>
              <li>Governance that matches how the town actually works.</li>
              <li>Small scope with high accountability.</li>
            </ul>
          </div>

          <div>
            <h2 className="mk-h2">Signal interest</h2>
            <p className="mk-body">
              Another fake-door test. If this resonates, I want to know.
            </p>
            <div style={{ height: 12 }} />
            <MarketingDoor doorId="owners_interest" doorLabel="I care about community ownership" />
          </div>
        </div>
      </section>
    </main>
  )
}
TSX

# --- ensure MarketingDoor component exists ---
mkdir -p app/marketing/_components
DOOR="app/marketing/_components/MarketingDoor.tsx"

cat > "$DOOR" <<'TSX'
'use client'

import { useState } from 'react'

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
TSX

# --- patch hub page to link to subpages (only if hub exists) ---
if [[ -f "$HUB" ]]; then
  python3 - <<'PY'
from pathlib import Path
import re

p = Path("app/marketing/page.tsx")
s = p.read_text(encoding="utf-8")

if "/marketing/stewards" in s and "/marketing/owners" in s:
  print("OK: hub already links to subpages")
  raise SystemExit(0)

# Insert a small section before footer
insert = """
      <section className="mk-section">
        <div className="mk-container">
          <h2 className="mk-h2">Explore two “fake door” paths</h2>
          <p className="mk-body">
            These look like normal pages, but they’re really measuring interest depth.
            If people click through and leave a note, that’s signal.
          </p>
          <div className="mk-ctaRow" style={{ marginTop: 14 }}>
            <a className="mk-btn mk-btnPrimary" href="/marketing/stewards">Stewardship</a>
            <a className="mk-btn mk-btnPrimary" href="/marketing/owners">Ownership</a>
          </div>
        </div>
      </section>
"""

# naive: put before </footer> if present, else append end
if "</footer>" in s:
  s = s.replace("<footer", insert + "\n\n      <footer", 1)
else:
  s = s + "\n" + insert

p.write_text(s, encoding="utf-8")
print("PATCHED: added links to /marketing/stewards and /marketing/owners")
PY
else
  echo "NOTE: $HUB not found. (Run your basic marketing page script first.)"
fi

echo "CREATED:"
echo "  $STEWARD"
echo "  $OWNERS"
echo "  $DOOR"
echo ""
echo "Now open:"
echo "  http://localhost:3000/marketing"
echo "  http://localhost:3000/marketing/stewards"
echo "  http://localhost:3000/marketing/owners"
