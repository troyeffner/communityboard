import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ATTRIBUTES, AUDIENCE, BUSINESS_CATEGORIES, asStringArray, toSet } from '@/lib/taxonomy'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

type Row = {
  id: string
  name: string
  category: string
  description: string | null
  phone: string | null
  email: string | null
  url: string | null
  address: string | null
  attributes: string[] | null
  audience: string[] | null
  status: 'draft' | 'published' | 'unpublished'
  created_at: string
}

export async function GET(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DEV_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const params = new URL(req.url).searchParams
  const category = params.get('category')
  const q = params.get('q')?.trim().toLowerCase() || ''
  const attrs = asStringArray(params.get('attr'))
  const aud = asStringArray(params.get('aud'))
  const categorySet = toSet(BUSINESS_CATEGORIES)
  const attributeSet = toSet(ATTRIBUTES)
  const audienceSet = toSet(AUDIENCE)
  const selectedCategory = category && categorySet.has(category) ? category : null
  const selectedAttrs = attrs.filter((tag) => attributeSet.has(tag))
  const selectedAud = aud.filter((tag) => audienceSet.has(tag))

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const query = supabase
    .from('businesses')
    .select('id,name,category,description,phone,email,url,address,attributes,audience,status,created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(200)

  const result = await query
  if (result.error) {
    const message = (result.error.message || '').toLowerCase()
    if (!message.includes('relation "businesses"')) return jsonError(result.error.message, 500)
    return NextResponse.json({ rows: [] })
  }

  const rows = ((result.data || []) as Row[]).filter((row) => {
    if (selectedCategory && row.category !== selectedCategory) return false
    const rowAttrs = row.attributes || []
    const rowAud = row.audience || []
    if (selectedAttrs.length > 0 && !selectedAttrs.every((tag) => rowAttrs.includes(tag))) return false
    if (selectedAud.length > 0 && !selectedAud.every((tag) => rowAud.includes(tag))) return false
    if (q) {
      const haystack = `${row.name} ${row.description || ''} ${row.address || ''}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  return NextResponse.json({ rows })
}
