#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

mkdir -p scripts
mkdir -p app/m
mkdir -p app/m/boards
mkdir -p app/m/posters
mkdir -p app/m/stewardship
mkdir -p app/api/marketing/event
mkdir -p app/api/marketing/summary
mkdir -p lib/marketing

###############################################################################
# 1) Minimal event sink (starts as log-to-console; easy to swap to DB later)
###############################################################################
cat > lib/marketing/events.ts <<'TS'
export type MarketingEventName =
  | "page_view"
  | "prompt_choice"
  | "false_door_click"
  | "cta_click"
  | "email_capture"

export type MarketingEvent = {
  name: MarketingEventName
  path: string
  ts: string
  // optional payload
  meta?: Record<string, unknown>
  // optional anon session id
  sid?: string
}

/**
 * Phase 0 storage: just log.
 * Phase 1: write to DB (Supabase).
 * Phase 2: aggregate metrics + dashboards.
 */
export async function recordMarketingEvent(evt: MarketingEvent) {
  // eslint-disable-next-line no-console
  console.log("[marketing-event]", JSON.stringify(evt))
}

/**
 * Phase 0 summary: returns "not implemented" until DB exists.
 * If you want a quick in-memory aggregator, we can add it,
 * but it resets on reload (dev server restart).
 */
export async function marketingSummary() {
  return {
    ok: true,
    note: "Summary not persisted yet. Events are logged to server console.",
  }
}
TS

###############################################################################
# 2) API endpoints: /api/marketing/event and /api/marketing/summary
###############################################################################
cat > app/api/marketing/event/route.ts <<'TS'
import { NextResponse } from "next/server"
import { recordMarketingEvent, type MarketingEvent } from "@/lib/marketing/events"

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<MarketingEvent>

    if (!body?.name || !body?.path) {
      return NextResponse.json({ ok: false, error: "Missing name/path" }, { status: 400 })
    }

    await recordMarketingEvent({
      name: body.name as any,
      path: body.path,
      ts: body.ts || new Date().toISOString(),
      meta: body.meta || {},
      sid: body.sid,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
TS

cat > app/api/marketing/summary/route.ts <<'TS'
import { NextResponse } from "next/server"
import { marketingSummary } from "@/lib/marketing/events"

export async function GET() {
  const data = await marketingSummary()
  return NextResponse.json(data)
}
TS

###############################################################################
# 3) Client helper: tiny analytics + "false door" + embedded prompts
###############################################################################
mkdir -p app/m/_components

cat > app/m/_components/marketingClient.ts <<'TS'
"use client"

function sid() {
  try {
    const key = "cb_marketing_sid"
    const existing = localStorage.getItem(key)
    if (existing) return existing
    const fresh = crypto.randomUUID()
    localStorage.setItem(key, fresh)
    return fresh
  } catch {
    return undefined
  }
}

export async function track(
  name: "page_view" | "prompt_choice" | "false_door_click" | "cta_click" | "email_capture",
  path: string,
  meta?: Record<string, unknown>
) {
  await fetch("/api/marketing/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      path,
      ts: new Date().toISOString(),
      sid: sid(),
      meta: meta || {},
    }),
  })
}
TS

cat > app/m/_components/PageView.tsx <<'TSX'
"use client"

import * as React from "react"
import { track } from "./marketingClient"

export function PageView({ path }: { path: string }) {
  React.useEffect(() => {
    void track("page_view", path)
  }, [path])
  return null
}
TSX

cat > app/m/_components/InlinePrompt.tsx <<'TSX'
"use client"

import * as React from "react"
import { track } from "./marketingClient"

type Choice = { id: string; label: string }

