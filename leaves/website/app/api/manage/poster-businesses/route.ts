import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

type Row = {
  id: string
  bbox: { x: number; y: number } | null
  created_at: string
  businesses:
    | {
      id: string
      name: string
      category: string
      status: string
    }
    | Array<{
      id: string
      name: string
      category: string
      status: string
    }>
    | null
}

export async function GET(req: Request) {
  const posterUploadId = new URL(req.url).searchParams.get('poster_upload_id')
  if (!posterUploadId) return jsonError('poster_upload_id is required')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const result = await supabase
    .from('poster_business_links')
    .select('id,bbox,created_at,businesses(id,name,category,status)')
    .eq('poster_upload_id', posterUploadId)
    .order('created_at', { ascending: false })

  if (result.error) {
    const message = (result.error.message || '').toLowerCase()
    if (message.includes('poster_business_links') || message.includes('relation "businesses"')) {
      return NextResponse.json({ rows: [] })
    }
    return jsonError(result.error.message, 500)
  }

  const rows = ((result.data || []) as Row[])
    .map((row) => {
      const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses
      if (!business) return null
      return {
        link_id: row.id,
        bbox: row.bbox,
        created_at: row.created_at,
        business,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  return NextResponse.json({ rows })
}
