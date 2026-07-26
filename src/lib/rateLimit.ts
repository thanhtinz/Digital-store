import { headers } from 'next/headers';

// In-memory sliding-window rate limiter (per process). Suited for a
// single-instance deployment; swap for Redis if you scale horizontally.
type Bucket = { times: number[] };
const buckets = new Map<string, Bucket>();

// Periodic cleanup so the map never grows unbounded.
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  Array.from(buckets.entries()).forEach(([key, b]) => {
    b.times = b.times.filter((t) => t > cutoff);
    if (!b.times.length) buckets.delete(key);
  });
}, 10 * 60 * 1000).unref?.();

export function clientIp(): string {
  const h = headers();
  return (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || 'local';
}

export class RateLimitError extends Error {
  constructor(message = 'Too many attempts. Please wait a moment and try again.') {
    super(message);
  }
}

// Throws RateLimitError when `key` exceeds `max` hits within `windowSec`.
export function rateLimit(scope: string, max: number, windowSec: number, key = clientIp()): void {
  const id = `${scope}:${key}`;
  const now = Date.now();
  const windowStart = now - windowSec * 1000;
  const bucket = buckets.get(id) || { times: [] };
  bucket.times = bucket.times.filter((t) => t > windowStart);
  if (bucket.times.length >= max) {
    buckets.set(id, bucket);
    throw new RateLimitError();
  }
  bucket.times.push(now);
  buckets.set(id, bucket);
}