export function InlinePrompt(props: {
  path: string
  promptId: string
  title: string
  description?: string
  choices: Choice[]
}) {
  const { path, promptId, title, description, choices } = props
  const [picked, setPicked] = React.useState<string | null>(null)

  async function pick(id: string) {
    setPicked(id)
    await track("prompt_choice", path, { promptId, choiceId: id })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="space-y-1">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {description ? <div className="text-sm text-slate-600">{description}</div> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {choices.map((c) => (
          <button
            key={c.id}
            onClick={() => pick(c.id)}
            className={[
              "px-3 py-1.5 text-sm rounded-full border",
              picked === c.id
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
            ].join(" ")}
          >
            {c.label}
          </button>
        ))}
      </div>

      {picked ? (
        <div className="text-xs text-slate-500">
          Noted. This page is being shaped by real signal, not assumptions.
        </div>
      ) : null}
    </div>
  )
}
TSX

cat > app/m/_components/FalseDoorCTA.tsx <<'TSX'
"use client"

import * as React from "react"
import { track } from "./marketingClient"

export function FalseDoorCTA(props: {
  path: string
  ctaId: string
  label: string
  detail?: string
}) {
  const { path, ctaId, label, detail } = props
  const [open, setOpen] = React.useState(false)

  async function click() {
    await track("false_door_click", path, { ctaId })
    setOpen(true)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <button
        onClick={click}
        className="w-full rounded-lg bg-slate-900 text-white text-sm font-medium py-2 hover:bg-slate-800"
      >
        {label}
      </button>

      {detail ? <div className="text-sm text-slate-600">{detail}</div> : null}

      {open ? (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
          This is not live yet. Your click still counted — it tells me what to build next.
        </div>
      ) : null}
    </div>
  )
}
TSX

cat > app/m/_components/EmailCapture.tsx <<'TSX'
"use client"

import * as React from "react"
import { track } from "./marketingClient"

export function EmailCapture({ path }: { path: string }) {
  const [email, setEmail] = React.useState("")
  const [sent, setSent] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    await track("email_capture", path, { email })
    setSent(true)
    setEmail("")
  }

  if (sent) {
    return (
      <div className="text-sm text-slate-700">
        Noted. If/when this becomes real, you’ll be the first to know.
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        placeholder="Email for updates (optional)"
      />
      <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
        Send
      </button>
    </form>
  )
}
TSX

###############################################################################
# 4) Minimal shared layout for marketing pages
###############################################################################
cat > app/m/layout.tsx <<'TSX'
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {children}
      </div>
    </div>
  )
}
TSX

###############################################################################
# 5) Pages: /m, /m/boards, /m/posters, /m/stewardship
###############################################################################
cat > app/m/page.tsx <<'TSX'
import Link from "next/link"
import { PageView } from "./_components/PageView"
import { InlinePrompt } from "./_components/InlinePrompt"
import { EmailCapture } from "./_components/EmailCapture"

const PATH = "/m"

export default function MarketingHome() {
  return (
    <main className="space-y-10">
      <PageView path={PATH} />

      <header className="space-y-3">
        <div className="text-xs text-slate-500">Community Board</div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          A small tool for real places.
        </h1>
        <p className="text-slate-700 leading-relaxed">
          This is a local-first community board that starts with what already exists:
          posters, flyers, and bulletin boards. The goal is not scale. The goal is usefulness.
        </p>
      </header>

      <section className="grid md:grid-cols-3 gap-4">
        <Link href="/m/posters" className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
          <div className="text-sm font-semibold">Posters → Listings</div>
          <div className="text-sm text-slate-600">Turn real bulletin boards into navigable events.</div>
        </Link>
        <Link href="/m/boards" className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
          <div className="text-sm font-semibold">Shared Board</div>
          <div className="text-sm text-slate-600">A finite feed that lets you reach the bottom.</div>
        </Link>
        <Link href="/m/stewardship" className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
          <div className="text-sm font-semibold">Stewardship</div>
          <div className="text-sm text-slate-600">Community runs the program. Tools just help.</div>
        </Link>
      </section>

      <InlinePrompt
        path={PATH}
        promptId="who_is_this_for"
        title="If this existed in your town, who would it help most?"
        description="Pick the closest fit. No long form. Just signal."
        choices={[
          { id: "nonprofits", label: "Nonprofits & organizers" },
          { id: "artists", label: "Artists & venues" },
          { id: "neighbors", label: "Neighbors who avoid socials" },
          { id: "smallbiz", label: "Small businesses" },
          { id: "other", label: "Other" },
        ]}
      />

      <InlinePrompt
        path={PATH}
        promptId="anchor_metaphor"
        title="What should the core metaphor be?"
        description="Metaphor is governance. The origin frame changes everything."
        choices={[
          { id: "board", label: "Shared board" },
          { id: "feed", label: "Finite feed" },
          { id: "archive", label: "Local archive" },
          { id: "map", label: "Local map" },
        ]}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-sm font-semibold">Want to see where this goes?</div>
        <div className="text-sm text-slate-600">
          Optional. No spam. This is just for early neighbors.
        </div>
        <EmailCapture path={PATH} />
      </section>

      <footer className="text-xs text-slate-500 pt-8">
        This page is also the feedback loop. Every click is a hypothesis test.
      </footer>
    </main>
  )
}
TSX

