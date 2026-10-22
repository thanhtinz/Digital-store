import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, setSessionCookie } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { isValidEmail } from '@/lib/utils';
import { setSettings } from '@/lib/settings';
import { isSetupComplete, markSetupComplete } from '@/lib/setup';
import { rateLimit } from '@/lib/rateLimit';
import { isLocale } from '@/i18n';

export const dynamic = 'force-dynamic';

// Whether the first-run wizard still needs to run. Reveals nothing the
// storefront redirect doesn't already reveal to any visitor.
export const GET = handler(async () => {
  return NextResponse.json({ setupRequired: !(await isSetupComplete()) });
});

// Serializes completions inside this process (the deployment model is a
// single instance — the rate limiter documents the same assumption), so two
// simultaneous submissions cannot both pass the "no admin yet" check and
// mint two admins. The authoritative re-check happens inside the lock.
let setupLock: Promise<void> = Promise.resolve();
async function withSetupLock<T>(fn: () => Promise<T>): Promise<T> {
  let release!: () => void;
  const next = new Promise<void>((resolve) => (release = resolve));
  const prev = setupLock;
  setupLock = next;
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

// One-shot installer: creates the first ADMIN account and saves the store
// identity through the regular settings system. Once any admin exists this
// route refuses forever — there is no way to re-run setup to mint a second
// admin; further admins are created from the admin panel.
export const POST = handler(async (req: NextRequest) => {
  rateLimit('setup', 10, 60 * 60); // 10 attempts / hour per IP
  if (await isSetupComplete()) return jsonError(403, 'Setup has already been completed');

  const body = await req.json();
  const adminName = String(body.adminName || '').trim().slice(0, 120);
  const adminEmail = String(body.adminEmail || '').trim().toLowerCase();
  const adminPassword = String(body.adminPassword || '');
  const adminPasswordConfirm = String(body.adminPasswordConfirm || '');
  const siteName = String(body.siteName || '').trim().slice(0, 120);
  const tagline = String(body.tagline || '').trim().slice(0, 200);
  const supportEmail = String(body.supportEmail || '').trim().toLowerCase();
  const currency = String(body.currency || '').trim().toUpperCase();
  const language = String(body.language || '');

  if (!adminName) return jsonError(400, 'Please enter the admin name');
  if (!isValidEmail(adminEmail)) return jsonError(400, 'Please enter a valid admin email address');
  if (adminPassword.length < 8) return jsonError(400, 'Admin password must be at least 8 characters');
  if (adminPassword !== adminPasswordConfirm) return jsonError(400, 'Admin passwords do not match');
  if (!siteName) return jsonError(400, 'Please enter the store name');
  if (supportEmail && !isValidEmail(supportEmail)) return jsonError(400, 'Please enter a valid support email address');
  if (!/^[A-Z]{3}$/.test(currency)) return jsonError(400, 'Currency must be a 3-letter code, e.g. USD or VND');
  if (!isLocale(language)) return jsonError(400, 'Please choose a supported language');

  type LockResult = { admin: import('@prisma/client').User } | { error: NextResponse };
  const result: LockResult = await withSetupLock(async (): Promise<LockResult> => {
    // Re-check inside the lock: a concurrent submission may have finished
    // setup while this one was waiting.
    if (await isSetupComplete()) return { error: jsonError(403, 'Setup has already been completed') };

    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existing) {
      // Never silently promote an existing account from the installer —
      // the owner picks a different email, or an admin promotes it later.
      return { error: jsonError(409, 'An account with this email already exists — please use a different email') };
    }

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash: hashPassword(adminPassword),
        role: 'ADMIN',
        emailVerifiedAt: new Date(), // the owner just proved control of it
      },
    });

    await setSettings({
      site_name: siteName,
      site_tagline: tagline,
      support_email: supportEmail || adminEmail,
      currency,
      default_locale: language,
    });
    markSetupComplete();
    return { admin };
  });
  if ('error' in result) return result.error;

  // Land the owner signed in as the admin they just created.
  setSessionCookie(result.admin);
  return NextResponse.json({ ok: true });
});
