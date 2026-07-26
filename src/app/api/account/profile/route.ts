import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser();
  const b = await req.json();
  const name = String(b.name || '').trim().slice(0, 120);
  if (!name) return jsonError(400, 'Name cannot be empty');
  const avatarUrl = b.avatarUrl !== undefined ? String(b.avatarUrl || '').slice(0, 500) : undefined;

  await prisma.user.update({
    where: { id: user.id },
    data: { name, ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}) },
  });
  return NextResponse.json({ ok: true });
});
