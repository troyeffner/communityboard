import { NextResponse } from 'next/server'

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function internalServerError(context: string, error: unknown) {
  console.error(`[api] ${context}`, error)
  return jsonError('Internal server error', 500)
}
