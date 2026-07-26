import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { handler, jsonError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const PATCH = handler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireAdmin();
  const id = Number(params.id);
  const b = await req.json();

  await prisma.$transaction(async (tx) => {
    await tx.flashSale.update({
      where: { id },
      data: {
        ...(b.name !== undefined ? { name: String(b.name).trim().slice(0, 160) } : {}),
        ...(b.startsAt !== undefined ? { startsAt: new Date(b.startsAt) } : {}),
        ...(b.endsAt !== undefined ? { endsAt: new Date(b.endsAt) } : {}),
        ...(b.isActive !== undefined ? { isActive: !!b.isActive } : {}),
      },
    });
    if (Array.isArray(b.items)) {
      await tx.flashSaleItem.deleteMany({ where: { flashSaleId: id } });
      for (const it of b.items.slice(0, 100)) {
        if (!Number(it.packageId)) continue;
        await tx.flashSaleItem.create({
          data: {
            flashSaleId: id,
            packageId: Number(it.packageId),
            salePrice: Number(it.salePrice) || 0,
            quantityLimit: it.quantityLimit ? Number(it.quantityLimit) : null,
          },
        });
      }
    }
  });

  const sale = await prisma.flashSale.findUnique({ where: { id }, include: { items: true } });
  if (!sale) return jsonError(404, 'Flash sale not found');
  audit(admin, 'flashsale.update', sale.name);
  return NextResponse.json({ ok: true, sale });
});

export const DELETE = handler(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireAdmin();
  await prisma.flashSale.delete({ where: { id: Number(params.id) } });
  audit(admin, 'flashsale.delete', `#${params.id}`);
  return NextResponse.json({ ok: true });
});
