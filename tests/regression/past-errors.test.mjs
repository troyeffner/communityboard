import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

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

test('seen_at source of truth is poster_uploads.seen_at_name (not seen_at_label)', () => {
  const files = listFiles(path.join(repoRoot, 'app')).filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file))
  const offenders = []
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8')
    if (src.includes('seen_at_label')) offenders.push(path.relative(repoRoot, file))
  }
  assert.equal(offenders.length, 0, `Found deprecated seen_at_label usage:\n${offenders.join('\n')}`)
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
