import { Router, Request, Response } from 'express';
import slugify from 'slugify';
import prisma from '../db';
import { requireAdmin, requireStaffOrAdmin, optionalUser } from '../middleware/auth';
import { money } from '../services/orders';

const router = Router();

// ── Public: danh sách sản phẩm ────────────────────────
router.get('/', optionalUser, async (req: Request, res: Response) => {
  try {
    const { category, featured, active = 'true', page = '1', limit = '20', search } = req.query;
    const where: any = {};
    if (active !== 'all') where.isActive = active !== 'false';
    if (category) where.category = { slug: category };
    if (featured === 'true') where.isFeatured = true;
    if (search) where.name = { contains: search as string, mode: 'insensitive' };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        include: {
          category: true,
          packages: {
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
            include: {
              flashSales: {
                where: { isActive: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
              },
            },
          },
        },
      }),
    ]);

    res.json({ total, page: parseInt(page as string), items: products.map(serializeProduct) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Public: chi tiết sản phẩm ─────────────────────────
router.get('/:slug', optionalUser, async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findFirst({
      where: { slug: req.params.slug, isActive: true },
      include: {
        category: true,
        packages: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
          include: {
            fields: { orderBy: { sortOrder: 'asc' } },
            flashSales: {
              where: { isActive: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
            },
          },
        },
        reviews: {
          where: { isVisible: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!product) { res.status(404).json({ detail: 'Không tìm thấy sản phẩm' }); return; }
    res.json(serializeProduct(product, true));
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: tạo sản phẩm ───────────────────────────────
router.post(['/admin', '/'], requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { name, category_id, description, notes, image_url, is_featured, is_active, sort_order } = req.body;
    if (!name) { res.status(422).json({ detail: 'Tên sản phẩm không được để trống' }); return; }
    const slug = slugify(name, { lower: true, strict: true });
    const product = await prisma.product.create({
      data: {
        name, slug, categoryId: category_id || null,
        description: description || null,
        notes: notes || null,
        imageUrl: image_url || null,
        isFeatured: is_featured || false,
        isActive: is_active !== false,
        sortOrder: sort_order || 0,
      },
    });
    res.status(201).json(serializeProduct(product));
  } catch (e: any) {
    if (e.code === 'P2002') {
      res.status(400).json({ detail: 'Slug đã tồn tại' });
    } else {
      res.status(500).json({ detail: e.message });
    }
  }
});

// ── Admin: cập nhật sản phẩm ──────────────────────────
router.patch(['/admin/:id', '/:id'], requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data: any = {};
    const fields = ['name', 'description', 'notes', 'image_url', 'is_featured', 'is_active', 'sort_order', 'category_id'];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        const key = f.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
        data[key] = req.body[f];
      }
    }
    const product = await prisma.product.update({ where: { id }, data });
    res.json(serializeProduct(product));
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: xóa sản phẩm ──────────────────────────────
router.delete(['/admin/:id', '/:id'], requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Đã xóa sản phẩm' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin: gói sản phẩm ───────────────────────────────
router.post('/admin/:productId/packages', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.productId);
    const { name, price, original_price, description, notes, image_url, delivery_type, sort_order, is_active } = req.body;
    const pkg = await prisma.productPackage.create({
      data: {
        productId, name,
        price: price || 0,
        originalPrice: original_price || null,
        description: description || null,
        notes: notes || null,
        imageUrl: image_url || null,
        deliveryType: delivery_type || 'manual',
        sortOrder: sort_order || 0,
        isActive: is_active !== false,
      },
    });
    res.status(201).json(pkg);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.patch('/admin/packages/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const pkg = await prisma.productPackage.update({
      where: { id },
      data: {
        name: req.body.name,
        price: req.body.price,
        originalPrice: req.body.original_price,
        description: req.body.description,
        deliveryType: req.body.delivery_type,
        isActive: req.body.is_active,
        sortOrder: req.body.sort_order,
      },
    });
    res.json(pkg);
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.delete('/admin/packages/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.productPackage.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Đã xóa gói' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Helper ─────────────────────────────────────────────
function serializeProduct(p: any, detailed = false): Record<string, any> {
  const packages = (p.packages || []).map((pkg: any) => {
    const flashSale = pkg.flashSales?.[0];
    return {
      id: pkg.id,
      name: pkg.name,
      price: money(pkg.price),
      originalPrice: pkg.originalPrice ? money(pkg.originalPrice) : null,
      description: pkg.description,
      notes: pkg.notes,
      imageUrl: pkg.imageUrl,
      deliveryType: pkg.deliveryType,
      isStockManaged: pkg.isStockManaged,
      stockQuantity: pkg.stockQuantity,
      sortOrder: pkg.sortOrder,
      isActive: pkg.isActive,
      flashSale: flashSale ? {
        salePrice: money(flashSale.salePrice),
        endsAt: flashSale.endsAt?.toISOString(),
        quantityLimit: flashSale.quantityLimit,
        quantitySold: flashSale.quantitySold,
      } : null,
      fields: detailed ? pkg.fields : undefined,
    };
  });

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    notes: p.notes,
    imageUrl: p.imageUrl,
    isFeatured: p.isFeatured,
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    categoryId: p.categoryId,
    category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
    packages,
    reviews: detailed ? (p.reviews || []) : undefined,
    createdAt: p.createdAt?.toISOString(),
  };
}

export default router;
