import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const BUILDER_ROLES = new Set(['community_builder', 'owner'])

async function getRole(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DEV_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.DEV_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceKey) return { role: null as string | null, uid: null as string | null }

  const authHeader = req.headers.get('authorization') || ''
  const cookieToken = req.cookies.get('sb-access-token')?.value
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : cookieToken
  if (!token) return { role: null, uid: null }

  const authResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!authResp.ok) return { role: null, uid: null }
  const authUser = (await authResp.json().catch(() => null)) as { id?: string } | null
  const uid = authUser?.id || null
  if (!uid) return { role: null, uid: null }

  const roleResp = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(uid)}&select=role&limit=1`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    cache: 'no-store',
  })
  if (!roleResp.ok) return { role: null, uid }
  const rows = (await roleResp.json().catch(() => [])) as Array<{ role?: string }>
  return { role: rows[0]?.role || null, uid }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isBuilderUi = pathname.startsWith('/builder/')
  const isBuilderApi = pathname.startsWith('/api/builder/')
  if (!isBuilderUi && !isBuilderApi) return NextResponse.next()

  const roleState = await getRole(req)
  if (!roleState.uid) {
    if (isBuilderApi) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const url = req.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('auth', 'required')
    return NextResponse.redirect(url)
  }

  if (!roleState.role || !BUILDER_ROLES.has(roleState.role)) {
    if (isBuilderApi) return NextResponse.json({ error: 'Community Builder role required' }, { status: 403 })
    const url = req.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('auth', 'builder-required')
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/builder/:path*', '/api/builder/:path*'],
}
