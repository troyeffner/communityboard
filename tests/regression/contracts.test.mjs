import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8')
}

test('upload endpoint accepts seen_at_name and no object_type', () => {
  const source = read('app/api/submit/upload/route.ts')
  assert.equal(source.includes("form.get('seen_at_name')"), true)
  assert.equal(source.includes('object_type'), false)
})

test('list uploads endpoint returns seen_at_name and linked count', () => {
  const source = read('app/api/manage/list-uploads-with-counts/route.ts')
  assert.equal(source.includes('seen_at_name'), true)
  assert.equal(source.includes('linked_events_count'), true)
})

test('builder create page has integrated upload + next untended controls', () => {
  const source = read('app/builder/create/CreateClient.tsx')
  assert.equal(source.includes('Upload and select'), true)
  assert.equal(source.includes('Next untended poster'), true)
  assert.equal(source.includes('/api/builder/next-poster'), true)
})
