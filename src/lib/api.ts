import { NextResponse } from 'next/server';
import { AuthError } from './auth';
import { OrderError } from './orders';

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

// Wraps a route handler with uniform error handling.
export function handler<T extends (...args: any[]) => Promise<Response>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (e: any) {
      if (e instanceof AuthError) return jsonError(e.status, e.message);
      if (e instanceof OrderError) return jsonError(400, e.message);
      console.error('API error:', e);
      return jsonError(500, 'Something went wrong. Please try again.');
    }
  }) as T;
}
