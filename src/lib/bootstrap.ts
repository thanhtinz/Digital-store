// First-boot bootstrap: makes a freshly deployed instance usable without a
// shell. Runs on every start but only ever acts when the store has no admin.
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from './db';

export async function ensureAdminAccount() {
  const existing = await prisma.user.count({ where: { role: 'ADMIN' } });
  if (existing > 0) return;

  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const envPassword = process.env.SEED_ADMIN_PASSWORD;
  // Never fall back to a well-known password on a public deployment.
  const password = envPassword || crypto.randomBytes(9).toString('base64url');

  // A non-admin account may already own the email (self sign-up) — promote it.
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
    console.log(`[bootstrap] promoted existing account ${email} to ADMIN`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name: 'Store Admin',
      passwordHash: bcrypt.hashSync(password, 10),
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
    },
  });

  console.log('[bootstrap] ------------------------------------------------');
  console.log(`[bootstrap] Created the first admin account: ${email}`);
  if (envPassword) {
    console.log('[bootstrap] Password: the SEED_ADMIN_PASSWORD you configured.');
  } else {
    console.log(`[bootstrap] Password: ${password}`);
    console.log('[bootstrap] This is shown once. Sign in and change it now.');
  }
  console.log('[bootstrap] ------------------------------------------------');
}
