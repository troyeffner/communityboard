import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const response = NextResponse.next()

  if (!request.cookies.get('viewer_id')?.value) {
    response.cookies.set('viewer_id', crypto.randomUUID(), {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365 * 2,
    })
  }

  if (!pathname.startsWith('/admin')) return response

  const configured = process.env.ADMIN_PASSWORD || ''
  if (!configured) {
    return new NextResponse('Admin route is disabled (missing ADMIN_PASSWORD).', { status: 403 })
  }

  const headerKey = request.headers.get('x-admin-key') || ''
  if (headerKey === configured) return response

  return new NextResponse('Forbidden', { status: 403 })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
