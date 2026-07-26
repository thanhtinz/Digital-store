'use client';

// Tiny fetch helper for client components — throws Error with the API's
// human-readable message on non-2xx responses.
export async function api<T = any>(url: string, options?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = options || {};
  const res = await fetch(url, {
    ...rest,
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...rest.headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}
