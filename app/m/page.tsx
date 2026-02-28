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
