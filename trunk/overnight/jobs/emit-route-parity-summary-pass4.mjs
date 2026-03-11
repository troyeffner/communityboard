#!/usr/bin/env node
import { promises as fs } from 'fs'
import path from 'path'

function pad2(v) {
  return String(v).padStart(2, '0')
}

function stamp(now) {
  return `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}_${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}`
}

function latestByPattern(files, pattern) {
  const matched = files.filter((f) => pattern.test(f)).sort()
  return matched.length > 0 ? matched[matched.length - 1] : null
}

async function readJsonIfPresent(filePath) {
  if (!filePath) return null
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch {
    return null
  }
}

async function main() {
  const root = process.env.CB_TRUNK_PATH
    ? path.resolve(process.env.CB_TRUNK_PATH)
    : path.join(process.cwd(), 'trunk')
  const outputsRoot = path.join(root, 'overnight', 'outputs')
  const files = await fs.readdir(outputsRoot).catch(() => [])
  const latestParity = latestByPattern(files, /^parity_interaction_readmodels_.*\.json$/)
  if (!latestParity) {
    throw new Error(`No parity report found in ${outputsRoot}. Run npm run trunk:parity first.`)
  }
  const parityPath = path.join(outputsRoot, latestParity)
  const parity = JSON.parse(await fs.readFile(parityPath, 'utf8'))
  const latestDeploySummary = latestByPattern(files, /^readmodel_deploy_summary_.*\.json$/)
  const latestLintSummary = latestByPattern(files, /^ether_sources_lint_.*\.json$/)
  const deploySummaryPath = latestDeploySummary ? path.join(outputsRoot, latestDeploySummary) : null
  const lintSummaryPath = latestLintSummary ? path.join(outputsRoot, latestLintSummary) : null
  const deploySummary = await readJsonIfPresent(deploySummaryPath)
  const lintSummary = await readJsonIfPresent(lintSummaryPath)
  const readMode = process.env.CB_READ_FROM_TRUNK === '1'
    ? 'trunk-overlay-with-legacy-fallback'
    : 'legacy'
  const now = new Date()
  const base = `route_parity_summary_${stamp(now)}`

  const summary = {
    generated_at: now.toISOString(),
    source: 'emit-route-parity-summary-pass4',
    read_mode: readMode,
    parity_source_file: parityPath,
    parity_status: parity.status || 'unknown',
    parity_warnings: parity.warnings || [],
    deploy_summary_file: deploySummaryPath,
    deploy_summary: deploySummary
      ? {
          deploy_event_rows: Number(deploySummary.deploy_event_rows || 0),
          total_lifecycles: Number(deploySummary.summary?.total_lifecycles || 0),
          by_provider: deploySummary.summary?.by_provider || [],
          by_stage: deploySummary.summary?.by_stage || [],
          by_status: deploySummary.summary?.by_status || [],
        }
      : null,
    ether_lint_file: lintSummaryPath,
    ether_lint: lintSummary
      ? {
          errors_count: Number(lintSummary.errors_count || 0),
          warnings_count: Number(lintSummary.warnings_count || 0),
        }
      : null,
    routes: [
      '/api/public/browse',
      '/api/public/events-grouped',
      '/api/events',
    ],
  }

  const jsonPath = path.join(outputsRoot, `${base}.json`)
  const mdPath = path.join(outputsRoot, `${base}.md`)
  await fs.writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')

  const md = [
    '# Route Parity Summary (Pass 4)',
    '',
    `generated_at: ${summary.generated_at}`,
    `read_mode: ${summary.read_mode}`,
    `parity_status: ${summary.parity_status}`,
    '',
    `parity_source_file: ${summary.parity_source_file}`,
    '',
    'routes:',
    ...summary.routes.map((r) => `- ${r}`),
    ...(summary.deploy_summary
      ? [
          '',
          `deploy_summary_file: ${summary.deploy_summary_file}`,
          `deploy_event_rows: ${summary.deploy_summary.deploy_event_rows}`,
          `deploy_lifecycles: ${summary.deploy_summary.total_lifecycles}`,
        ]
      : []),
    ...(summary.ether_lint
      ? [
          '',
          `ether_lint_file: ${summary.ether_lint_file}`,
          `ether_lint_errors: ${summary.ether_lint.errors_count}`,
          `ether_lint_warnings: ${summary.ether_lint.warnings_count}`,
        ]
      : []),
    ...(summary.parity_warnings.length > 0
      ? ['', 'warnings:', ...summary.parity_warnings.map((w) => `- ${w}`)]
      : []),
  ].join('\n')
  await fs.writeFile(mdPath, `${md}\n`, 'utf8')

  console.log(`route parity summary: ${jsonPath}`)
  console.log(`summary: ${mdPath}`)
}

main().catch((error) => {
  console.error('emit-route-parity-summary-pass4 failed', error)
  process.exitCode = 1
})
