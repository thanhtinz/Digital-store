import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { requireUser } from '../middleware/auth';

const router = Router();

// Giá tiền số học an toàn
function money(v: any): number {
  return Math.round(Number(v || 0) * 100) / 100;
}

// Lấy giỏ hàng kèm thông tin gói/sản phẩm để hiển thị.
router.get('/', requireUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.user_id.toString();
    const rows = await prisma.cartItem.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
    });
    const pkgIds = rows.map((r) => r.packageId);
    const packages = pkgIds.length
      ? await prisma.productPackage.findMany({
          where: { id: { in: pkgIds } },
          include: { product: true },
        })
      : [];
    const pkgMap = new Map(packages.map((p: any) => [p.id, p]));

    const items = rows
      .map((r) => {
        const pkg: any = pkgMap.get(r.packageId);
        if (!pkg) return null;
        const price = money(pkg.price);
        return {
          id: pkg.product?.slug || String(pkg.productId), // id sản phẩm (cho redux)
          productId: pkg.productId,
          packageId: pkg.id,
          packageName: pkg.name,
          name: pkg.product?.name || pkg.name,
          cover: pkg.product?.imageUrl || '',
          price,
          available: pkg.isStockManaged ? pkg.stockQuantity ?? 99 : 99,
          quantity: r.quantity,
          customFields: r.customFields || undefined,
          subtotal: price * r.quantity,
        };
      })
      .filter(Boolean);

    res.json({ items });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Đồng bộ toàn bộ giỏ (thay thế): { items: [{ package_id, quantity, custom_fields }] }
router.post('/sync', requireUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.user_id.toString();
    const items: any[] = Array.isArray(req.body?.items) ? req.body.items : [];

    // Gộp trùng package_id, validate gói tồn tại.
    const merged = new Map<number, { quantity: number; custom: any }>();
    for (const it of items) {
      const pid = parseInt(it.package_id);
      if (!pid) continue;
      const qty = Math.max(1, parseInt(it.quantity) || 1);
      const prev = merged.get(pid);
      merged.set(pid, { quantity: (prev?.quantity || 0) + qty, custom: it.custom_fields ?? prev?.custom ?? null });
    }
    const pids = [...merged.keys()];
    const valid = pids.length
      ? await prisma.productPackage.findMany({ where: { id: { in: pids }, isActive: true }, select: { id: true } })
      : [];
    const validIds = new Set(valid.map((p) => p.id));

    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { userId } }),
      ...[...merged.entries()]
        .filter(([pid]) => validIds.has(pid))
        .map(([pid, v]) =>
          prisma.cartItem.create({
            data: { userId, packageId: pid, quantity: v.quantity, customFields: v.custom ?? undefined },
          })
        ),
    ]);

    res.json({ ok: true, count: [...merged.keys()].filter((p) => validIds.has(p)).length });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Xoá sạch giỏ
router.delete('/', requireUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.user_id.toString();
    await prisma.cartItem.deleteMany({ where: { userId } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

export default router;
