import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { audit } from '@/lib/audit';
import { failIntent, settleIntent } from '@/lib/payments';

export const dynamic = 'force-dynamic';

const FILTERS: Record<string, any> = {
  review: { status: 'AWAITING_REVIEW' },
  pending: { status: 'PENDING' },
  all: {},
};

// GET ?filter=review|pending|all — the manual transfer queue.
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();
  const filter = FILTERS[req.nextUrl.searchParams.get('filter') || 'review'] ? req.nextUrl.searchParams.get('filter')! : 'review';
  const where = { ...FILTERS[filter] };
  if (filter === 'all') where.createdAt = { gte: new Date(Date.now() - 30 * 86400_000) };

  const rows = await prisma.paymentIntent.findMany({
    where,
    orderBy: { id: 'desc' },
    take: 100,
    include: { user: { select: { email: true, name: true } } },
  });

  // Resolve each intent's target so the queue links to the real thing.
  const orderIds = rows.filter((r) => r.purpose === 'ORDER').map((r) => r.targetId);
  const orders = orderIds.length
    ? await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, code: true, status: true } })
    : [];

  return NextResponse.json({
    payments: rows.map((r) => ({
      id: r.id,
      ref: r.ref,
      purpose: r.purpose,
      method: r.method,
      status: r.status,
      baseAmount: Number(r.baseAmount),
      baseCurrency: r.baseCurrency,
      chargeAmount: Number(r.chargeAmount),
      chargeCurrency: r.chargeCurrency,
      memo: r.memo,
      proofUrl: r.proofUrl,
      payerNote: r.payerNote,
      email: r.user.email,
      name: r.user.name,
      orderCode: orders.find((o) => o.id === r.targetId)?.code || null,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() || null,
      reviewNote: r.reviewNote,
    })),
  });
});

// PATCH { id, action: 'approve' | 'reject', note? }
export const PATCH = handler(async (req: NextRequest) => {
  const admin = await requireAdmin();
  if (admin.role !== 'ADMIN') return jsonError(403, 'Only administrators can confirm payments');
  const body = await req.json();
  const id = Number(body.id);
  const action = body.action === 'reject' ? 'reject' : 'approve';
  const note = String(body.note || '').trim().slice(0, 300) || undefined;
  if (!Number.isInteger(id)) return jsonError(400, 'A valid payment id is required');

  const intent = await prisma.paymentIntent.findUnique({ where: { id } });
  if (!intent) return jsonError(404, 'Payment not found');

  // settleIntent and failIntent are both compare-and-swap, so two admins
  // clicking at once — or a SePay webhook landing mid-click — cannot double up.
  // gatewayRef is unique (it is the replay guard), so a manual approval has to
  // carry a reference unique to this payment, not just to the admin.
  const done =
    action === 'approve'
      ? await settleIntent(id, `manual:${id}:${admin.id}`)
      : await failIntent(id, 'FAILED', note || 'Rejected by an administrator');

  if (!done) {
    const fresh = await prisma.paymentIntent.findUnique({ where: { id } });
    return jsonError(409, `This payment was already ${String(fresh?.status || 'settled').toLowerCase()}`);
  }

  await prisma.paymentIntent.update({
    where: { id },
    data: { reviewedById: admin.id, reviewedAt: new Date(), reviewNote: note },
  });
  audit(admin, `payment.${action}`, `Payment ${intent.ref}`, `${intent.purpose} ${intent.targetId} · ${intent.chargeAmount} ${intent.chargeCurrency}`);
  return NextResponse.json({ ok: true });
});
