import test from 'node:test'
import assert from 'node:assert/strict'

const runDbRegression = process.env.RUN_DB_REGRESSION === '1'

async function createSupabase() {
  const { createClient } = await import('@supabase/supabase-js')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  assert.ok(url, 'NEXT_PUBLIC_SUPABASE_URL is required')
  assert.ok(key, 'SUPABASE_SERVICE_ROLE_KEY is required')
  return createClient(url, key, { auth: { persistSession: false } })
}

test('DB enum/status smoke: can insert new poster + planted event + link', { skip: !runDbRegression }, async () => {
  const supabase = await createSupabase()
  const nonce = `${Date.now()}_${Math.random().toString(16).slice(2)}`

  const posterInsert = await supabase
    .from('poster_uploads')
    .insert([{ file_path: `tests/${nonce}.jpg`, status: 'new', seen_at_name: 'Regression Test' }])
    .select('id')
    .single()

  assert.equal(Boolean(posterInsert.error), false, posterInsert.error?.message || 'poster insert failed')
  const posterId = posterInsert.data?.id
  assert.ok(posterId, 'poster id missing')

  const eventInsert = await supabase
    .from('events')
    .insert([{ title: `Regression ${nonce}`, start_at: new Date().toISOString(), status: 'planted' }])
    .select('id')
    .single()

  assert.equal(Boolean(eventInsert.error), false, eventInsert.error?.message || 'event insert failed')
  const eventId = eventInsert.data?.id
  assert.ok(eventId, 'event id missing')

  const linkInsert = await supabase
    .from('poster_event_links')
    .insert([{ poster_upload_id: posterId, event_id: eventId, bbox: { x: 0.5, y: 0.5 } }])

  assert.equal(Boolean(linkInsert.error), false, linkInsert.error?.message || 'link insert failed')

  await supabase.from('poster_event_links').delete().eq('poster_upload_id', posterId).eq('event_id', eventId)
  await supabase.from('events').delete().eq('id', eventId)
  await supabase.from('poster_uploads').delete().eq('id', posterId)
})
