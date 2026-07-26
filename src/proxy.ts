import { auth } from '@/auth'

export default auth((req) => {
  if (!req.auth && !req.nextUrl.pathname.startsWith('/login')) {
    const url = new URL('/login', req.nextUrl.origin)
    return Response.redirect(url)
  }
})

export const config = { matcher: ['/((?!api/auth|_next|favicon.ico).*)'] }
