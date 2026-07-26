import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies, headers } from 'next/headers';
import type { User } from '@prisma/client';
import prisma from './db';

const SESSION_COOKIE = 'ds_session';
const SESSION_DAYS = 30;

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET must be set in production');
  }
  return 'dev-only-insecure-secret';
}

export type SessionPayload = { uid: number; role: string; sv?: number };

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    return false;
  }
}

export function createSessionToken(user: Pick<User, 'id' | 'role' | 'sessionVersion'>): string {
  return jwt.sign({ uid: user.id, role: user.role, sv: user.sessionVersion } satisfies SessionPayload, authSecret(), {
    expiresIn: `${SESSION_DAYS}d`,
  });
}

export function setSessionCookie(user: Pick<User, 'id' | 'role' | 'sessionVersion'>): void {
  cookies().set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(): void {
  cookies().set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function getSessionUser(): Promise<User | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, authSecret()) as SessionPayload;
    const user = await prisma.user.findUnique({ where: { id: payload.uid } });
    if (!user || user.isBlocked) return null;
    // Reject tokens minted before the last credential change.
    if ((payload.sv ?? 0) !== user.sessionVersion) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new AuthError(401, 'Authentication required');
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== 'ADMIN' && user.role !== 'STAFF') throw new AuthError(403, 'Admin access required');
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ── One-time tokens (email verification / password reset) ──────────────

export async function issueToken(userId: number, type: 'VERIFY_EMAIL' | 'RESET_PASSWORD', ttlMinutes: number): Promise<string> {
  const raw = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  await prisma.authToken.deleteMany({ where: { userId, type, usedAt: null } });
  await prisma.authToken.create({
    data: { userId, type, tokenHash, expiresAt: new Date(Date.now() + ttlMinutes * 60_000) },
  });
  return raw;
}

export async function consumeToken(raw: string, type: 'VERIFY_EMAIL' | 'RESET_PASSWORD'): Promise<number | null> {
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const token = await prisma.authToken.findUnique({ where: { tokenHash } });
  if (!token || token.type !== type || token.usedAt || token.expiresAt < new Date()) return null;
  await prisma.authToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
  return token.userId;
}

// ── Login history ──────────────────────────────────────────────────────

export async function recordLogin(userId: number, method: string, success: boolean): Promise<void> {
  try {
    const h = headers();
    const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || null;
    const userAgent = (h.get('user-agent') || '').slice(0, 400) || null;
    await prisma.loginHistory.create({ data: { userId, method, success, ip, userAgent } });
  } catch {
    // Never fail a login because history logging failed.
  }
}

// ── Security helpers ───────────────────────────────────────────────────

// Invalidates every session for the user (call after password/2FA changes),
// returning the fresh user so the caller can re-issue its own cookie.
export async function bumpSessionVersion(userId: number): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
}

const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MIN = 15;

// True when the account has had too many failed password attempts recently.
export async function isAccountLocked(userId: number): Promise<boolean> {
  const failures = await prisma.loginHistory.count({
    where: {
      userId,
      success: false,
      createdAt: { gte: new Date(Date.now() - LOCKOUT_WINDOW_MIN * 60_000) },
    },
  });
  return failures >= LOCKOUT_ATTEMPTS;
}

export const LOCKOUT_MESSAGE = `Too many failed sign-in attempts. This account is temporarily locked — try again in ${LOCKOUT_WINDOW_MIN} minutes or reset your password.`;
