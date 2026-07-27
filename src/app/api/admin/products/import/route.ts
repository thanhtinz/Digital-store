import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { audit } from '@/lib/audit';
import { slugify } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Minimal CSV parser handling quotes and escaped quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i += 1; }
      else if (c === '"') inQuotes = false;
      else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

const yes = (v: string) => ['yes', 'true', '1', 'y'].includes(v.trim().toLowerCase());

// POST multipart file — upsert products & packages from the export format.
// Products are matched by product_slug, packages by (product, package_name).
export const POST = handler(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return jsonError(400, 'Upload a CSV file');
  if (file.size > 2 * 1024 * 1024) return jsonError(400, 'CSV must be under 2 MB');

  const rows = parseCsv(await file.text());
  if (rows.length < 2) return jsonError(400, 'The CSV has no data rows');
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  for (const required of ['product_slug', 'product_name', 'package_name', 'price']) {
    if (idx(required) === -1) return jsonError(400, `Missing required column: ${required}`);
  }

  let createdProducts = 0;
  let createdPackages = 0;
  let updatedPackages = 0;
  const errors: string[] = [];

  const dataRows = rows.slice(1);
  for (let n = 0; n < dataRows.length; n += 1) {
    const row = dataRows[n];
    const get = (name: string) => (idx(name) === -1 ? '' : String(row[idx(name)] ?? '').trim());
    try {
      const slug = slugify(get('product_slug') || get('product_name'));
      const productName = get('product_name');
      const packageName = get('package_name');
      const price = Number(get('price'));
      if (!slug || !productName || !packageName || !Number.isFinite(price)) {
        throw new Error('missing slug, names or price');
      }

      let product = await prisma.product.findUnique({ where: { slug } });
      if (!product) {
        const catSlug = get('category_slug');
        const category = catSlug ? await prisma.category.findUnique({ where: { slug: catSlug } }) : null;
        product = await prisma.product.create({
          data: {
            slug,
            name: productName,
            categoryId: category?.id ?? null,
            shortDesc: get('short_desc') || null,
            isFeatured: yes(get('featured')),
            isActive: get('product_active') === '' ? true : yes(get('product_active')),
          },
        });
        createdProducts += 1;
      }

      const pkgData = {
        price,
        comparePrice: get('compare_price') ? Number(get('compare_price')) : null,
        autoDeliver: get('delivery').toLowerCase() === 'auto',
        inStock: get('in_stock') === '' ? true : yes(get('in_stock')),
        isActive: get('package_active') === '' ? true : yes(get('package_active')),
      };
      const existing = await prisma.package.findFirst({ where: { productId: product.id, name: packageName } });
      if (existing) {
        await prisma.package.update({ where: { id: existing.id }, data: pkgData });
        updatedPackages += 1;
      } else {
        await prisma.package.create({ data: { ...pkgData, productId: product.id, name: packageName } });
        createdPackages += 1;
      }
    } catch (e: any) {
      errors.push(`Row ${n + 2}: ${e.message}`);
      if (errors.length >= 20) break;
    }
  }

  audit(admin, 'products.import', `${createdProducts} product(s), ${createdPackages}+${updatedPackages} package(s)`);
  return NextResponse.json({ ok: true, createdProducts, createdPackages, updatedPackages, errors });
});
