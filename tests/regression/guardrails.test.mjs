import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

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

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

test('no legacy object_type or seen_at_label references in app/lib runtime code', () => {
  const appDir = path.join(repoRoot, 'app')
  const libDir = path.join(repoRoot, 'lib')
  const files = [...listFiles(appDir), ...listFiles(libDir)]
    .filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file))

  const forbidden = [
    'object_type',
    'submit_object_type',
    'event_poster',
  ]

  const offenders = []
  for (const file of files) {
    const source = read(file)
    for (const token of forbidden) {
      if (source.includes(token)) offenders.push(`${path.relative(repoRoot, file)} -> ${token}`)
    }
  }

  assert.equal(offenders.length, 0, `Found forbidden legacy references:\n${offenders.join('\n')}`)
})

test('core create-flow routes exist', () => {
  const required = [
    'app/api/submit/upload/route.ts',
    'app/api/builder/next-poster/route.ts',
    'app/api/builder/create-event-from-poster/route.ts',
    'app/api/builder/mark-upload-done/route.ts',
    'app/api/manage/list-uploads-with-counts/route.ts',
    'app/api/manage/delete-poster/route.ts',
    'app/api/manage/update-poster/route.ts',
  ]

  for (const rel of required) {
    const full = path.join(repoRoot, rel)
    assert.equal(fs.existsSync(full), true, `Missing required route: ${rel}`)
  }
})

test('create page is build-safe server wrapper + client component split', () => {
  const pagePath = path.join(repoRoot, 'app/builder/create/page.tsx')
  const clientPath = path.join(repoRoot, 'app/builder/create/CreateClient.tsx')

  const pageSource = read(pagePath)
  const clientSource = read(clientPath)

  assert.equal(pageSource.includes("'use client'"), false, 'page.tsx should remain a server component')
  assert.equal(pageSource.includes('CreateClient'), true, 'page.tsx must render CreateClient')
  assert.equal(clientSource.includes("'use client'"), true, 'CreateClient.tsx must be a client component')
})

test('status vocabulary contains create-flow queue values', () => {
  const migration = read(path.join(repoRoot, 'db/migrations/20260226_create_flow_status_and_seen_at.sql'))
  assert.equal(migration.includes("'new'"), true)
  assert.equal(migration.includes("'tending'"), true)
  assert.equal(migration.includes("'done'"), true)
})

test('proxy sets viewer_id cookie and protects admin paths', () => {
  const src = read(path.join(repoRoot, 'proxy.ts'))
  assert.equal(src.includes('viewer_id'), true)
  assert.equal(src.includes("pathname.startsWith('/admin')"), true)
})
