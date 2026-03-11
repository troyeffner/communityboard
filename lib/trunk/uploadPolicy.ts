import { readFileSync } from 'fs'
import path from 'path'
import { POSTER_STATUSES } from '@/lib/statuses'

type UploadPolicyFile = {
  primary_status_key?: keyof typeof POSTER_STATUSES
  fallback_status_key?: keyof typeof POSTER_STATUSES
  seen_at_columns?: string[]
  include_is_done_in_primary?: boolean
  include_terminal_without_seen_at?: boolean
  retry_error?: {
    enum_mismatch_token?: string
    missing_column_code?: string
    message_keywords?: string[]
  }
}

type UploadPolicyRuntime = {
  primaryStatus: string
  fallbackStatus: string
  seenAtColumns: string[]
  includeIsDoneInPrimary: boolean
  includeTerminalWithoutSeenAt: boolean
  retryError: {
    enumMismatchToken: string
    missingColumnCode: string
    messageKeywords: string[]
  }
}

let cachedPolicy: UploadPolicyRuntime | null = null

function defaultPolicy(): UploadPolicyRuntime {
  return {
    primaryStatus: POSTER_STATUSES.NEW,
    fallbackStatus: POSTER_STATUSES.UPLOADED,
    seenAtColumns: ['seen_at_name', 'seen_at_label', 'seen_at', 'source_place'],
    includeIsDoneInPrimary: true,
    includeTerminalWithoutSeenAt: true,
    retryError: {
      enumMismatchToken: 'poster_status',
      missingColumnCode: '42703',
      messageKeywords: ['schema cache', 'is_done', 'done'],
    },
  }
}

function loadPolicyFile(): UploadPolicyFile | null {
  try {
    const filePath = path.join(process.cwd(), 'trunk', 'config', 'upload_insert_policy.json')
    const raw = readFileSync(filePath, 'utf8')
    return JSON.parse(raw) as UploadPolicyFile
  } catch {
    return null
  }
}

function resolveStatus(statusKey: keyof typeof POSTER_STATUSES | undefined, fallback: string) {
  if (!statusKey) return fallback
  return POSTER_STATUSES[statusKey] || fallback
}

export function getUploadInsertPolicy() {
  if (cachedPolicy) return cachedPolicy
  const defaults = defaultPolicy()
  const filePolicy = loadPolicyFile()
  if (!filePolicy) {
    cachedPolicy = defaults
    return cachedPolicy
  }

  cachedPolicy = {
    primaryStatus: resolveStatus(filePolicy.primary_status_key, defaults.primaryStatus),
    fallbackStatus: resolveStatus(filePolicy.fallback_status_key, defaults.fallbackStatus),
    seenAtColumns:
      Array.isArray(filePolicy.seen_at_columns) && filePolicy.seen_at_columns.length > 0
        ? filePolicy.seen_at_columns.map((v) => String(v).trim()).filter(Boolean)
        : defaults.seenAtColumns,
    includeIsDoneInPrimary:
      typeof filePolicy.include_is_done_in_primary === 'boolean'
        ? filePolicy.include_is_done_in_primary
        : defaults.includeIsDoneInPrimary,
    includeTerminalWithoutSeenAt:
      typeof filePolicy.include_terminal_without_seen_at === 'boolean'
        ? filePolicy.include_terminal_without_seen_at
        : defaults.includeTerminalWithoutSeenAt,
    retryError: {
      enumMismatchToken:
        String(filePolicy.retry_error?.enum_mismatch_token || defaults.retryError.enumMismatchToken).toLowerCase(),
      missingColumnCode: String(filePolicy.retry_error?.missing_column_code || defaults.retryError.missingColumnCode),
      messageKeywords:
        Array.isArray(filePolicy.retry_error?.message_keywords) && filePolicy.retry_error?.message_keywords.length > 0
          ? filePolicy.retry_error?.message_keywords.map((v) => String(v).toLowerCase())
          : defaults.retryError.messageKeywords,
    },
  }
  return cachedPolicy
}

export function buildPosterUploadInsertCandidates(filePath: string, seenAtName: string | null) {
  const policy = getUploadInsertPolicy()
  const candidates: Array<Record<string, unknown>> = []

  for (const column of policy.seenAtColumns) {
    const primary: Record<string, unknown> = { file_path: filePath, status: policy.primaryStatus, [column]: seenAtName }
    if (policy.includeIsDoneInPrimary) primary.is_done = false
    candidates.push(primary)
    candidates.push({ file_path: filePath, status: policy.fallbackStatus, [column]: seenAtName })
  }

  if (policy.includeTerminalWithoutSeenAt) {
    candidates.push({ file_path: filePath, status: policy.fallbackStatus })
  }

  return candidates
}

export function isUploadInsertRetryable(
  error: { code?: string; message?: string } | null | undefined,
  missingColumnPredicate: (err: { code?: string; message?: string } | null | undefined, column: string) => boolean,
) {
  const policy = getUploadInsertPolicy()
  const message = (error?.message || '').toLowerCase()

  const enumMismatch =
    message.includes(policy.retryError.enumMismatchToken) && message.includes('new')
  if (enumMismatch) return true

  const missingConfiguredColumn = policy.seenAtColumns.some((column) => missingColumnPredicate(error, column))
  if (missingConfiguredColumn) return true

  if (error?.code === policy.retryError.missingColumnCode) return true
  if (policy.retryError.messageKeywords.some((keyword) => message.includes(keyword))) return true

  return false
}

