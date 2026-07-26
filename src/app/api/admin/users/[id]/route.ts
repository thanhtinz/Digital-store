import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const PATCH = handler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireAdmin();
  if (admin.role !== 'ADMIN') return jsonError(403, 'Only administrators can manage users');
  const id = Number(params.id);
  if (id === admin.id) return jsonError(400, 'You cannot modify your own account here');
  const b = await req.json();

  const data: any = {};
  if (b.isBlocked !== undefined) data.isBlocked = !!b.isBlocked;
  if (b.role !== undefined && ['CUSTOMER', 'STAFF', 'ADMIN'].includes(b.role)) data.role = b.role;
  const user = await prisma.user.update({ where: { id }, data });
  audit(admin, 'user.update', user.email, JSON.stringify(data));
  return NextResponse.json({ ok: true, user: { id: user.id, role: user.role, isBlocked: user.isBlocked } });
});
