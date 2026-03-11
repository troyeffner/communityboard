#!/usr/bin/env node
import { promises as fs } from 'fs'
import path from 'path'
import { createHash } from 'crypto'

function pad2(v) {
  return String(v).padStart(2, '0')
}

function stamp(now) {
  return `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}_${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}`
}

function toArray(input) {
  return Array.isArray(input) ? input : []
}

function toStringArray(input) {
  return toArray(input).map((v) => String(v || '').trim()).filter(Boolean)
}

function toLower(input) {
  return String(input || '').trim().toLowerCase()
}

function remoteComplianceIssues(source) {
  const compliance =
    source && typeof source.compliance === 'object' && source.compliance !== null
      ? source.compliance
      : {}

  const issues = []
  if (compliance.use_allowed !== true) issues.push('compliance.use_allowed must be true')
  if (toLower(compliance.review_status) !== 'approved') {
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
  if (!license || toLower(license) === 'unknown') {
    issues.push('license must be declared (not unknown)')
  }
  const rateLimit = Number(source.rate_limit_per_minute ?? compliance.rate_limit_per_minute)
  if (!Number.isFinite(rateLimit) || rateLimit <= 0) {
    issues.push('rate_limit_per_minute must be > 0')
  }

  return issues
}

function normalizeDate(record) {
  const candidate = String(
    record.date ||
      record.event_date ||
      record.year ||
      record.start_date ||
      '',
  ).trim()
  return candidate || null
}

function normalizeTitle(record, fallback) {
  const title = String(record.title || record.name || record.event || '').trim()
  return title || fallback
}

function buildEventId(sourceId, index, date, title) {
  const raw = `${sourceId}|${index}|${date || 'unknown'}|${title}`
  return `evt_${createHash('sha1').update(raw).digest('hex').slice(0, 16)}`
}

async function readJsonFile(filePath) {
  const text = await fs.readFile(filePath, 'utf8')
  return JSON.parse(text)
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'communityboard-ether-ingest/1.0',
      accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return await res.json()
}

async function main() {
  const root = process.env.CB_TRUNK_PATH
    ? path.resolve(process.env.CB_TRUNK_PATH)
    : path.join(process.cwd(), 'trunk')
  const repoRoot = process.cwd()
  const etherRoot = path.join(repoRoot, 'ether')
  const registryPath = path.join(etherRoot, 'sources', 'timeline_sources.json')
  const rawRoot = path.join(etherRoot, 'ingest', 'raw')
  const soilRoot = path.join(root, 'soil', 'community')
  const outputRoot = path.join(root, 'overnight', 'outputs')
  await fs.mkdir(rawRoot, { recursive: true })
  await fs.mkdir(soilRoot, { recursive: true })
  await fs.mkdir(outputRoot, { recursive: true })

  const registry = await readJsonFile(registryPath)
  const sources = toArray(registry.sources).filter((s) => s && s.enabled === true)
  const now = new Date()
  const stampValue = stamp(now)

  const normalizedEvents = []
  const sourceSummaries = []

  for (const source of sources) {
    const sourceId = String(source.id || '').trim()
    const mode = String(source.mode || '').trim()
    if (!sourceId || !mode) continue

    let payload = null
    let urlOrPath = ''
    if (mode === 'local_json') {
      urlOrPath = String(source.path || '').trim()
      const absolute = path.isAbsolute(urlOrPath) ? urlOrPath : path.join(repoRoot, urlOrPath)
      payload = await readJsonFile(absolute)
    } else if (mode === 'http_json') {
      if (process.env.CB_ALLOW_REMOTE_ETHER_INGEST !== '1') {
        sourceSummaries.push({
          source_id: sourceId,
          mode,
          skipped: true,
          reason: 'remote-ingest-disabled',
          required_env: 'CB_ALLOW_REMOTE_ETHER_INGEST=1',
        })
        continue
      }
      const complianceIssues = remoteComplianceIssues(source)
      if (complianceIssues.length > 0) {
        sourceSummaries.push({
          source_id: sourceId,
          mode,
          skipped: true,
          reason: 'remote-compliance-gate',
          compliance_issues: complianceIssues,
        })
        continue
      }
      urlOrPath = String(source.url || '').trim()
      payload = await fetchJson(urlOrPath)
    } else {
      sourceSummaries.push({
        source_id: sourceId,
        mode,
        skipped: true,
        reason: 'unsupported-mode',
      })
      continue
    }

    const records = toArray(payload)
    const rawOut = {
      source_id: sourceId,
      mode,
      fetched_at: now.toISOString(),
      records,
    }
    const rawPath = path.join(rawRoot, `${sourceId}_${stampValue}.json`)
    await fs.writeFile(rawPath, `${JSON.stringify(rawOut, null, 2)}\n`, 'utf8')

    let written = 0
    records.forEach((record, index) => {
      const date = normalizeDate(record)
      const title = normalizeTitle(record, `event_${index + 1}`)
      const event = {
        event_id: buildEventId(sourceId, index, date, title),
        date,
        title,
        description: record.description ? String(record.description) : null,
        location: record.location ? String(record.location) : null,
        tags: toStringArray(record.tags),
        emotion_tags: toStringArray(record.emotion_tags || record.emotions),
        source_id: sourceId,
        source_record_index: index,
        source_lineage: {
          mode,
          url_or_path: urlOrPath,
          license: source.license ? String(source.license) : null,
          compliance:
            source && typeof source.compliance === 'object' && source.compliance !== null
              ? {
                  review_status: source.compliance.review_status || null,
                  evidence_ref: source.compliance.evidence_ref || null,
                  data_class: source.compliance.data_class || null,
                }
              : null,
        },
        ingested_at: now.toISOString(),
      }
      normalizedEvents.push(event)
      written += 1
    })

    sourceSummaries.push({
      source_id: sourceId,
      mode,
      skipped: false,
      records_in_source: records.length,
      normalized_events_written: written,
      raw_packet_path: rawPath,
    })
  }

  const soilPath = path.join(soilRoot, `events_ingest_${stampValue}.jsonl`)
  const soilLines = normalizedEvents.map((event) => JSON.stringify(event)).join('\n')
  await fs.writeFile(soilPath, `${soilLines}${soilLines ? '\n' : ''}`, 'utf8')

  const summary = {
    generated_at: now.toISOString(),
    source: 'ingest-ether-timelines-pass1',
    source_registry: registryPath,
    enabled_sources: sources.length,
    normalized_events_total: normalizedEvents.length,
    soil_output_path: soilPath,
    source_summaries: sourceSummaries,
  }
  const summaryPath = path.join(outputRoot, `ether_ingest_summary_${stampValue}.json`)
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')

  console.log(`ether ingest summary: ${summaryPath}`)
  console.log(`soil output: ${soilPath}`)
}

main().catch((error) => {
  console.error('ingest-ether-timelines-pass1 failed', error)
  process.exitCode = 1
})
