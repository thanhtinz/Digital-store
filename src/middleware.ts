import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Security headers on every response.
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.headers.set('X-DNS-Prefetch-Control', 'off');
  if (req.nextUrl.protocol === 'https:') {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  }
  return res;
}

export const config = {
  // Everything except Next.js static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
