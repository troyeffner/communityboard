import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type MissingCheck = 'poster_uploads.seen_at_name'

const REQUIRED: Array<{ table: string; column: string; key: MissingCheck }> = [
  { table: 'poster_uploads', column: 'seen_at_name', key: 'poster_uploads.seen_at_name' },
]

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ ok: false, missing: ['poster_uploads.seen_at_name'], error: 'Missing Supabase env vars' }, { status: 500 })
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
  const missing: MissingCheck[] = []

  for (const req of REQUIRED) {
    const probe = await supabase
      .schema('information_schema')
      .from('columns')
      .select('table_name,column_name')
      .eq('table_schema', 'public')
      .eq('table_name', req.table)
      .eq('column_name', req.column)
      .limit(1)

    if (probe.error || !probe.data || probe.data.length === 0) {
      missing.push(req.key)
    }
  }

  if (missing.length > 0) {
    return NextResponse.json({ ok: false, missing }, { status: 503 })
  }
  return NextResponse.json({ ok: true, missing: [] })
}
