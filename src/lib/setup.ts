import prisma from './db';

// First-run setup state. The store is uninitialized until an ADMIN account
// exists — created by the /setup wizard, by `npm run db:seed`, or by the
// boot bootstrap when SEED_ADMIN_PASSWORD is configured. While uninitialized
// the storefront and admin layouts redirect every page to /setup, and the
// setup API accepts exactly one completion.
//
// The answer is cached briefly, mirroring the settings store: page layouts
// already query the database on every render, and setup completion flips
// the cache immediately so the owner is never stuck behind a stale "not
// set up" answer.
const CACHE_TTL_MS = 5_000;
let cache: { at: number; complete: boolean } | null = null;

export async function isSetupComplete(): Promise<boolean> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.complete;
  let complete = true;
  try {
    complete = (await prisma.user.count({ where: { role: 'ADMIN' } })) > 0;
  } catch {
    // Database unreachable: do not trap visitors in a redirect to a wizard
    // that cannot work either. The storefront already renders its shell
    // when the DB is down; setup simply waits for a healthier moment.
    complete = true;
  }
  cache = { at: Date.now(), complete };
  return complete;
}

export function markSetupComplete(): void {
  cache = { at: Date.now(), complete: true };
}
