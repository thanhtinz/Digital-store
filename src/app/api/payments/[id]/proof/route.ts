import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { rateLimit } from '@/lib/rateLimit';
import { sendTelegram, escapeHtml } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

// POST { proofUrl?, payerNote? } — the customer states they have transferred.
// Moves a manual bank transfer into the admin review queue.
export const POST = handler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  rateLimit('pay-proof', 10, 60 * 60, String(user.id));
  const id = Number(params.id);
  if (!Number.isInteger(id)) return jsonError(400, 'Invalid payment id');

  const intent = await prisma.paymentIntent.findUnique({ where: { id } });
  if (!intent || intent.userId !== user.id) return jsonError(404, 'Payment not found');
  if (intent.method !== 'bank') return jsonError(400, 'This payment does not need manual confirmation');

  const body = await req.json().catch(() => ({}));
  const rawProof = String(body.proofUrl || '');
  // Only accept media we stored ourselves — never an arbitrary URL.
  const proofUrl = /^\/api\/media\/\d+$/.test(rawProof) ? rawProof : null;
  const payerNote = String(body.payerNote || '').trim().slice(0, 300) || null;

  // Conditional update: a second submission finds nothing to change.
  const moved = await prisma.paymentIntent.updateMany({
    where: { id, userId: user.id, status: 'PENDING' },
    data: { status: 'AWAITING_REVIEW', proofUrl, payerNote },
  });
  if (moved.count !== 1) {
    const fresh = await prisma.paymentIntent.findUnique({ where: { id } });
    if (fresh?.status === 'AWAITING_REVIEW') return NextResponse.json({ ok: true, alreadySubmitted: true });
    return jsonError(400, 'This payment can no longer be confirmed');
  }

  sendTelegram(
    `<b>Bank transfer to review</b> ${escapeHtml(intent.memo || String(intent.ref))}\n` +
      `${escapeHtml(user.email)} · ${Number(intent.chargeAmount).toLocaleString('en-US')} ${escapeHtml(intent.chargeCurrency)}`
  ).catch(() => {});

  return NextResponse.json({ ok: true });
});
