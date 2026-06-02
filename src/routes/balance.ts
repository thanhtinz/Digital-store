import { Router, Request, Response } from 'express';
import prisma from '../db';
import { notifyWithdrawal } from '../services/telegram';
import { requireUser, requireAdmin } from '../middleware/auth';
import { money } from '../services/orders';

const router = Router();

// ── Lấy số dư ─────────────────────────────────────────
router.get('/me', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const dbUser = await prisma.user.findUnique({ where: { id: user.user_id } });
    res.json({ balance: dbUser ? money(dbUser.balance) : 0 });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Lịch sử giao dịch ─────────────────────────────────
router.get(['/transactions', '/history'], requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [total, txs] = await Promise.all([
      prisma.balanceTransaction.count({ where: { userId: user.user_id } }),
      prisma.balanceTransaction.findMany({
        where: { userId: user.user_id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      total, page,
      items: txs.map((t: any) => ({
        id: t.id,
        amount: money(t.amount),
        balanceAfter: money(t.balanceAfter),
        type: t.type,
        status: t.status,
        reference: t.reference,
        description: t.description,
        createdAt: t.createdAt?.toISOString(),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: điều chỉnh số dư ────────────────────────────
router.post('/admin/adjust', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { user_id, amount, reason } = req.body;
    if (!user_id || amount === undefined) {
      res.status(422).json({ detail: 'user_id và amount không được để trống' });
      return;
    }
    const dbUser = await prisma.user.update({
      where: { id: parseInt(user_id) },
      data: { balance: { increment: parseFloat(amount) } },
    });
    await prisma.balanceTransaction.create({
      data: {
        userId: dbUser.id,
        amount: parseFloat(amount),
        balanceAfter: money(dbUser.balance),
        type: 'admin_adjust',
        status: 'completed',
        description: reason || 'Điều chỉnh thủ công từ admin',
      },
    });
    res.json({ message: 'Đã điều chỉnh số dư', balance: money(dbUser.balance) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: nạp thẻ callback ───────────────────────────
router.post('/card-charge/callback', async (req: Request, res: Response) => {
  // Xử lý callback từ provider nạp thẻ
  try {
    const { request_id, status, real_value, trans_id } = req.body;
    const tx = await prisma.cardChargeTransaction.findUnique({ where: { requestId: request_id } });
    if (!tx) { res.json({ status: 1, message: 'ok' }); return; }

    if (status === 1 && real_value > 0) {
      const creditAmount = real_value * (1 - money(tx.discountRate) / 100);
      const dbUser = await prisma.user.update({
        where: { id: tx.userId },
        data: { balance: { increment: creditAmount } },
      });
      const balTx = await prisma.balanceTransaction.create({
        data: {
          userId: tx.userId,
          amount: creditAmount,
          balanceAfter: money(dbUser.balance),
          type: 'topup',
          status: 'completed',
          reference: request_id,
          description: `Nạp thẻ ${tx.telco} ${real_value.toLocaleString()}đ`,
        },
      });
      await prisma.cardChargeTransaction.update({
        where: { id: tx.id },
        data: { status: 'success', realValue: real_value, creditedAmount: creditAmount, transId: trans_id, balanceTransactionId: balTx.id, callbackData: req.body },
      });
    } else {
      await prisma.cardChargeTransaction.update({
        where: { id: tx.id },
        data: { status: status === 2 ? 'wrong_amount' : 'failed', realValue: real_value || null, transId: trans_id, callbackData: req.body },
      });
    }
    res.json({ status: 1, message: 'ok' });
  } catch (e: any) {
    res.status(500).json({ status: 0, message: e.message });
  }
});

// ── Admin: lịch sử giao dịch toàn hệ thống ─────────────
router.get('/admin/transactions', requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const type = req.query.type as string;
    const where: any = {};
    if (type) where.type = type;
    const [total, txs] = await Promise.all([
      prisma.balanceTransaction.count({ where }),
      prisma.balanceTransaction.findMany({
        where, orderBy: { id: 'desc' }, skip: (page - 1) * limit, take: limit,
        include: { user: { select: { email: true } } },
      }),
    ]);
    res.json({
      total, page,
      items: txs.map((t: any) => ({
        id: t.id,
        user_email: t.user?.email,
        amount: money(t.amount),
        balance_after: money(t.balanceAfter),
        type: t.type,
        status: t.status,
        reference: t.reference,
        description: t.description,
        created_at: t.createdAt?.toISOString(),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: audit tổng quan số dư ───────────────────────
router.get('/admin/audit', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [totalBalance, topup, purchase, refund] = await Promise.all([
      prisma.user.aggregate({ _sum: { balance: true } }),
      prisma.balanceTransaction.aggregate({ where: { type: 'topup' }, _sum: { amount: true } }),
      prisma.balanceTransaction.aggregate({ where: { type: 'purchase' }, _sum: { amount: true } }),
      prisma.balanceTransaction.aggregate({ where: { type: 'refund' }, _sum: { amount: true } }),
    ]);
    res.json({
      total_user_balance: money(totalBalance._sum.balance),
      total_topup: money(topup._sum.amount),
      total_purchase: Math.abs(money(purchase._sum.amount)),
      total_refund: money(refund._sum.amount),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: yêu cầu rút tiền (affiliate withdraw) ───────
// Lưu ý: dùng BalanceTransaction type='affiliate_withdraw', status='pending'
router.get('/admin/withdrawals', requireAdmin, async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || 'pending';
    const txs = await prisma.balanceTransaction.findMany({
      where: { type: 'affiliate_withdraw', status },
      orderBy: { id: 'desc' },
      include: { user: { select: { email: true } } },
    });
    res.json({
      items: txs.map((t: any) => ({
        id: t.id,
        user_email: t.user?.email,
        amount: Math.abs(money(t.amount)),
        status: t.status,
        created_at: t.createdAt?.toISOString(),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/admin/withdrawals/:id/approve', requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.balanceTransaction.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'completed' },
    });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/admin/withdrawals/:id/reject', requireAdmin, async (req: Request, res: Response) => {
  try {
    // Hoàn lại số tiền đã trừ khi từ chối
    const tx = await prisma.balanceTransaction.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!tx) { res.status(404).json({ detail: 'Không tìm thấy' }); return; }
    await prisma.$transaction([
      prisma.balanceTransaction.update({ where: { id: tx.id }, data: { status: 'failed' } }),
      prisma.user.update({ where: { id: tx.userId }, data: { balance: { increment: Math.abs(money(tx.amount)) } } }),
    ]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── User: nạp tiền qua SePay ───────────────────────────
router.post('/topup', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const amount = parseFloat(req.body.amount);
    if (!amount || amount < 10000) { res.status(400).json({ detail: 'Số tiền nạp tối thiểu 10.000đ' }); return; }

    // Tạo "đơn nạp" dưới dạng giao dịch pending — dùng order_code làm nội dung CK
    const code = 'TOPUP' + Date.now().toString(36).toUpperCase();
    const tx = await prisma.balanceTransaction.create({
      data: {
        userId: user.user_id,
        amount,
        balanceAfter: 0, // cập nhật khi webhook xác nhận
        type: 'topup',
        status: 'pending',
        reference: code,
        description: `Nạp tiền ${amount.toLocaleString()}đ`,
      },
    });

    // Trả thông tin để client hiển thị QR (giống checkout SePay)
    const cfgRows = await prisma.siteConfig.findMany({ where: { key: { in: ['sepay_account_number', 'sepay_bank_code'] } } });
    const cfg: Record<string, string> = Object.fromEntries(cfgRows.map((c: any) => [c.key, c.value || '']));
    const content = code;
    const qrUrl = cfg['sepay_account_number'] && cfg['sepay_bank_code']
      ? `https://img.vietqr.io/image/${cfg['sepay_bank_code']}-${cfg['sepay_account_number']}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(content)}`
      : null;

    res.json({
      txn_id: tx.id,
      reference: code,
      amount,
      transfer_content: content,
      account_number: cfg['sepay_account_number'] || '',
      bank_code: cfg['sepay_bank_code'] || '',
      qr_code_url: qrUrl,
      status: 'pending',
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── User: kiểm tra trạng thái nạp ──────────────────────
router.get('/topup/status/:txnId', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tx = await prisma.balanceTransaction.findFirst({
      where: { id: parseInt(req.params.txnId), userId: user.user_id, type: 'topup' },
    });
    if (!tx) { res.status(404).json({ detail: 'Không tìm thấy' }); return; }
    res.json({ txn_id: tx.id, status: tx.status, amount: money(tx.amount) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── User: yêu cầu rút hoa hồng affiliate ───────────────
router.post('/affiliate-withdraw', requireUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const amount = parseFloat(req.body.amount);
    if (!amount || amount <= 0) { res.status(400).json({ detail: 'Số tiền không hợp lệ' }); return; }

    const aff = await prisma.affiliateUser.findUnique({ where: { userId: String(user.user_id) } });
    if (!aff) { res.status(400).json({ detail: 'Bạn chưa đăng ký affiliate' }); return; }
    const available = money(aff.totalEarnings) - money(aff.totalPaid);
    if (amount > available) { res.status(400).json({ detail: `Số dư hoa hồng không đủ (còn ${available.toLocaleString()}đ)` }); return; }

    const dbUser = await prisma.user.findUnique({ where: { id: user.user_id } });
    const newBalance = money(dbUser!.balance);
    const tx = await prisma.balanceTransaction.create({
      data: {
        userId: user.user_id,
        amount: -amount,
        balanceAfter: newBalance,
        type: 'affiliate_withdraw',
        status: 'pending',
        description: `Rút hoa hồng ${amount.toLocaleString()}đ`,
      },
    });
    notifyWithdrawal(user.email, amount).catch(() => {});
    res.json({ txn_id: tx.id, status: 'pending', message: 'Đã gửi yêu cầu rút, chờ admin duyệt' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

export default router;
