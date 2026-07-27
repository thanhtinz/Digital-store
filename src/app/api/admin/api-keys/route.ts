import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { audit } from '@/lib/audit';
import { generateApiKey } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requireAdmin();
  const keys = await prisma.apiKey.findMany({
    orderBy: { id: 'desc' },
    include: { user: { select: { email: true, name: true, balance: true } } },
  });
  return NextResponse.json({
    keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
      user: { email: k.user.email, name: k.user.name, balance: Number(k.user.balance) },
    })),
  });
});

// POST { email, name } — issue a key for a user. The full key is returned
// exactly once; only its hash is stored.
export const POST = handler(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = await req.json();
  const email = String(b.email || '').trim().toLowerCase();
  const name = String(b.name || '').trim().slice(0, 120) || 'API key';
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return jsonError(404, 'No user with that email');

  const { key, prefix, hash } = generateApiKey();
  const created = await prisma.apiKey.create({
    data: { userId: user.id, name, prefix, keyHash: hash },
  });
  audit(admin, 'apikey.create', `${prefix} (${email})`);
  return NextResponse.json({ ok: true, id: created.id, key });
});

// DELETE { id } — revoke.
export const DELETE = handler(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const id = Number((await req.json()).id);
  const key = await prisma.apiKey.update({ where: { id }, data: { isActive: false } });
  audit(admin, 'apikey.revoke', key.prefix);
  return NextResponse.json({ ok: true });
});
