import axios from 'axios';
// config
import { HOST_API_KEY } from '../config-global';

// ----------------------------------------------------------------------
// Axios kết nối backend Digital Store (Express API).
// Có:
//  1) Tự gắn JWT token (lưu ở localStorage 'accessToken').
//  2) Lớp adapter: chuyển đổi dữ liệu Digital Store -> format Minimal cần
//     (field khác tên: image_url->cover, price_from->price, ...).
// ----------------------------------------------------------------------

const axiosInstance = axios.create({ baseURL: HOST_API_KEY });

// ── Request: gắn token ─────────────────────────────────
axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Adapter: Digital Store product -> Minimal IProduct ──
function adaptProduct(p: any): any {
  if (!p || typeof p !== 'object') return p;
  // Đã đúng format Minimal thì bỏ qua
  if (p.cover !== undefined && p.priceSale !== undefined) return p;

  const image = p.image_url || p.imageUrl || p.cover || '';
  const images: string[] = p.images?.length
    ? p.images
    : [image, image, image].filter(Boolean);

  return {
    id: String(p.id ?? p.slug ?? ''),
    cover: image,
    images,
    name: p.name ?? '',
    price: p.price_from ?? p.price ?? 0,
    priceSale: p.original_price ?? p.priceSale ?? null,
    code: p.slug ?? p.code ?? String(p.id ?? ''),
    sku: p.sku ?? p.slug ?? '',
    tags: p.tags ?? [],
    totalRating: p.rating ?? p.totalRating ?? 0,
    totalReview: p.review_count ?? p.totalReview ?? 0,
    ratings: p.ratings ?? [],
    reviews: p.reviews ?? [],
    colors: p.colors ?? [],
    status: p.is_active === false ? 'inactive' : (p.status ?? ''),
    inventoryType: (p.stock ?? p.available ?? 1) > 0 ? 'in_stock' : 'out_of_stock',
    sizes: p.sizes ?? p.packages?.map((x: any) => x.name) ?? [],
    available: p.stock ?? p.available ?? 99,
    description: p.description ?? p.shortDescription ?? '',
    sold: p.sold ?? 0,
    createdAt: p.created_at ?? p.createdAt ?? new Date().toISOString(),
    category: p.category?.name ?? p.category ?? '',
    gender: p.gender ?? '',
    // giữ nguyên packages gốc để trang chi tiết tự render gói
    packages: p.packages ?? [],
  };
}


// ── Adapter: Digital Store blog post -> Minimal IBlogPost ──
function adaptPost(p: any): any {
  if (!p || typeof p !== 'object') return p;
  if (p.cover !== undefined && p.author !== undefined && typeof p.author === 'object') return p;
  return {
    id: String(p.id ?? p.slug ?? ''),
    cover: p.cover_url || p.image_url || p.cover || '',
    title: p.title ?? '',
    description: p.excerpt ?? p.description ?? '',
    content: p.content ?? '',
    createdAt: p.created_at ?? p.createdAt ?? new Date().toISOString(),
    view: p.views ?? p.view ?? 0,
    comment: p.comment_count ?? p.comment ?? 0,
    share: p.share ?? 0,
    favorite: p.favorite ?? 0,
    tags: p.tags ?? (p.category ? [p.category] : []),
    metaTitle: p.meta_title ?? p.title ?? '',
    metaDescription: p.meta_description ?? p.excerpt ?? '',
    metaKeywords: p.meta_keywords ?? [],
    author: typeof p.author === 'object' ? p.author : {
      name: p.author ?? 'Admin',
      avatarUrl: p.author_avatar ?? '/assets/images/avatars/avatar_default.jpg',
    },
    favoritePerson: p.favoritePerson ?? [],
  };
}

// ── Response: tự adapt theo endpoint ───────────────────
axiosInstance.interceptors.response.use(
  (response) => {
    const url = response.config.url || '';
    const d = response.data;

    // /api/products  -> chuẩn hoá về { products: [...] } (backend trả items HOẶC products)
    if (/\/products(\?|$)/.test(url)) {
      const list = d?.products || d?.items;
      if (Array.isArray(list)) d.products = list.map(adaptProduct);
    }
    // /api/products/product?name=  -> { product: {...} }
    if (/\/products\/product/.test(url) && d?.product) {
      d.product = adaptProduct(d.product);
    }
    // /api/products/:slug -> { ...product } hoặc { product }
    else if (/\/products\//.test(url)) {
      if (d?.product) d.product = adaptProduct(d.product);
      else if (d?.id || d?.name) response.data = { product: adaptProduct(d) };
    }
    // /api/products/items -> { items: [...] }
    if (d?.items && Array.isArray(d.items)) {
      d.items = d.items.map((it: any) => (it?.name || it?.image_url ? adaptProduct(it) : it));
    }


    // /api/blog/posts -> { total, posts: [...] } hoặc { items }
    if (/\/blog\/posts(\?|$)/.test(url)) {
      if (d?.posts) d.posts = d.posts.map(adaptPost);
      if (d?.items) d.results = d.items.map(adaptPost);
      if (Array.isArray(d)) response.data = { posts: d.map(adaptPost) };
    }
    // /api/blog/posts/:slug -> { post } hoặc {...}
    else if (/\/blog\/posts\//.test(url)) {
      if (d?.post) d.post = adaptPost(d.post);
      else if (d?.id || d?.title) response.data = { post: adaptPost(d) };
    }

    return response;
  },
  (error) => Promise.reject((error.response && error.response.data) || 'Something went wrong')
);

export default axiosInstance;
