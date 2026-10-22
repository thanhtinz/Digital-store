// First-boot bootstrap: makes a freshly deployed instance usable without a
// shell. Runs on every start but only ever acts when the store has no admin.
import bcrypt from 'bcryptjs';
import prisma from './db';

export async function ensureAdminAccount() {
  const existing = await prisma.user.count({ where: { role: 'ADMIN' } });
  if (existing > 0) return;

  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const envPassword = process.env.SEED_ADMIN_PASSWORD;
  // Without an operator-configured password we no longer mint an account
  // with a random password that only ever appears in the boot logs: the
  // first-run setup page (/setup) is where the owner creates the admin
  // account and the store identity. Auto-creation stays available for
  // headless deploys that pin SEED_ADMIN_PASSWORD.
  if (!envPassword) {
    console.log('[bootstrap] No admin account yet — complete first-run setup at /setup');
    return;
  }
  const password = envPassword;

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
  console.log('[bootstrap] Password: the SEED_ADMIN_PASSWORD you configured.');
  console.log('[bootstrap] ------------------------------------------------');
}
