import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler } from '@/lib/api';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

function cell(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET — the full catalog as CSV, one row per package. Re-importable.
export const GET = handler(async () => {
  const admin = await requireAdmin();
  const products = await prisma.product.findMany({
    orderBy: { id: 'asc' },
    include: { category: true, packages: { orderBy: { sortOrder: 'asc' } } },
  });

  const header = [
    'product_slug', 'product_name', 'category_slug', 'short_desc', 'featured', 'product_active',
    'package_name', 'price', 'compare_price', 'delivery', 'in_stock', 'package_active',
  ];
  const rows: string[][] = [];
  for (const p of products) {
    for (const k of p.packages) {
      rows.push([
        p.slug, p.name, p.category?.slug || '', p.shortDesc || '', p.isFeatured ? 'yes' : 'no', p.isActive ? 'yes' : 'no',
        k.name, Number(k.price).toFixed(2), k.comparePrice ? Number(k.comparePrice).toFixed(2) : '',
        k.autoDeliver ? 'auto' : 'manual', k.inStock ? 'yes' : 'no', k.isActive ? 'yes' : 'no',
      ]);
    }
  }
  const csv = [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
  audit(admin, 'products.export', `${rows.length} row(s)`);
  return new Response('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="products.csv"',
    },
  });
});
