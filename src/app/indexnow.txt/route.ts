import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// IndexNow key file — proves domain ownership to search engines.
export async function GET() {
  const { indexnow_key: key } = await getSettings(['indexnow_key']);
  return new Response(key || '', { headers: { 'Content-Type': 'text/plain' } });
}
