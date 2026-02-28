import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve('test-results', 'ui-eval')
const REPORT_PATH = path.resolve('docs', 'product-dev', 'ui-eval-gap-report.md')

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

function relFromReport(to) {
  const reportDir = path.dirname(REPORT_PATH)
  return path.relative(reportDir, to).split(path.sep).join('/')
}

function routeForImageName(name, routes) {
  const [slug] = name.split('-')
  const found = routes.find((route) => route.slug === slug)
  return found ? found.path : 'unknown'
}

async function findLatestDiffRun() {
  const entries = await readdir(ROOT, { withFileTypes: true })
  const runs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
  for (let i = runs.length - 1; i >= 0; i -= 1) {
    const candidate = path.join(ROOT, runs[i])
    try {
      await readFile(path.join(candidate, 'diff-summary.json'), 'utf8')
      await readFile(path.join(candidate, 'meta.json'), 'utf8')
      return candidate
    } catch {
      // continue scanning older runs
    }
  }
  throw new Error('Unable to locate a ui-eval run containing meta.json and diff-summary.json.')
}

async function main() {
  const latestDir = await findLatestDiffRun()
  const metaPath = path.join(latestDir, 'meta.json')
  const diffPath = path.join(latestDir, 'diff-summary.json')
  const meta = await readJson(metaPath)
  const diff = await readJson(diffPath)

  const changed = (diff.images || []).filter((image) => Number(image.ratio || 0) > 0.001)

  const lines = []
  lines.push('# UI Evaluation Gap Report')
  lines.push('')
  lines.push(`- Timestamp: ${meta.timestamp || 'unknown'}`)
  lines.push(`- Git HEAD: ${meta.git_head || 'unknown'}`)
  lines.push(`- Base URL: ${meta.base_url || 'unknown'}`)
  lines.push('')
  lines.push('## Per-route Snapshot + Diff')
  lines.push('')
  lines.push('| Route | Desktop | Desktop diff | Mobile | Mobile diff | Max ratio |')
  lines.push('|---|---|---|---|---|---|')

  for (const route of meta.routes || []) {
    const desktop = `${route.slug}-desktop.png`
    const mobile = `${route.slug}-mobile.png`
    const desktopDiff = `${route.slug}-desktop-diff.png`
    const mobileDiff = `${route.slug}-mobile-diff.png`
    const desktopStat = (diff.images || []).find((entry) => entry.name === desktop)
    const mobileStat = (diff.images || []).find((entry) => entry.name === mobile)
    const maxRatio = Math.max(Number(desktopStat?.ratio || 0), Number(mobileStat?.ratio || 0))

    const desktopLink = `[${desktop}](${relFromReport(path.join(latestDir, desktop))})`
    const mobileLink = `[${mobile}](${relFromReport(path.join(latestDir, mobile))})`
    const desktopDiffLink = `[${desktopDiff}](${relFromReport(path.join(latestDir, desktopDiff))})`
    const mobileDiffLink = `[${mobileDiff}](${relFromReport(path.join(latestDir, mobileDiff))})`

    lines.push(`| \`${route.path}\` | ${desktopLink} | ${desktopDiffLink} | ${mobileLink} | ${mobileDiffLink} | ${maxRatio.toFixed(6)} |`)
  }

  lines.push('')
  lines.push('## Title Check')
  lines.push('')
  if ((meta.title_mismatches || []).length === 0) {
    lines.push('- No title mismatches detected.')
  } else {
    for (const mismatch of meta.title_mismatches) {
      lines.push(`- \`${mismatch.route}\`: expected \`${mismatch.expected}\`, observed \`${mismatch.actual}\``)
    }
  }

  lines.push('')
  lines.push('## Gaps')
  lines.push('')
  if (changed.length === 0) {
    lines.push('- No image diffs above ratio threshold `0.001`.')
  } else {
    for (const image of changed) {
      const route = routeForImageName(image.name, meta.routes || [])
      const diffName = image.name.replace('.png', '-diff.png')
      lines.push(`- \`${route}\` :: \`${image.name}\` ratio=${Number(image.ratio || 0).toFixed(6)} ([actual](${relFromReport(path.join(latestDir, image.name))}), [diff](${relFromReport(path.join(latestDir, diffName))}))`)
    }
  }

  lines.push('')
  lines.push('## Manual Checklist Stub')
  lines.push('')
  lines.push('- [ ] Board skeleton parity across browse/create/poster')
  lines.push('- [ ] Panel chrome parity (header, subtitle, card rhythm)')
  lines.push('- [ ] Right rail single list container')
  lines.push('- [ ] Title/tab naming parity')

  await writeFile(REPORT_PATH, `${lines.join('\n')}\n`, 'utf8')
  console.log(REPORT_PATH)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
