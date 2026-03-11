#!/usr/bin/env node
import { promises as fs } from 'fs'
import path from 'path'

function pad2(v) {
  return String(v).padStart(2, '0')
}

function stamp(now) {
  return `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}_${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}`
}

function toArray(input) {
  return Array.isArray(input) ? input : []
}

function lower(input) {
  return String(input || '').trim().toLowerCase()
}

function complianceIssues(source) {
  const compliance =
    source && typeof source.compliance === 'object' && source.compliance !== null
      ? source.compliance
      : {}
  const issues = []

  if (compliance.use_allowed !== true) issues.push('compliance.use_allowed must be true')
  if (lower(compliance.review_status) !== 'approved') {
    issues.push('compliance.review_status must be approved')
  }
  if (!String(compliance.data_class || '').trim()) {
    issues.push('compliance.data_class is required')
  }
  if (!String(compliance.terms_url || '').trim()) {
    issues.push('compliance.terms_url is required')
  }
  if (!String(compliance.evidence_ref || '').trim()) {
    issues.push('compliance.evidence_ref is required')
  }
  const license = String(compliance.license || source.license || '').trim()
  if (!license || lower(license) === 'unknown') {
    issues.push('license must be declared (not unknown)')
  }

  const rateLimit = Number(source.rate_limit_per_minute ?? compliance.rate_limit_per_minute)
  if (!Number.isFinite(rateLimit) || rateLimit <= 0) {
    issues.push('rate_limit_per_minute must be > 0')
  }

  return issues
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function main() {
  const repoRoot = process.cwd()
  const trunkRoot = process.env.CB_TRUNK_PATH
    ? path.resolve(process.env.CB_TRUNK_PATH)
    : path.join(repoRoot, 'trunk')
  const registryPath = path.join(repoRoot, 'ether', 'sources', 'timeline_sources.json')
  const outputRoot = path.join(trunkRoot, 'overnight', 'outputs')
  await fs.mkdir(outputRoot, { recursive: true })

  const registry = await readJson(registryPath)
  const sources = toArray(registry.sources)
  const errors = []
  const warnings = []
  const seenIds = new Set()

  for (const source of sources) {
    const id = String(source?.id || '').trim()
    const mode = String(source?.mode || '').trim()
    const enabled = source?.enabled === true

    if (!id) {
      errors.push({ source_id: null, issue: 'source.id is required' })
      continue
    }
    if (seenIds.has(id)) {
      errors.push({ source_id: id, issue: 'duplicate source.id' })
      continue
    }
    seenIds.add(id)

    if (mode !== 'local_json' && mode !== 'http_json') {
      errors.push({ source_id: id, issue: `unsupported mode: ${mode || 'missing'}` })
      continue
    }

    if (mode === 'local_json') {
      const p = String(source.path || '').trim()
      if (!p) {
        errors.push({ source_id: id, issue: 'local_json source.path is required' })
      } else if (enabled) {
        const absolute = path.isAbsolute(p) ? p : path.join(repoRoot, p)
        if (!(await fileExists(absolute))) {
          errors.push({ source_id: id, issue: `local source path not found: ${p}` })
        }
      }
      continue
    }

    const url = String(source.url || '').trim()
    if (!url) {
      errors.push({ source_id: id, issue: 'http_json source.url is required' })
      continue
    }

    const issues = complianceIssues(source)
    if (enabled && issues.length > 0) {
      errors.push({ source_id: id, issue: 'enabled remote source failed compliance gate', details: issues })
    }
    if (!enabled && issues.length > 0) {
      warnings.push({ source_id: id, issue: 'disabled remote source has incomplete compliance metadata', details: issues })
    }
  }

  const now = new Date()
  const report = {
    generated_at: now.toISOString(),
    source: 'lint-ether-sources-pass1',
    registry_path: registryPath,
    sources_total: sources.length,
    errors_count: errors.length,
    warnings_count: warnings.length,
    errors,
    warnings,
  }

  const outPath = path.join(outputRoot, `ether_sources_lint_${stamp(now)}.json`)
  await fs.writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  if (errors.length > 0) {
    console.error(`ether source lint failed: ${outPath}`)
    process.exitCode = 1
    return
  }

  console.log(`ether source lint passed: ${outPath}`)
  if (warnings.length > 0) {
    console.log(`warnings: ${warnings.length}`)
    console.log(`warning detail report: ${outPath}`)
    console.log('warning: remote source compliance debt exists; review report before enabling source.')
  }
}

main().catch((error) => {
  console.error('lint-ether-sources-pass1 failed', error)
  process.exitCode = 1
})
