import { NextResponse } from 'next/server'

export type BuilderRole = 'public' | 'community_builder' | 'owner'

export type BuilderIdentity = {
  id: string
  email: string | null
  role: BuilderRole
  name: string | null
}

function extractAccessToken(req: Request): string | null {
  const auth = req.headers.get('authorization') || ''
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim() || null

  const cookie = req.headers.get('cookie') || ''
  const parts = cookie.split(';').map((part) => part.trim())
  for (const part of parts) {
    if (part.startsWith('sb-access-token=')) return decodeURIComponent(part.slice('sb-access-token='.length))
  }
  return null
}

export async function requireBuilder(req: Request): Promise<{ ok: true; identity: BuilderIdentity } | { ok: false; response: NextResponse }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DEV_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.DEV_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return { ok: false, response: NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 }) }
  }

  const accessToken = extractAccessToken(req)
  if (!accessToken) {
    return { ok: false, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  }

  const authResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })
  if (!authResp.ok) {
    return { ok: false, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  }

  const authUser = (await authResp.json().catch(() => null)) as { id?: string; email?: string | null } | null
  const uid = authUser?.id
  if (!uid) return { ok: false, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }

  const roleResp = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(uid)}&select=id,name,email,role&limit=1`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    cache: 'no-store',
  })
  if (!roleResp.ok) {
    return { ok: false, response: NextResponse.json({ error: 'Failed to load user role' }, { status: 500 }) }
  }

  const rows = (await roleResp.json().catch(() => [])) as Array<{ id: string; name?: string | null; email?: string | null; role?: BuilderRole }>
  const row = rows[0]
  const role = row?.role || 'public'
  if (role !== 'community_builder' && role !== 'owner') {
    return { ok: false, response: NextResponse.json({ error: 'Community Builder role required' }, { status: 403 }) }
  }

  return {
    ok: true,
    identity: {
      id: uid,
      email: row?.email || authUser.email || null,
      name: row?.name || null,
      role,
    },
  }
}
