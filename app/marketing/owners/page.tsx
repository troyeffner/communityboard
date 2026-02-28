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
            <Link href="/poster/e2e-fixture">See example</Link>
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
