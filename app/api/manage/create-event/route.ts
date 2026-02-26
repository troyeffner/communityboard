import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ATTRIBUTES, AUDIENCE, EVENT_CATEGORIES, asStringArray, toSet } from '@/lib/taxonomy'

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function defaultNy2pmLocalIso() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value

  if (!year || !month || !day) return '2000-01-01T14:00:00'
  return `${year}-${month}-${day}T14:00:00`
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON')

  const { password, title, description, start_at, status, event_category, event_attributes, event_audience } = body as {
    password?: string
    title?: string
    description?: string
    start_at?: string
    status?: 'draft' | 'published' | 'unpublished'
    event_category?: string | null
    event_attributes?: string[] | string | null
    event_audience?: string[] | string | null
  }

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return badRequest('Unauthorized', 401)
  }
  if (!title?.trim()) return badRequest('Title is required')
  if (status !== 'draft' && status !== 'published' && status !== 'unpublished') return badRequest('Invalid status')
  const categorySet = toSet(EVENT_CATEGORIES)
  const attributeSet = toSet(ATTRIBUTES)
  const audienceSet = toSet(AUDIENCE)
  const parsedCategory = event_category?.trim() || null
  const parsedAttributes = asStringArray(event_attributes).filter((tag) => attributeSet.has(tag))
  const parsedAudience = asStringArray(event_audience).filter((tag) => audienceSet.has(tag))
  if (parsedCategory && !categorySet.has(parsedCategory)) return badRequest('Invalid event_category')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return badRequest('Server is missing Supabase env vars', 500)
  }

  // Convert datetime-local (YYYY-MM-DDTHH:mm) into an ISO string interpreted as America/New_York
  // We store as timestamptz. For Phase 1, we treat the input as NY local time.
  const resolvedStartAt = start_at?.trim() || defaultNy2pmLocalIso()
  const nyIsoGuess = resolvedStartAt.length === 16 ? `${resolvedStartAt}:00` : resolvedStartAt

  const supabaseAdmin = createClient(url, serviceKey)

  const { error } = await supabaseAdmin.from('events').insert([
    {
      title: title.trim(),
      description: description?.trim() || null,
      start_at: nyIsoGuess,
      status,
      event_category: parsedCategory,
      event_attributes: parsedAttributes,
      event_audience: parsedAudience,
    },
  ])

  if (error) return badRequest(error.message, 500)

  return NextResponse.json({ ok: true })
}
