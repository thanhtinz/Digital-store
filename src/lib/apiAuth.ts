import crypto from 'crypto';
import { NextRequest } from 'next/server';
import prisma from './db';
import type { User } from '@prisma/client';
import { rateLimit } from './rateLimit';

export class ApiAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const secret = crypto.randomBytes(24).toString('hex');
  const prefix = `dsk_${crypto.randomBytes(4).toString('hex')}`;
  const key = `${prefix}_${secret}`;
  return { key, prefix, hash: crypto.createHash('sha256').update(key).digest('hex') };
}

// Resolves the Bearer key to its owner. Throws ApiAuthError on any failure.
export async function requireApiKey(req: NextRequest): Promise<{ user: User; keyId: number }> {
  const header = req.headers.get('authorization') || '';
  const key = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!key) throw new ApiAuthError(401, 'Missing Authorization: Bearer <api key> header');

  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash: hash }, include: { user: true } });
  if (!apiKey || !apiKey.isActive) throw new ApiAuthError(401, 'Invalid or revoked API key');
  if (apiKey.user.isBlocked) throw new ApiAuthError(403, 'Account is blocked');

  rateLimit('api-v1', 120, 60, `key:${apiKey.id}`); // 120 requests/minute per key

  prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return { user: apiKey.user, keyId: apiKey.id };
}
