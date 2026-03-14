import Link from 'next/link'

export default function BuilderHomePage() {
  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>Community Builder</h1>
      <p style={{ opacity: 0.8 }}>Choose a workflow.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link href="/builder/create" style={{ display: 'inline-block', padding: '10px 14px', borderRadius: 8, border: '1px solid #1d4ed8', background: '#2563eb', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
          Create (Plant from poster)
        </Link>
        <Link href="/builder/tend" style={{ display: 'inline-block', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#111827', textDecoration: 'none', fontWeight: 600 }}>
          Tend (Pin + maintain)
        </Link>
      </div>
    </main>
  )
}
