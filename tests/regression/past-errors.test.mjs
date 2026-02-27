import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const repoRoot = process.cwd()

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8')
}

function listFiles(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '.next' || entry.name === 'node_modules' || entry.name === '.git') continue
      out.push(...listFiles(full))
      continue
    }
    out.push(full)
  }
  return out
}

test('no runtime code writes status on_board', () => {
  const files = listFiles(path.join(repoRoot, 'app')).filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file))
  const offenders = []
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8')
    if (src.includes("status: 'on_board'") || src.includes('eq(\'status\', \'on_board\')')) {
      offenders.push(path.relative(repoRoot, file))
    }
  }
  assert.equal(offenders.length, 0, `Found on_board status writes/filters:\n${offenders.join('\n')}`)
})

test('upload/list APIs no longer depend on poster_uploads.object_type', () => {
  const uploadRoute = read('app/api/submit/upload/route.ts')
  const listRoute = read('app/api/manage/list-uploads-with-counts/route.ts')
  assert.equal(uploadRoute.includes('object_type'), false)
  assert.equal(listRoute.includes('object_type'), false)
})

test('list uploads route has missing done-column fallback', () => {
  const src = read('app/api/manage/list-uploads-with-counts/route.ts')
  assert.equal(src.includes('isMissingDoneColumns'), true)
  assert.equal(src.includes(".select('id,file_path,status,created_at,seen_at_name')"), true)
})

test('seen_at source of truth is seen_at_name only (no legacy fallback columns)', () => {
  const files = listFiles(path.join(repoRoot, 'app')).filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file))
  let seenAtNameCount = 0
  const offenders = []
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8')
    if (src.includes('seen_at_name')) seenAtNameCount += 1
    if (src.includes('seen_at_label')) {
      offenders.push(path.relative(repoRoot, file))
    }
  }
  assert.equal(seenAtNameCount > 0, true, 'Expected seen_at_name usage')
  assert.equal(offenders.length, 0, `Legacy seen-at fallback columns found:\n${offenders.join('\n')}`)
})

test('builder create avoids useSearchParams prerender trap', () => {
  const page = read('app/builder/create/page.tsx')
  const client = read('app/builder/create/CreateClient.tsx')
  assert.equal(page.includes('useSearchParams'), false)
  assert.equal(client.includes('useSearchParams'), false)
  assert.equal(page.includes('searchParams'), true)
})

test('event vote route avoids unsupported insert onConflict option', () => {
  const src = read('app/api/vote/event/route.ts')
  assert.equal(src.includes('onConflict'), false)
})

test('no runtime recurrence_rule references remain', () => {
  const files = listFiles(path.join(repoRoot, 'app')).filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file))
  const offenders = []
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8')
    if (src.includes('recurrence_rule')) offenders.push(path.relative(repoRoot, file))
  }
  assert.equal(offenders.length, 0, `Found recurrence_rule references:\n${offenders.join('\n')}`)
})

test('browse API uses poster_items model (not only legacy link table)', () => {
  const src = read('app/api/public/browse/route.ts')
  assert.equal(src.includes(".from('poster_items')"), true)
})

test('create image click does not reset typed form state', () => {
  const src = read('app/builder/create/CreateClient.tsx')
  const clickIndex = src.indexOf('setPoint({ x: Number(Math.max(0, Math.min(1, x)).toFixed(4)), y: Number(Math.max(0, Math.min(1, y)).toFixed(4)) })')
  assert.notEqual(clickIndex, -1, 'expected image click pin setter')
  const snippet = src.slice(clickIndex, clickIndex + 260)
  assert.equal(snippet.includes('resetFormToNew()'), false)
})

test('schema healthcheck requirement exists: poster_uploads.seen_at_name (when env configured)', async (t) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    t.skip('Supabase env vars not configured in test environment')
    return
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
  const probe = await supabase
    .schema('information_schema')
    .from('columns')
    .select('table_name,column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'poster_uploads')
    .eq('column_name', 'seen_at_name')
    .limit(1)

  assert.equal(Boolean(probe.error), false, probe.error?.message || 'Schema probe failed')
  assert.equal((probe.data || []).length > 0, true, 'Missing public.poster_uploads.seen_at_name')
})
