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
  const { pathname, hostname } = request.nextUrl

  // Check hostname to determine routing rules
  const isAppSubdomain = hostname.startsWith('app.')
  const isMarketingDomain = hostname === 'servaiapay.com' || hostname === 'www.servaiapay.com'

  if (isAppSubdomain) {
    // app.servaiapay.com - protect all routes except auth-related ones
    const isPublicRoute = pathname.startsWith('/login') ||
                         pathname.startsWith('/signup') ||
                         pathname.startsWith('/authorize') ||
                         pathname.startsWith('/api/auth') ||
                         pathname === '/api/stripe/connect/callback'

    if (!isPublicRoute && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } else if (isMarketingDomain) {
    // servaiapay.com or www.servaiapay.com - allow marketing pages, protect dashboard/admin
    const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/admin')

    if (isProtectedRoute && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } else {
    // For any other hostname, default to protecting dashboard/admin routes
    const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/admin')

    if (isProtectedRoute && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Redirect authenticated users away from auth pages
  if ((pathname === '/login' || pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}