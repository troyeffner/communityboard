import fs from 'node:fs'
import path from 'node:path'

export const metadata = {
  title: 'CommunityBoard — Marketing Admin',
  description: 'Local rollup of marketing interest events (dev-only storage).',
}

type Evt = {
  name?: string
  path?: string
  ts?: string
  meta?: any
  _meta?: any
}

function readEvents(): Evt[] {
  const fp = path.join(process.cwd(), '.local', 'marketing-events.ndjson')
  if (!fs.existsSync(fp)) return []
  const raw = fs.readFileSync(fp, 'utf-8')
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const out: Evt[] = []
  for (const line of lines) {
    try {
      out.push(JSON.parse(line))
    } catch {
      // ignore bad line
    }
  }
  return out
}

function safeStr(v: any) {
  if (typeof v === 'string') return v
  return v == null ? '' : String(v)
}

export default function MarketingAdminPage() {
  const events = readEvents().sort((a, b) => safeStr(b.ts).localeCompare(safeStr(a.ts)))

  const clicks = events.filter(e => e.name === 'marketing_fake_door_click')
  const submits = events.filter(e => e.name === 'marketing_fake_door_submit')

  const byDoor = (xs: Evt[]) => {
    const m = new Map<string, number>()
    for (const e of xs) {
      const doorId = safeStr(e?.meta?.doorId) || '(unknown)'
      m.set(doorId, (m.get(doorId) || 0) + 1)
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
  }

  const clickByDoor = byDoor(clicks)
  const submitByDoor = byDoor(submits)

  const notes = submits
    .map(e => ({
      ts: safeStr(e.ts),
      doorId: safeStr(e?.meta?.doorId),
      email: safeStr(e?.meta?.email),
      note: safeStr(e?.meta?.note),
      path: safeStr(e.path),
    }))
    .filter(n => n.note || n.email)
    .slice(0, 50)

  return (
    <main className="mk-page">
      <header className="mk-hero">
        <div className="mk-container">
          <div className="mk-kicker">Marketing</div>
          <h1 className="mk-h1">Interest rollup (local)</h1>
          <p className="mk-lede">
            This reads <code>.local/marketing-events.ndjson</code>. No DB.
            Intended for dev / internal checking.
          </p>
        </div>
      </header>

      <section className="mk-section">
        <div className="mk-container mk-grid3">
          <div className="mk-card">
            <div className="mk-stat">{events.length}</div>
            <div className="mk-body">Total events</div>
          </div>
          <div className="mk-card">
            <div className="mk-stat">{clicks.length}</div>
            <div className="mk-body">Fake-door clicks</div>
          </div>
          <div className="mk-card">
            <div className="mk-stat">{submits.length}</div>
            <div className="mk-body">Submissions</div>
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-container mk-grid2">
          <div className="mk-card">
            <h2 className="mk-h2">Clicks by door</h2>
            <ul className="mk-list">
              {clickByDoor.length ? clickByDoor.map(([door, n]) => (
                <li key={door}><strong>{door}</strong>: {n}</li>
              )) : <li>(none yet)</li>}
            </ul>
          </div>

          <div className="mk-card">
            <h2 className="mk-h2">Submits by door</h2>
            <ul className="mk-list">
              {submitByDoor.length ? submitByDoor.map(([door, n]) => (
                <li key={door}><strong>{door}</strong>: {n}</li>
              )) : <li>(none yet)</li>}
            </ul>
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-container">
          <div className="mk-card">
            <h2 className="mk-h2">Recent notes (up to 50)</h2>
            {notes.length ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="mk-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Door</th>
                      <th>Email</th>
                      <th>Note</th>
                      <th>Path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notes.map((n, i) => (
                      <tr key={i}>
                        <td>{n.ts}</td>
                        <td>{n.doorId}</td>
                        <td>{n.email}</td>
                        <td>{n.note}</td>
                        <td>{n.path}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mk-body">(no notes yet)</p>
            )}
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-container">
          <p className="mk-body">
            Tip: open <code>/marketing/stewards</code> and <code>/marketing/owners</code>,
            click the button, optionally enter a note, hit Send — then refresh this page.
          </p>
        </div>
      </section>
    </main>
  )
}
