import type { Metadata } from 'next'
import MarketingInterest from './_components/MarketingInterest'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Marketing – Community Board',
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
            <Link href="/poster/e2e-fixture">
              See a live example
            </Link>
            <Link href="/browse">
              Browse (if available)
            </Link>
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

      
      <section className="mk-section">
        <div className="mk-container">
          <h2 className="mk-h2">Explore two “fake door” paths</h2>
          <p className="mk-body">
            These look like normal pages, but they’re really measuring interest depth.
            If people click through and leave a note, that’s signal.
          </p>
          <div className="mk-ctaRow" style={{ marginTop: 14 }}>
            <Link href="/marketing/stewards">Stewardship</Link>
            <Link href="/marketing/owners">Ownership</Link>
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
