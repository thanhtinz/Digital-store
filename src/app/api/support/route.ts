import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { rateLimit } from '@/lib/rateLimit';
import { sendTelegram, escapeHtml } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

// Only allow attachment URLs that point at our own media store.
function cleanAttachments(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((u) => String(u))
    .filter((u) => /^\/api\/media\/\d+$/.test(u))
    .slice(0, 3);
}


export const GET = handler(async () => {
  const user = await requireUser();
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: { _count: { select: { messages: true } } },
  });
  return NextResponse.json({ tickets });
});

export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser();
  rateLimit('ticket-create', 5, 60 * 60, String(user.id)); // 5 tickets/hour per user
  const b = await req.json();
  const subject = String(b.subject || '').trim().slice(0, 200);
  const message = String(b.message || '').trim().slice(0, 5000);
  const orderCode = b.orderCode ? String(b.orderCode).trim().toUpperCase().slice(0, 20) : null;
  if (!subject || !message) return jsonError(400, 'Subject and message are required');

  if (orderCode) {
    const order = await prisma.order.findFirst({ where: { code: orderCode, userId: user.id } });
    if (!order) return jsonError(400, 'That order code was not found on your account');
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: user.id,
      subject,
      orderCode,
      messages: { create: { content: message, isStaff: false, attachments: cleanAttachments(b.attachments) } },
    },
  });
  sendTelegram(
    `<b>New support ticket</b> #${ticket.id}\n${escapeHtml(subject)}\nFrom ${escapeHtml(user.email)}${orderCode ? ` · order ${orderCode}` : ''}`
  ).catch(() => {});
  return NextResponse.json({ ok: true, ticket });
});
