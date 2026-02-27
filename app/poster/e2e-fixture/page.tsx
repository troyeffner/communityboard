export const dynamic = 'force-static'

function svgDataUrl() {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200">
    <rect width="100%" height="100%" fill="#f6f7f9"/>
    <rect x="40" y="40" width="820" height="1120" rx="16" fill="#ffffff" stroke="#d7dbe3"/>
    <rect x="90" y="120" width="720" height="220" rx="12" fill="#eef2ff" stroke="#c7d2fe"/>
    <rect x="90" y="380" width="340" height="260" rx="12" fill="#ecfeff" stroke="#a5f3fc"/>
    <rect x="470" y="380" width="340" height="260" rx="12" fill="#fff7ed" stroke="#fed7aa"/>
    <rect x="90" y="680" width="720" height="390" rx="12" fill="#fef2f2" stroke="#fecaca"/>
    <circle cx="450" cy="260" r="18" fill="#22c55e" stroke="#ffffff" stroke-width="4"/>
    <circle cx="260" cy="520" r="18" fill="#ef4444" stroke="#ffffff" stroke-width="4"/>
    <circle cx="640" cy="520" r="18" fill="#22c55e" stroke="#ffffff" stroke-width="4"/>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export default function Page() {
  const img = svgDataUrl()

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <nav style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <a href="/">← Return to Community Board</a>
        <a href="/browse">← Browse posters</a>
      </nav>

      <section
        data-testid="poster-stage"
        style={{
          border: '1px solid #d7dbe3',
          borderRadius: 12,
          padding: 12,
          background: '#fff',
        }}
      >
        <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
          E2E Fixture Poster (stable for Playwright)
        </div>
        <div
          style={{
            width: '100%',
            overflow: 'hidden',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: '#f9fafb',
          }}
        >
          {/* Use an SVG data URL so we don't depend on files or network */}
          <img
            alt="E2E Poster Fixture"
            src={img}
            style={{ display: 'block', width: '100%', height: 'auto' }}
          />
        </div>
      </section>
    </main>
  )
}
