import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const ROOT = path.resolve('test-results', 'ui-eval')

async function listRunDirs() {
  const entries = await readdir(ROOT, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

function isPngFile(name) {
  return name.toLowerCase().endsWith('.png') && !name.toLowerCase().endsWith('-diff.png')
}

async function readPng(filePath) {
  const buf = await readFile(filePath)
  return PNG.sync.read(buf)
}

async function main() {
  const runDirs = await listRunDirs()
  if (runDirs.length < 2) {
    throw new Error('Need at least two ui-eval runs to diff.')
  }

  const latest = runDirs[runDirs.length - 1]
  const latestDir = path.join(ROOT, latest)
  const latestFiles = (await readdir(latestDir)).filter(isPngFile).sort()
  if (latestFiles.length === 0) {
    throw new Error(`Latest run has no PNG files: ${latest}`)
  }

  let previous = null
  let previousDir = null
  let previousFileSet = new Set()

  for (let i = runDirs.length - 2; i >= 0; i -= 1) {
    const candidate = runDirs[i]
    const candidateDir = path.join(ROOT, candidate)
    const candidateFiles = new Set((await readdir(candidateDir)).filter(isPngFile))
    const hasAnyMatch = latestFiles.some((file) => candidateFiles.has(file))
    if (hasAnyMatch) {
      previous = candidate
      previousDir = candidateDir
      previousFileSet = candidateFiles
      break
    }
  }

  if (!previous || !previousDir) {
    throw new Error('No previous ui-eval run with matching PNG files was found.')
  }

  const results = []

  for (const file of latestFiles) {
    if (!previousFileSet.has(file)) continue

    const latestPng = await readPng(path.join(latestDir, file))
    const previousPng = await readPng(path.join(previousDir, file))

    if (latestPng.width !== previousPng.width || latestPng.height !== previousPng.height) {
      results.push({
        name: file,
        changedPixels: latestPng.width * latestPng.height,
        ratio: 1,
        width: latestPng.width,
        height: latestPng.height,
        note: 'dimension_mismatch',
      })
      continue
    }

    const diff = new PNG({ width: latestPng.width, height: latestPng.height })
    const changedPixels = pixelmatch(
      previousPng.data,
      latestPng.data,
      diff.data,
      latestPng.width,
      latestPng.height,
      { threshold: 0.1 },
    )

    const ratio = changedPixels / (latestPng.width * latestPng.height)
    await writeFile(path.join(latestDir, file.replace('.png', '-diff.png')), PNG.sync.write(diff))

    results.push({
      name: file,
      changedPixels,
      ratio,
      width: latestPng.width,
      height: latestPng.height,
    })
  }

  const summary = {
    latest,
    previous,
    images: results,
  }

  await writeFile(path.join(latestDir, 'diff-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
  console.log(path.join(latestDir, 'diff-summary.json'))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
