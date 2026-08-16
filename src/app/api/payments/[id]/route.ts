import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { rateLimit } from '@/lib/rateLimit';
import { buildInstructions } from '@/lib/bank';
import { settleIntent } from '@/lib/payments';
import { getPayosLink } from '@/lib/payos';

export const dynamic = 'force-dynamic';

// Status of one payment attempt, polled by the transfer screen.
// Looked up by id and scoped to the owner: refs are sequential and therefore
// guessable, so exposing them unscoped would leak other customers' amounts.
export const GET = handler(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  rateLimit('pay-status', 300, 60 * 60, String(user.id));
  const id = Number(params.id);
  if (!Number.isInteger(id)) return jsonError(400, 'Invalid payment id');

  let intent = await prisma.paymentIntent.findUnique({ where: { id } });
  if (!intent || intent.userId !== user.id) return jsonError(404, 'Payment not found');

  // Webhooks can be late or lost; ask PayOS directly before giving up.
  if (intent.status === 'PENDING' && intent.method === 'payos') {
    const link = await getPayosLink(intent.ref).catch(() => null);
    if (link?.status === 'PAID') {
      await settleIntent(intent.id, intent.gatewayRef || `payos:${intent.ref}`);
      intent = (await prisma.paymentIntent.findUnique({ where: { id } }))!;
    }
  }

  const target =
    intent.purpose === 'ORDER'
      ? await prisma.order.findUnique({ where: { id: intent.targetId }, select: { code: true } })
      : null;

  return NextResponse.json({
    payment: {
      id: intent.id,
      ref: intent.ref,
      purpose: intent.purpose,
      method: intent.method,
      status: intent.status,
      baseAmount: Number(intent.baseAmount),
      baseCurrency: intent.baseCurrency,
      chargeAmount: Number(intent.chargeAmount),
      chargeCurrency: intent.chargeCurrency,
      memo: intent.memo,
      expiresAt: intent.expiresAt?.toISOString() || null,
      orderCode: target?.code || null,
      instructions: intent.method === 'payos' ? null : await buildInstructions(intent),
    },
  });
});
