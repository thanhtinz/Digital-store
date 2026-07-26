import prisma from './db';

// Wallet primitives. Every balance change goes through these helpers so the
// transaction log always matches the balance.

export async function creditWallet(userId: number, amount: number, type: string, note?: string): Promise<void> {
  const rounded = Math.round(amount * 100) / 100;
  if (rounded <= 0) return;
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { balance: { increment: rounded } } }),
    prisma.walletTransaction.create({ data: { userId, type, amount: rounded, note: note?.slice(0, 300) } }),
  ]);
}

// Atomically debits the wallet; returns false when the balance is
// insufficient (no partial withdrawal ever happens).
export async function debitWallet(userId: number, amount: number, type: string, note?: string): Promise<boolean> {
  const rounded = Math.round(amount * 100) / 100;
  if (rounded <= 0) return true;
  return prisma.$transaction(async (tx) => {
    const res = await tx.user.updateMany({
      where: { id: userId, balance: { gte: rounded } },
      data: { balance: { decrement: rounded } },
    });
    if (res.count !== 1) return false;
    await tx.walletTransaction.create({ data: { userId, type, amount: -rounded, note: note?.slice(0, 300) } });
    return true;
  });
}

export function generateTopupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'T';
  for (let i = 0; i < 9; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Marks a top-up paid and credits the wallet exactly once.
export async function completeTopup(topupId: number): Promise<void> {
  const topup = await prisma.topup.findUnique({ where: { id: topupId } });
  if (!topup || topup.status !== 'PENDING') return;
  const updated = await prisma.topup.updateMany({
    where: { id: topupId, status: 'PENDING' },
    data: { status: 'PAID', paidAt: new Date() },
  });
  if (updated.count !== 1) return; // another request beat us to it
  await creditWallet(topup.userId, Number(topup.amount), 'TOPUP', `Top-up ${topup.code} via ${topup.method}`);
}
