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
