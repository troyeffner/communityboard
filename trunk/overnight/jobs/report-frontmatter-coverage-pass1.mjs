#!/usr/bin/env node
import { promises as fs } from 'fs'
import path from 'path'

function pad2(v) {
  return String(v).padStart(2, '0')
}

function stamp(now) {
  return `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}_${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}`
}

async function walkMarkdown(dir) {
  const out = []
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...await walkMarkdown(full))
      continue
    }
    if (!entry.isFile()) continue
    if (!entry.name.toLowerCase().endsWith('.md')) continue
    out.push(full)
  }
  return out
}

async function readPolicy(policyPath) {
  const defaults = {
    targets: ['QB', 'docs', 'trunk'],
    exclude_prefixes: [
      'QB/INBOX/',
      'QB/OUTBOX/',
      'QB/dispatch/',
      'QB/_coach_return_packs/',
      'QB/report_',
      'trunk/overnight/outputs/',
    ],
  }
  const text = await fs.readFile(policyPath, 'utf8').catch(() => '')
  if (!text) return defaults
  try {
    const parsed = JSON.parse(text)
    return {
      targets: Array.isArray(parsed.targets) && parsed.targets.length > 0
        ? parsed.targets.map((v) => String(v || '').trim()).filter(Boolean)
        : defaults.targets,
      exclude_prefixes: Array.isArray(parsed.exclude_prefixes)
        ? parsed.exclude_prefixes.map((v) => String(v || '').trim()).filter(Boolean)
        : defaults.exclude_prefixes,
    }
  } catch {
    return defaults
  }
}

async function hasFrontmatter(filePath) {
  const text = await fs.readFile(filePath, 'utf8').catch(() => '')
  if (!text) return false
  const lines = text.split('\n')
  for (const line of lines) {
    if (!line.trim()) continue
    return line.trim() === '---'
  }
  return false
}

function rel(repoRoot, absPath) {
  return path.relative(repoRoot, absPath).replace(/\\/g, '/')
}

function areaKey(relativePath) {
  const first = relativePath.split('/')[0]
  return first || 'root'
}

function isExcluded(relativePath, prefixes) {
  return prefixes.some((prefix) => relativePath.startsWith(prefix))
}

function pct(covered, total) {
  if (!total) return 0
  return Math.round((covered / total) * 1000) / 10
}

async function main() {
  const repoRoot = process.cwd()
  const trunkRoot = process.env.CB_TRUNK_PATH
    ? path.resolve(process.env.CB_TRUNK_PATH)
    : path.join(repoRoot, 'trunk')
  const outputRoot = path.join(trunkRoot, 'overnight', 'outputs')
  await fs.mkdir(outputRoot, { recursive: true })

  const policy = await readPolicy(path.join(trunkRoot, 'config', 'frontmatter_policy.json'))
  const targets = policy.targets
  const excludePrefixes = policy.exclude_prefixes
  const allFiles = []
  for (const target of targets) {
    const abs = path.join(repoRoot, target)
    allFiles.push(...await walkMarkdown(abs))
  }

  const byArea = {}
  const missing = []
  let covered = 0
  let considered = 0

  for (const absPath of allFiles) {
    const relativePath = rel(repoRoot, absPath)
    if (isExcluded(relativePath, excludePrefixes)) continue
    considered += 1
    const area = areaKey(relativePath)
    const has = await hasFrontmatter(absPath)

    if (!byArea[area]) {
      byArea[area] = { total: 0, covered: 0, missing: 0 }
    }
    byArea[area].total += 1
    if (has) {
      byArea[area].covered += 1
      covered += 1
    } else {
      byArea[area].missing += 1
      missing.push(relativePath)
    }
  }

  const now = new Date()
  const summary = {
    generated_at: now.toISOString(),
    source: 'report-frontmatter-coverage-pass1',
    policy: {
      exclude_prefixes: excludePrefixes,
    },
    targets,
    totals: {
      markdown_files: considered,
      with_frontmatter: covered,
      missing_frontmatter: missing.length,
      coverage_percent: pct(covered, considered),
    },
    by_area: Object.entries(byArea)
      .map(([area, stats]) => ({
        area,
        total: stats.total,
        covered: stats.covered,
        missing: stats.missing,
        coverage_percent: pct(stats.covered, stats.total),
      }))
      .sort((a, b) => a.area.localeCompare(b.area)),
    missing_frontmatter_files: missing.sort(),
  }

  const base = `frontmatter_coverage_${stamp(now)}`
  const jsonPath = path.join(outputRoot, `${base}.json`)
  const mdPath = path.join(outputRoot, `${base}.md`)
  await fs.writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')

  const md = [
    '# Frontmatter Coverage (Pass 1)',
    '',
    `generated_at: ${summary.generated_at}`,
    `targets: ${targets.join(', ')}`,
    '',
    `markdown_files: ${summary.totals.markdown_files}`,
    `with_frontmatter: ${summary.totals.with_frontmatter}`,
    `missing_frontmatter: ${summary.totals.missing_frontmatter}`,
    `coverage_percent: ${summary.totals.coverage_percent}%`,
    '',
    '## Coverage by Area',
    ...summary.by_area.map((row) => `- ${row.area}: ${row.covered}/${row.total} (${row.coverage_percent}%)`),
    '',
    '## Missing Frontmatter Files',
    ...summary.missing_frontmatter_files.map((file) => `- ${file}`),
  ].join('\n')
  await fs.writeFile(mdPath, `${md}\n`, 'utf8')

  console.log(`frontmatter coverage report: ${jsonPath}`)
  console.log(`frontmatter coverage markdown: ${mdPath}`)
}

main().catch((error) => {
  console.error('report-frontmatter-coverage-pass1 failed', error)
  process.exitCode = 1
})
