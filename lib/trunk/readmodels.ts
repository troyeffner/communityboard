import { readFile } from 'fs/promises'
import path from 'path'

type ReadmodelRow = { key: string; count: number }
type ReadmodelFile = { rows?: ReadmodelRow[] }

type InteractionReadmodels = {
  eventVotes: Map<string, number>
  tagVotes: Map<string, number>
  itemUpvotes: Map<string, number>
}

function toMap(rows: ReadmodelRow[] | undefined) {
  const map = new Map<string, number>()
  for (const row of rows || []) {
    const key = String(row.key || '').trim()
    if (!key) continue
    map.set(key, Number(row.count || 0))
  }
  return map
}

async function readModel(filePath: string) {
  const text = await readFile(filePath, 'utf8').catch(() => '')
  if (!text) return { rows: [] } as ReadmodelFile
  try {
    return JSON.parse(text) as ReadmodelFile
  } catch {
    return { rows: [] } as ReadmodelFile
  }
}

export function readFromTrunkEnabled() {
  return process.env.CB_READ_FROM_TRUNK === '1'
}

export async function loadInteractionReadmodels(): Promise<InteractionReadmodels> {
  const trunkRoot = process.env.CB_TRUNK_PATH
    ? path.resolve(process.env.CB_TRUNK_PATH)
    : path.join(process.cwd(), 'trunk')
  const readmodelRoot = path.join(trunkRoot, 'branches', 'readmodels')
  const [eventFile, tagFile, itemFile] = await Promise.all([
    readModel(path.join(readmodelRoot, 'interaction_event_votes.json')),
    readModel(path.join(readmodelRoot, 'interaction_tag_votes.json')),
    readModel(path.join(readmodelRoot, 'interaction_item_upvotes.json')),
  ])

  return {
    eventVotes: toMap(eventFile.rows),
    tagVotes: toMap(tagFile.rows),
    itemUpvotes: toMap(itemFile.rows),
  }
}

