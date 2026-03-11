import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type MissingCheck = 'poster_uploads.seen_at_name'
type LegacySeenAt = 'poster_uploads.seen_at_label' | 'poster_uploads.seen_at' | 'poster_uploads.source_place'

const REQUIRED: Array<{ table: string; column: string; key: MissingCheck }> = [
  { table: 'poster_uploads', column: 'seen_at_name', key: 'poster_uploads.seen_at_name' },
]
const LEGACY: Array<{ table: string; column: string; key: LegacySeenAt }> = [
  { table: 'poster_uploads', column: 'seen_at_label', key: 'poster_uploads.seen_at_label' },
  { table: 'poster_uploads', column: 'seen_at', key: 'poster_uploads.seen_at' },
  { table: 'poster_uploads', column: 'source_place', key: 'poster_uploads.source_place' },
]

/**
 * Check if a column exists by selecting it with limit 0.
 * If the column is missing, Supabase/PostgREST returns error code 42703 or PGRST204.
 * This avoids the false-negative from supabase.schema('information_schema') which
 * doesn't work reliably with the JS client.
 */
async function columnExists(supabase: ReturnType<typeof createClient>, table: string, column: string): Promise<boolean> {
  const probe = await supabase
    .from(table)
    .select(column)
    .limit(0)

  if (!probe.error) return true
  if (probe.error.code === '42703') return false
  if (probe.error.code === 'PGRST204' || (probe.error.message || '').includes('schema cache')) return false
  return false
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ ok: false, missing: ['poster_uploads.seen_at_name'], error: 'Missing Supabase env vars' }, { status: 500 })
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
  const missing: MissingCheck[] = []

  for (const req of REQUIRED) {
    const exists = await columnExists(supabase, req.table, req.column)
    if (!exists) {
      missing.push(req.key)
    }
  }

  if (missing.length === 0) {
    return NextResponse.json({ ok: true, missing: [], canonical: true, legacy_fallback: [] as LegacySeenAt[] })
  }

  const legacyPresent: LegacySeenAt[] = []
  for (const legacy of LEGACY) {
    const exists = await columnExists(supabase, legacy.table, legacy.column)
    if (exists) {
      legacyPresent.push(legacy.key)
    }
  }

  if (legacyPresent.length > 0) {
    return NextResponse.json({
      ok: true,
      missing,
      canonical: false,
      warning: 'Canonical seen_at_name is missing. Using legacy fallback columns until migration is applied.',
      legacy_fallback: legacyPresent,
    })
  }

  return NextResponse.json({ ok: false, missing, canonical: false, legacy_fallback: [] as LegacySeenAt[] }, { status: 503 })
}
