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
  if (!res.ok) {
    // Carry the machine-readable code alongside the server's English text so
    // the UI can translate it and fall back cleanly when there is none.
    const err = new Error(data.error || `Request failed (${res.status})`) as Error & { code?: string };
    if (data.code) err.code = String(data.code);
    throw err;
  }
  return data as T;
}
