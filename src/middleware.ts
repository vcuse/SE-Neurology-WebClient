import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const isLoggedIn = request.cookies.get('isLoggedIn')?.value === 'true'
  
  if (request.nextUrl.pathname === '/') {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/users', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Prevent access to /users if not logged in
  if (request.nextUrl.pathname.startsWith('/users') && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/users/:path*'],
}
