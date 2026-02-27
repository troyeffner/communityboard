import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function toUtcIcs(value: Date) {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function sanitizeTitle(value: string) {
  return value
    .replace(/[\\/?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const itemId = String(id || '').trim()
  if (!itemId) return jsonError('item id is required')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  let title = 'Item'
  let location = ''
  let description = ''
  let start = new Date()

  const itemRes = await supabase
    .from('poster_items')
    .select('title,location_text,details_json,start_date,time_of_day')
    .eq('id', itemId)
    .maybeSingle()

  if (!itemRes.error && itemRes.data) {
    title = itemRes.data.title || title
    location = itemRes.data.location_text || ''
    description = (itemRes.data.details_json as { description?: string } | null)?.description || ''
    if (itemRes.data.start_date) {
      const iso = `${itemRes.data.start_date}T${itemRes.data.time_of_day || '14:00:00'}`
      const dt = new Date(iso)
      if (!Number.isNaN(dt.getTime())) start = dt
    }
  } else {
    const eventRes = await supabase
      .from('events')
      .select('title,location,description,start_at')
      .eq('id', itemId)
      .maybeSingle()
    if (eventRes.error || !eventRes.data) return jsonError('Item not found', 404)
    title = eventRes.data.title || title
    location = eventRes.data.location || ''
    description = eventRes.data.description || ''
    const dt = new Date(eventRes.data.start_at)
    if (!Number.isNaN(dt.getTime())) start = dt
  }

  const end = new Date(start.getTime() + 90 * 60 * 1000)
  const uid = `${itemId}@uticacommunityboard`

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UticaCommunityBoard//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toUtcIcs(new Date())}`,
    `DTSTART:${toUtcIcs(start)}`,
    `DTEND:${toUtcIcs(end)}`,
    `SUMMARY:${title.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `LOCATION:${location.replace(/\n/g, ' ')}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ]

  const dateLabel = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
  const safeTitle = sanitizeTitle(title || 'item')
  const fileName = `${dateLabel} - ${safeTitle}.ics`

  return new NextResponse(lines.join('\r\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  })
}
