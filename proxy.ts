import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()           { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // If on app subdomain and hitting root, redirect to login or dashboard
  const host = request.headers.get('host') || ''
  const isAppSubdomain = host.startsWith('app.')
  if (pathname === '/' && isAppSubdomain) {
    return NextResponse.redirect(new URL(user ? '/dashboard' : '/login', request.url))
  }

  // Public routes - no auth needed
  const publicRoutes = ['/get-started', '/privacy', '/terms', '/login', '/signup', '/authorize', '/api', '/crew']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Protected routes - require auth
  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/admin')

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from auth pages
  if ((pathname === '/login' || pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}