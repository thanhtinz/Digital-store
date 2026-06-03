/**
 * Stock Routes — quản lý kho hàng (account auto-delivery)
 *  - GET    /stock/package/:pkgId   → danh sách item trong kho của gói
 *  - POST   /stock/bulk             → nhập hàng loạt
 *  - POST   /stock                  → thêm 1 item
 *  - DELETE /stock/:itemId          → xóa item
 *  - GET    /stock/count/:pkgId     → đếm tồn kho (public)
 */

import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAdmin, requireStaffOrAdmin } from '../middleware/auth';
import { notifyBackInStock } from '../services/stockAlert';

const router = Router();

/** Danh sách item trong kho 1 gói */
router.get('/package/:pkgId', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const pkgId = parseInt(req.params.pkgId);
    const items = await prisma.stockItem.findMany({
      where: { packageId: pkgId },
      orderBy: { id: 'desc' },
    });
    const available = items.filter((i: any) => !i.isSold).length;
    res.json({
      total: items.length,
      available,
      sold: items.length - available,
      items: items.map((i: any) => ({
        id: i.id,
        data: i.isSold ? '••• đã bán •••' : i.data,
        is_sold: i.isSold,
        sold_at: i.soldAt?.toISOString(),
        created_at: i.createdAt?.toISOString(),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Đếm tồn kho khả dụng (public — cho trang sản phẩm) */
router.get('/count/:pkgId', async (req: Request, res: Response) => {
  try {
    const available = await prisma.stockItem.count({
      where: { packageId: parseInt(req.params.pkgId), isSold: false },
    });
    res.json({ available });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Nhập hàng loạt (mỗi dòng 1 item) */
router.post('/bulk', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { package_id, data } = req.body;
    if (!package_id || !data) { res.status(422).json({ detail: 'Thiếu package_id hoặc data' }); return; }
    const lines = String(data).split('\n').map((l: string) => l.trim()).filter(Boolean);
    if (!lines.length) { res.status(400).json({ detail: 'Không có dòng dữ liệu hợp lệ' }); return; }

    await prisma.stockItem.createMany({
      data: lines.map((line: string) => ({ packageId: parseInt(package_id), data: line })),
    });

    // Cập nhật stock_quantity của gói
    const available = await prisma.stockItem.count({ where: { packageId: parseInt(package_id), isSold: false } });
    await prisma.productPackage.update({ where: { id: parseInt(package_id) }, data: { stockQuantity: available, isStockManaged: true } });

    // Báo cho khách đã đăng ký "có hàng lại" (không chặn response).
    if (available > 0) notifyBackInStock(parseInt(package_id)).catch(() => {});

    res.json({ added: lines.length, available });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Thêm 1 item */
router.post('/', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { package_id, data } = req.body;
    const item = await prisma.stockItem.create({ data: { packageId: parseInt(package_id), data } });
    notifyBackInStock(parseInt(package_id)).catch(() => {});
    res.status(201).json({ id: item.id });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Xóa item */
router.delete('/:itemId', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.stockItem.delete({ where: { id: parseInt(req.params.itemId) } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

export default router;
