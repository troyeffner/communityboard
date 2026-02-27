import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8')
}

test('item types are single-source and reused in create form + builder API', () => {
  const itemTypes = read('lib/itemTypes.ts')
  const createClient = read('app/builder/create/CreateClient.tsx')
  const createApi = read('app/api/builder/create-event-from-poster/route.ts')

  assert.equal(itemTypes.includes('export const ITEM_TYPES'), true)
  assert.equal(createClient.includes('ITEM_TYPES.map'), true)
  assert.equal(createApi.includes('normalizeItemType'), true)
})

test('seen-at update route aliases canonical update-poster handler', () => {
  const src = read('app/api/manage/set-upload-seen-at/route.ts')
  assert.equal(src.includes("export { POST } from '../update-poster/route'"), true)
})

test('status vocabulary in UI uses Draft/Pinned wording', () => {
  const tend = read('app/builder/tend/page.tsx')
  const create = read('app/builder/create/CreateClient.tsx')

  assert.equal(tend.includes('Pin to board'), true)
  assert.equal(create.includes('Create drafts'), true)
  assert.equal(tend.includes('Publish'), false)
})

