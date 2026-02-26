import { createClient } from '@supabase/supabase-js'
import { BUSINESS_CATEGORIES } from '@/lib/taxonomy'

type BusinessRow = {
  id: string
  name: string
  category: string
  description: string | null
  phone: string | null
  email: string | null
  url: string | null
  address: string | null
  status: string
}

export default async function BusinessesPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DEV_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return <main style={{ padding: 24, fontFamily: 'sans-serif' }}>Missing Supabase env vars</main>
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const result = await supabase
    .from('businesses')
    .select('id,name,category,description,phone,email,url,address,status')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = (result.error ? [] : (result.data || [])) as BusinessRow[]

  return (
    <main style={{ padding: 16, maxWidth: 800, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Businesses & Services</h1>
      <p style={{ opacity: 0.8 }}>Categories: {BUSINESS_CATEGORIES.join(', ')}</p>
      {rows.length === 0 ? (
        <p>No published businesses yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map((row) => (
            <article key={row.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
              <h2 style={{ margin: '0 0 6px 0', fontSize: 20 }}>{row.name}</h2>
              <div style={{ fontSize: 13, opacity: 0.8 }}>{row.category}</div>
              {row.description && <p style={{ margin: '8px 0 0 0' }}>{row.description}</p>}
              {row.address && <p style={{ margin: '6px 0 0 0', opacity: 0.9 }}>Address: {row.address}</p>}
              {row.url && <p style={{ margin: '6px 0 0 0' }}><a href={row.url} target="_blank" rel="noreferrer">Visit website</a></p>}
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
