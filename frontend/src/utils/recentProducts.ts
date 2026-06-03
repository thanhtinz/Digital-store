// Lưu "sản phẩm đã xem gần đây" vào localStorage (tối đa 8, mới nhất lên đầu).

const KEY = 'recently_viewed_products';
const MAX = 8;

// Chỉ giữ các field cần để render ShopProductCard (tránh phình localStorage).
function slim(p: any) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    imageUrl: p.imageUrl,
    rating: p.rating,
    ratingCount: p.ratingCount,
    soldCount: p.soldCount,
    packages: (p.packages || []).map((pk: any) => ({
      price: pk.price,
      originalPrice: pk.originalPrice,
      deliveryType: pk.deliveryType,
      isStockManaged: pk.isStockManaged,
      flashSale: pk.flashSale ? { salePrice: pk.flashSale.salePrice } : null,
    })),
  };
}

export function addRecentProduct(p: any) {
  if (typeof window === 'undefined' || !p?.slug) return;
  try {
    const list = getRecentProducts().filter((x) => x.slug !== p.slug);
    list.unshift(slim(p));
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* ignore quota/parse errors */
  }
}

export function getRecentProducts(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
