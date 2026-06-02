/**
 * Card Charge Routes (nạp thẻ đổi số dư)
 *  - GET  /card-charge/rates    → tỷ lệ chiết khấu + telco khả dụng
 *  - POST /card-charge/submit   → gửi thẻ nạp
 *  - GET  /card-charge/history  → lịch sử của user
 *  - POST /card-charge/callback → callback từ provider (đã có ở balance.ts, alias ở đây)
 *
 * Provider thực tế (giftcard adapter) cấu hình qua /api-providers.
 * Nếu chưa bật exchange → trả về available:false.
 */

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import prisma from '../db';
import { requireUser } from '../middleware/auth';
import { money } from '../services/orders';
import { notifyCardCharge } from '../services/telegram';

const router = Router();

const DEFAULT_TELCOS = ['VIETTEL', 'MOBIFONE', 'VINAPHONE', 'VNMOBI', 'ZING', 'GARENA'];
const DEFAULT_AMOUNTS = [10000, 20000, 50000, 100000, 200000, 300000, 500000, 1000000];

async function getActiveGiftcardProvider() {
  return prisma.apiProvider.findFirst({
    where: { providerType: 'giftcard', isActive: true },
  });
}

/** Tỷ lệ chiết khấu + telco khả dụng */
router.get('/rates', async (_req: Request, res: Response) => {
  const provider = await getActiveGiftcardProvider();
  if (!provider) {
    res.json({ available: false, exchange_enabled: false, telcos: [], rates: {}, amounts: [] });
    return;
  }
  const rates: any = provider.cardRates || {};
  const exchangeEnabled = rates.exchange_enabled === true;
  if (!exchangeEnabled) {
    res.json({ available: true, exchange_enabled: false, telcos: [], rates: {}, amounts: [] });
    return;
  }
  res.json({
    available: true,
    exchange_enabled: true,
    telcos: DEFAULT_TELCOS,
    amounts: DEFAULT_AMOUNTS,
    discount_rate: rates.discount_rate || 0,
    rates,
  });
});

function getDiscountRate(rates: any, telco: string, amount: number): number {
  if (rates?.[telco]?.[String(amount)] !== undefined) return Number(rates[telco][String(amount)]);
  return Number(rates?.discount_rate || 0);
}

/** Gửi thẻ nạp */
router.post('/submit', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { telco, code, serial, amount } = req.body;

    if (!code?.trim() || !serial?.trim()) { res.status(400).json({ detail: 'Mã thẻ và serial không được để trống' }); return; }
    if (!amount || amount <= 0) { res.status(400).json({ detail: 'Mệnh giá không hợp lệ' }); return; }

    const provider = await getActiveGiftcardProvider();
    if (!provider) { res.status(400).json({ detail: 'Chức năng đổi thẻ chưa khả dụng' }); return; }

    const rates: any = provider.cardRates || {};
    if (rates.exchange_enabled !== true) { res.status(400).json({ detail: 'Chức năng đổi thẻ chưa được bật' }); return; }

    const discountRate = getDiscountRate(rates, String(telco).toUpperCase(), amount);
    const requestId = randomUUID().replace(/-/g, '').slice(0, 16);

    const txn = await prisma.cardChargeTransaction.create({
      data: {
        userId: user.user_id,
        telco: String(telco).toUpperCase().trim(),
        code: code.trim(),
        serial: serial.trim(),
        declaredAmount: amount,
        discountRate,
        requestId,
        apiProviderId: provider.id,
        status: 'pending',
      },
    });

    // Lưu ý: việc gọi adapter provider thực tế (charge card) được xử lý bất đồng bộ
    // qua callback /balance/card-charge/callback. Ở đây chỉ tạo giao dịch pending.
    notifyCardCharge(user.email, txn.telco, amount).catch(() => {});
    res.json({
      request_id: txn.requestId,
      status: txn.status,
      declared_amount: money(txn.declaredAmount),
      discount_rate: money(txn.discountRate),
      message: 'Đã gửi thẻ, đang chờ xử lý',
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Lịch sử nạp thẻ của user */
router.get('/history', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const [total, txns] = await Promise.all([
      prisma.cardChargeTransaction.count({ where: { userId: user.user_id } }),
      prisma.cardChargeTransaction.findMany({
        where: { userId: user.user_id },
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    res.json({
      total,
      page,
      items: txns.map((t: any) => ({
        id: t.id,
        telco: t.telco,
        declared_amount: money(t.declaredAmount),
        real_value: t.realValue ? money(t.realValue) : null,
        credited_amount: t.creditedAmount ? money(t.creditedAmount) : null,
        discount_rate: money(t.discountRate),
        status: t.status,
        created_at: t.createdAt?.toISOString(),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Trạng thái 1 giao dịch */
router.get('/:txnId/status', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const txn = await prisma.cardChargeTransaction.findFirst({
      where: { id: parseInt(req.params.txnId), userId: user.user_id },
    });
    if (!txn) { res.status(404).json({ detail: 'Không tìm thấy giao dịch' }); return; }
    res.json({
      id: txn.id,
      status: txn.status,
      credited_amount: txn.creditedAmount ? money(txn.creditedAmount) : null,
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

export default router;
