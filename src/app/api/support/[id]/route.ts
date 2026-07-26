import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: Number(params.id), userId: user.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!ticket) return jsonError(404, 'Ticket not found');
  return NextResponse.json({ ticket });
});

// Customer reply — re-opens an answered/closed ticket.
export const POST = handler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  rateLimit('ticket-reply', 20, 60 * 60, String(user.id));
  const ticket = await prisma.supportTicket.findFirst({ where: { id: Number(params.id), userId: user.id } });
  if (!ticket) return jsonError(404, 'Ticket not found');
  const content = String((await req.json()).message || '').trim().slice(0, 5000);
  if (!content) return jsonError(400, 'Message cannot be empty');

  await prisma.$transaction([
    prisma.ticketMessage.create({ data: { ticketId: ticket.id, content, isStaff: false } }),
    prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: 'OPEN' } }),
  ]);
  const fresh = await prisma.supportTicket.findUnique({
    where: { id: ticket.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  return NextResponse.json({ ok: true, ticket: fresh });
});
