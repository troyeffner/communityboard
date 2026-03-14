import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const APP_DIR = path.join(ROOT, 'app')

const FORBIDDEN = [
  { label: 'Pin to board', regex: /\bPin to board\b/i },
  { label: 'Status: Pinned', regex: /\bStatus:\s*Pinned\b/i },
  { label: 'Pinned (status drift)', regex: /\bPinned\b/ },
  { label: 'Fit to pinned items', regex: /\bFit to pinned items\b/i }
]

const TEXT_EXT = new Set([
  '.ts', '.tsx', '.js', '.mjs', '.css', '.json'
])

function shouldScan(filePath) {
  if (!filePath.startsWith(APP_DIR)) return false
  if (filePath.includes('/app/api/')) return false
  const ext = path.extname(filePath)
  return TEXT_EXT.has(ext)
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      walk(full, out)
    } else {
      out.push(full)
    }
  }
  return out
}

test('CANON: runtime UI must not contain pinned drift language', () => {
  const files = walk(APP_DIR).filter(shouldScan)
  const violations = []

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    const lines = content.split('\n')

    lines.forEach((line, idx) => {
      FORBIDDEN.forEach(rule => {
        if (rule.regex.test(line)) {
          violations.push({
            file: path.relative(ROOT, file),
            line: idx + 1,
            text: line.trim(),
            rule: rule.label
          })
        }
      })
    })
  }

  if (violations.length) {
    console.error('\nCanon language violations detected:\n')
    violations.forEach(v => {
      console.error(
        `[${v.rule}] ${v.file}:${v.line}\n  ${v.text}\n`
      )
    })
  }

  assert.strictEqual(
    violations.length,
    0,
    'Forbidden pinned language detected in runtime UI.'
  )
})
