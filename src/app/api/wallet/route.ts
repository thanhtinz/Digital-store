import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handler } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Wallet overview: balance + recent transactions.
export const GET = handler(async () => {
  const user = await requireUser();
  const txns = await prisma.walletTransaction.findMany({
    where: { userId: user.id },
    orderBy: { id: 'desc' },
    take: 50,
  });
  return NextResponse.json({
    balance: Number(user.balance),
    transactions: txns.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      note: t.note,
      createdAt: t.createdAt.toISOString(),
    })),
  });
});
