import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { handler, jsonError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requireAdmin();
  const sales = await prisma.flashSale.findMany({
    orderBy: { id: 'desc' },
    include: {
      items: { include: { package: { include: { product: { select: { name: true } } } } } },
    },
  });
  return NextResponse.json({ sales });
});

export const POST = handler(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = await req.json();
  const name = String(b.name || '').trim().slice(0, 160);
  const startsAt = b.startsAt ? new Date(b.startsAt) : null;
  const endsAt = b.endsAt ? new Date(b.endsAt) : null;
  if (!name || !startsAt || !endsAt || endsAt <= startsAt) {
    return jsonError(400, 'Name and a valid start/end window are required');
  }
  const sale = await prisma.flashSale.create({
    data: {
      name,
      startsAt,
      endsAt,
      isActive: b.isActive !== false,
      items: {
        create: (Array.isArray(b.items) ? b.items : []).slice(0, 100).map((it: any) => ({
          packageId: Number(it.packageId),
          salePrice: Number(it.salePrice) || 0,
          quantityLimit: it.quantityLimit ? Number(it.quantityLimit) : null,
        })),
      },
    },
    include: { items: true },
  });
  audit(admin, 'flashsale.create', sale.name);
  return NextResponse.json({ ok: true, sale });
});