cat > app/m/posters/page.tsx <<'TSX'
import { PageView } from "../_components/PageView"
import { InlinePrompt } from "../_components/InlinePrompt"
import { FalseDoorCTA } from "../_components/FalseDoorCTA"

const PATH = "/m/posters"

export default function PostersStorefront() {
  return (
    <main className="space-y-10">
      <PageView path={PATH} />

      <header className="space-y-2">
        <div className="text-xs text-slate-500">Hypothesis Storefront</div>
        <h1 className="text-2xl font-semibold">Preserve texture</h1>
        <p className="text-slate-700 leading-relaxed">
          A photo of a physical poster contains social signal that structured data erases.
          This system starts with posters and translates them, instead of flattening them.
        </p>
      </header>

      <InlinePrompt
        path={PATH}
        promptId="poster_trust_signal"
        title="What makes you trust a local listing?"
        choices={[
          { id: "photo", label: "Photo of the real poster" },
          { id: "venue", label: "Venue name + address" },
          { id: "organizer", label: "Organizer info" },
          { id: "history", label: "Past events history" },
        ]}
      />

      <FalseDoorCTA
        path={PATH}
        ctaId="upload_poster_interest"
        label="Upload a poster photo (false door)"
        detail="If this button gets clicks, it tells me to prioritize a public submission flow."
      />
    </main>
  )
}
TSX

cat > app/m/boards/page.tsx <<'TSX'
import { PageView } from "../_components/PageView"
import { InlinePrompt } from "../_components/InlinePrompt"
import { FalseDoorCTA } from "../_components/FalseDoorCTA"

const PATH = "/m/boards"

export default function BoardsStorefront() {
  return (
    <main className="space-y-10">
      <PageView path={PATH} />

      <header className="space-y-2">
        <div className="text-xs text-slate-500">Hypothesis Storefront</div>
        <h1 className="text-2xl font-semibold">Chronology is orientation</h1>
        <p className="text-slate-700 leading-relaxed">
          People want to reach the bottom. Completion creates calm.
          This is designed as a finite, time-based system — not an infinite scroll machine.
        </p>
      </header>

      <InlinePrompt
        path={PATH}
        promptId="finite_vs_infinite"
        title="What should the default experience be?"
        choices={[
          { id: "finite", label: "Finite list + you're caught up" },
          { id: "infinite", label: "Infinite feed" },
          { id: "digest", label: "Daily / weekly digest" },
          { id: "calendar", label: "Calendar-first" },
        ]}
      />

      <FalseDoorCTA
        path={PATH}
        ctaId="start_board_interest"
        label="Start a neighborhood board (false door)"
        detail="This would create a board for a venue, a street, or a town. Not live yet."
      />
    </main>
  )
}
TSX

cat > app/m/stewardship/page.tsx <<'TSX'
import { PageView } from "../_components/PageView"
import { InlinePrompt } from "../_components/InlinePrompt"
import { FalseDoorCTA } from "../_components/FalseDoorCTA"

const PATH = "/m/stewardship"

export default function StewardshipStorefront() {
  return (
    <main className="space-y-10">
      <PageView path={PATH} />

      <header className="space-y-2">
        <div className="text-xs text-slate-500">Hypothesis Storefront</div>
        <h1 className="text-2xl font-semibold">AI builds the platform. Community runs the program.</h1>
        <p className="text-slate-700 leading-relaxed">
          Automation scaffolds; community animates. Participation creates ownership.
          The value comes from people doing the work, not from perfect UI.
        </p>
      </header>

      <InlinePrompt
        path={PATH}
        promptId="steward_model"
        title="If this worked in your town, who should steward it?"
        choices={[
          { id: "library", label: "Library" },
          { id: "volunteers", label: "Volunteers" },
          { id: "town", label: "Town / city staff" },
          { id: "venue_network", label: "Network of venues" },
        ]}
      />

      <FalseDoorCTA
        path={PATH}
        ctaId="become_steward_interest"
        label="I would help steward this (false door)"
        detail="Clicking records interest. Later we can add a real pathway."
      />
    </main>
  )
}
TSX

###############################################################################
# 6) Add a simple link from root landing (optional; NOT inside app nav)
###############################################################################
echo "Done."
echo ""
echo "Start dev:"
echo "  npm run dev"
echo ""
echo "Open:"
echo "  http://localhost:3000/m"
echo "  http://localhost:3000/api/marketing/summary"
echo ""
echo "Watch events in your dev server console:"
echo "  [marketing-event] { ... }"
