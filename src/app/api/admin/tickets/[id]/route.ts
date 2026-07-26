import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { getSettings, getAppUrl } from '@/lib/settings';
import { sendMail, emailLayout, buttonHtml } from '@/lib/mail';

export const dynamic = 'force-dynamic';

// PATCH { action: "reply", message } | { action: "close" } | { action: "reopen" }
export const PATCH = handler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const id = Number(params.id);
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: { user: { select: { email: true, name: true } } },
  });
  if (!ticket) return jsonError(404, 'Ticket not found');
  const b = await req.json();

  if (b.action === 'reply') {
    const content = String(b.message || '').trim().slice(0, 5000);
    if (!content) return jsonError(400, 'Reply cannot be empty');
    await prisma.$transaction([
      prisma.ticketMessage.create({ data: { ticketId: id, content, isStaff: true } }),
      prisma.supportTicket.update({ where: { id }, data: { status: 'ANSWERED' } }),
    ]);
    // Automatic email so the customer knows support replied.
    const s = await getSettings(['site_name']);
    const appUrl = await getAppUrl();
    sendMail(
      ticket.user.email,
      `Support replied to your ticket #${id} — ${s.site_name}`,
      emailLayout(s.site_name, `New reply on “${ticket.subject}”`,
        `<p>${content.replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>
         ${buttonHtml(`${appUrl}/support/${id}`, 'View & reply')}`)
    ).catch(() => {});
  } else if (b.action === 'close') {
    await prisma.supportTicket.update({ where: { id }, data: { status: 'CLOSED' } });
  } else if (b.action === 'reopen') {
    await prisma.supportTicket.update({ where: { id }, data: { status: 'OPEN' } });
  } else {
    return jsonError(400, 'Unknown action');
  }

  const fresh = await prisma.supportTicket.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } }, messages: { orderBy: { createdAt: 'asc' } } },
  });
  return NextResponse.json({ ok: true, ticket: fresh });
});
