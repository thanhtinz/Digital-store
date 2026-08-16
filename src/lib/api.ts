import { NextResponse } from 'next/server';
import { AuthError } from './auth';
import { OrderError } from './orders';
import { RateLimitError } from './rateLimit';

// `code` is an optional stable identifier the storefront can translate. The
// English message always travels too, so an uncoded error still reads fine.
export function jsonError(status: number, message: string, code?: string) {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });
}

// Wraps a route handler with uniform error handling.
export function handler<T extends (...args: any[]) => Promise<Response>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (e: any) {
      if (e instanceof AuthError) return jsonError(e.status, e.message, e.status === 401 ? 'authRequired' : undefined);
      if (e instanceof RateLimitError) return jsonError(429, e.message, 'rateLimited');
      if (e instanceof OrderError) return jsonError(400, e.message);
      // A malformed request body is the caller's fault, not a server fault.
      if (e instanceof SyntaxError) return jsonError(400, 'Invalid JSON body', 'invalidJson');
      console.error('API error:', e);
      return jsonError(500, 'Something went wrong. Please try again.');
    }
  }) as T;
}
