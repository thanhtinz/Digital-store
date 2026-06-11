/**
 * Gói combo / Bundle. Mount tại /api.
 *  - GET  /bundles           (công khai) — danh sách combo đang bật
 *  - GET  /bundles/:slug     (công khai) — chi tiết + các gói thành phần
 *  - admin: GET/POST/PATCH/DELETE /admin/bundles
 */
import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAdmin } from '../middleware/auth';
import slugify from 'slugify';

const router = Router();

async function serializeBundle(b: any) {
  const items = (b.items || []).map((it: any) => ({
    id: it.id,
    package_id: it.packageId,
    quantity: it.quantity,
    package_name: it.package?.name,
    product_name: it.package?.product?.name,
    product_slug: it.package?.product?.slug,
    image_url: it.package?.imageUrl || it.package?.product?.imageUrl,
    price: it.package ? Number(it.package.price) : 0,
  }));
  const itemsTotal = items.reduce((s: number, it: any) => s + it.price * it.quantity, 0);
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    description: b.description,
    image_url: b.imageUrl,
    price: Number(b.price),
    original_price: b.originalPrice != null ? Number(b.originalPrice) : itemsTotal,
    items_total: itemsTotal,
    is_active: b.isActive,
    sort_order: b.sortOrder,
    items,
  };
}

router.get('/bundles', async (_req: Request, res: Response) => {
  try {
    const items = await prisma.bundle.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { items: { include: { package: { include: { product: true } } } } },
    });
    res.json({ items: await Promise.all(items.map(serializeBundle)) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.get('/bundles/:slug', async (req: Request, res: Response) => {
  try {
    const b = await prisma.bundle.findUnique({
      where: { slug: req.params.slug },
      include: { items: { include: { package: { include: { product: true } } } } },
    });
    if (!b) { res.status(404).json({ detail: 'Không tìm thấy combo' }); return; }
    res.json(await serializeBundle(b));
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin ──────────────────────────────────────────────
router.get('/admin/bundles', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const items = await prisma.bundle.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { items: { include: { package: { include: { product: true } } } } },
    });
    res.json({ items: await Promise.all(items.map(serializeBundle)) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

async function uniqueSlug(name: string, excludeId?: number): Promise<string> {
  const base = slugify(name, { lower: true, strict: true }) || `combo-${Date.now()}`;
  let slug = base;
  let i = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const found = await prisma.bundle.findUnique({ where: { slug } });
    if (!found || found.id === excludeId) return slug;
    slug = `${base}-${i++}`;
  }
}

router.post('/admin/bundles', requireAdmin, async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    if (!b.name || b.price == null) { res.status(400).json({ detail: 'Thiếu tên/giá' }); return; }
    const slug = await uniqueSlug(b.name);
    const created = await prisma.bundle.create({
      data: {
        name: String(b.name).slice(0, 255),
        slug,
        description: b.description || null,
        imageUrl: b.image_url || null,
        price: Number(b.price),
        originalPrice: b.original_price != null && b.original_price !== '' ? Number(b.original_price) : null,
        isActive: b.is_active !== false,
        sortOrder: Number(b.sort_order) || 0,
        items: {
          create: (Array.isArray(b.items) ? b.items : [])
            .filter((it: any) => it.package_id)
            .map((it: any) => ({ packageId: Number(it.package_id), quantity: Number(it.quantity) || 1 })),
        },
      },
    });
    res.status(201).json({ id: created.id, slug });
  } catch (e: any) {
    res.status(400).json({ detail: e.message });
  }
});

router.patch('/admin/bundles/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const b = req.body || {};
    const data: any = {};
    if (b.name !== undefined) { data.name = b.name; data.slug = await uniqueSlug(b.name, id); }
    if (b.description !== undefined) data.description = b.description;
    if (b.image_url !== undefined) data.imageUrl = b.image_url || null;
    if (b.price !== undefined) data.price = Number(b.price);
    if (b.original_price !== undefined) data.originalPrice = b.original_price !== '' && b.original_price != null ? Number(b.original_price) : null;
    if (b.is_active !== undefined) data.isActive = !!b.is_active;
    if (b.sort_order !== undefined) data.sortOrder = Number(b.sort_order) || 0;
    // Cập nhật items: xoá hết rồi tạo lại nếu gửi mảng items.
    if (Array.isArray(b.items)) {
      await prisma.bundleItem.deleteMany({ where: { bundleId: id } });
      data.items = {
        create: b.items.filter((it: any) => it.package_id)
          .map((it: any) => ({ packageId: Number(it.package_id), quantity: Number(it.quantity) || 1 })),
      };
    }
    await prisma.bundle.update({ where: { id }, data });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ detail: e.message });
  }
});

router.delete('/admin/bundles/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.bundle.delete({ where: { id: parseInt(req.params.id, 10) } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ detail: e.message });
  }
});

export default router;
