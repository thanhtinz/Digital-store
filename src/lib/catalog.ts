import prisma from './db';

// ── Flash-sale aware pricing ───────────────────────────────────────────
// Returns a map packageId → { salePrice, flashSaleId, endsAt } for every
// package currently discounted by a running flash sale.
export async function getActiveFlashPrices(packageIds?: number[]) {
  const now = new Date();
  const items = await prisma.flashSaleItem.findMany({
    where: {
      ...(packageIds ? { packageId: { in: packageIds } } : {}),
      flashSale: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    },
    include: { flashSale: { select: { id: true, endsAt: true, name: true } } },
  });
  const map = new Map<number, { salePrice: number; flashSaleItemId: number; endsAt: Date; soldOut: boolean }>();
  for (const item of items) {
    const soldOut = item.quantityLimit != null && item.soldCount >= item.quantityLimit;
    const existing = map.get(item.packageId);
    if (!existing || Number(item.salePrice) < existing.salePrice) {
      map.set(item.packageId, {
        salePrice: Number(item.salePrice),
        flashSaleItemId: item.id,
        endsAt: item.flashSale.endsAt,
        soldOut,
      });
    }
  }
  return map;
}

// Effective unit price for a package right now (flash sale applied when live
// and not sold out).
export function effectivePrice(
  pkg: { id: number; price: unknown },
  flashPrices: Map<number, { salePrice: number; soldOut: boolean }>
): { price: number; original: number; onSale: boolean } {
  const original = Number(pkg.price);
  const flash = flashPrices.get(pkg.id);
  if (flash && !flash.soldOut && flash.salePrice < original) {
    return { price: flash.salePrice, original, onSale: true };
  }
  return { price: original, original, onSale: false };
}

// Serializable product card used across listing pages.
export type ProductCard = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  shortDesc: string | null;
  categoryName: string | null;
  minPrice: number;
  minOriginal: number;
  onSale: boolean;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
};

export async function toProductCards(products: Array<any>): Promise<ProductCard[]> {
  const allPackageIds = products.flatMap((p) => p.packages.map((k: any) => k.id));
  const flash = await getActiveFlashPrices(allPackageIds);
  return products.map((p) => {
    let minPrice = Infinity;
    let minOriginal = Infinity;
    let onSale = false;
    for (const pkg of p.packages) {
      const eff = effectivePrice(pkg, flash);
      if (eff.price < minPrice) {
        minPrice = eff.price;
        minOriginal = eff.original;
        onSale = eff.onSale;
      }
    }
    if (!Number.isFinite(minPrice)) {
      minPrice = 0;
      minOriginal = 0;
    }
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      image: p.images?.[0]?.url || null,
      shortDesc: p.shortDesc,
      categoryName: p.category?.name || null,
      minPrice,
      minOriginal,
      onSale,
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      soldCount: p.soldCount,
    };
  });
}

export const productCardInclude = {
  category: { select: { name: true } },
  images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
  packages: { where: { isActive: true }, select: { id: true, price: true } },
};
