export default function AdminMaintenancePage() {
  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1 style={{ marginTop: 0 }}>System Maintenance (Coming Soon)</h1>
      <p style={{ opacity: 0.8, marginTop: 4 }}>Phase 2 placeholder. Data seams are in place.</p>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: 16 }}>
        <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
          <h2 style={{ marginTop: 0, fontSize: 20 }}>Venues</h2>
          <p style={{ margin: 0, opacity: 0.8 }}>Manage structured locations and poster routing.</p>
        </section>
        <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
          <h2 style={{ marginTop: 0, fontSize: 20 }}>Tags</h2>
          <p style={{ margin: 0, opacity: 0.8 }}>Review controlled labels and promoted suggestions.</p>
        </section>
        <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
          <h2 style={{ marginTop: 0, fontSize: 20 }}>Data cleanup</h2>
          <p style={{ margin: 0, opacity: 0.8 }}>Repair orphaned links and normalize legacy records.</p>
        </section>
      </div>
    </main>
  )
}
