import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

import prisma from './db';
import { defaultRateLimit } from './middleware/rateLimit';

import authRouter from './routes/auth';
import paymentRouter from './routes/payment';
import ordersRouter from './routes/orders';
import productsRouter from './routes/products';
import balanceRouter from './routes/balance';
import adminRouter from './routes/admin';
import miscRouter from './routes/misc';
import smmRouter from './routes/smm';
import notificationsRouter from './routes/notifications';
import telegramRouter from './routes/telegram';
import oauthRouter from './routes/oauth';
import affiliateRouter from './routes/affiliate';
import integrationsRouter from './routes/integrations';
import cardChargeRouter from './routes/cardCharge';
import stockRouter from './routes/stock';
import mailRouter from './routes/mail';
import userNotificationsRouter from './routes/userNotifications';
import chatRouter from './routes/chat';
import loyaltyRouter from './routes/loyalty';
import { startReportScheduler } from './services/scheduler';
import { featureGate } from './services/features';

// __dirname is natively available in CommonJS

const app = express();
// Trong chế độ gộp 1 container: Next.js chiếm PORT công khai, Express chạy nội bộ
// ở BACKEND_PORT (Next proxy /api, /admin, /static sang đây). Chạy riêng lẻ thì
// BACKEND_PORT không set -> dùng PORT như cũ.
const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || '3000', 10);
const STATIC_DIR = path.join(__dirname, '..', 'static');

// ── Security & Compression ─────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for SPA compatibility
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());

// ── CORS ───────────────────────────────────────────────
const APP_BASE = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
// Cho phép thêm origin frontend qua env: FRONTEND_URL hoặc CORS_ORIGINS (ngăn cách dấu phẩy)
const extraOrigins = (process.env.CORS_ORIGINS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
const corsOrigins = [APP_BASE, ...extraOrigins];
if (process.env.FRONTEND_URL) corsOrigins.push(process.env.FRONTEND_URL.trim());
// Dev: cho phép các cổng local hay dùng (3000 backend, 5173 vite, 3039 Minimal frontend)
if (process.env.NODE_ENV !== 'production') {
  corsOrigins.push('http://localhost:3000', 'http://localhost:5173', 'http://localhost:3039');
}
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

// ── Body parsing ───────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Method override: frontend converts DELETE → POST {path}/delete ──
// (matches apiFetch behavior in core.js). Rewrite back to DELETE so the
// real Express route handlers receive the correct verb.
app.use((req, _res, next) => {
  if (req.method === 'POST' && req.path.endsWith('/delete')) {
    req.url = req.url.replace(/\/delete(\?.*)?$/, '$1');
    (req as any).method = 'DELETE';
  }
  next();
});

// ── Rate limiting ──────────────────────────────────────
app.use('/api', defaultRateLimit);

// ── Static files ───────────────────────────────────────
// index:false để '/' KHÔNG bị phục vụ index.html thô — phải đi qua serveHtml
// (render SEO + gắn nonce CSP). Tránh trang chủ thiếu CSP & meta chưa render.
// Phục vụ asset tại CẢ '/static/*' (HTML tham chiếu /static/...) và root.
app.use('/static', express.static(STATIC_DIR, { maxAge: '1h', etag: true, index: false }));
app.use(express.static(STATIC_DIR, { maxAge: '1h', etag: true, index: false }));

// ── Public settings helper ─────────────────────────────
const SEO_KEYS = [
  'site_name', 'site_logo', 'site_description', 'site_banner', 'currency', 'tax_rate',
  'favicon_url', 'default_image_url', 'theme_color', 'copyright_text',
  'seo_title', 'seo_description', 'seo_keywords', 'seo_author', 'seo_image_url',
  'og_type', 'twitter_card', 'og_image_alt', 'robots',
];

async function loadPublicSettings(): Promise<Record<string, string>> {
  try {
    const configs = await prisma.siteConfig.findMany({ where: { key: { in: SEO_KEYS } } });
    return Object.fromEntries(configs.map((c: { key: string; value: string | null }) => [c.key, c.value || '']));
  } catch {
    return {};
  }
}

// ── File hash for cache busting ────────────────────────
function getFileHash(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
  } catch {
    return '0';
  }
}

// ── API Routes ─────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/products', productsRouter);
app.use('/api/balance', balanceRouter);
app.use('/api', adminRouter);   // categories, banners, settings, admin/*
app.use('/api', miscRouter);    // search, blog, reviews, wishlist, tickets
app.use('/api/smm', smmRouter); // SMM panel: catalog, orders, admin
app.use('/api/admin', notificationsRouter); // email/SMTP config
app.use('/api/telegram', telegramRouter); // telegram admin bot
app.use('/api/admin/oauth', oauthRouter); // oauth provider config
app.use('/api/affiliate', featureGate('affiliate'), affiliateRouter); // affiliate program (gate theo feature)
app.use('/api', integrationsRouter); // api-providers + ai generate
app.use('/api/card-charge', featureGate('balance'), cardChargeRouter); // nạp thẻ (gate theo feature 'balance')
app.use('/api/stock', stockRouter); // quản lý kho
app.use('/api/admin/mail', mailRouter); // mail server config
app.use('/api/notifications', userNotificationsRouter); // chuông thông báo user
app.use('/api/chat', chatRouter); // live chat (user + admin)
app.use('/api/loyalty', loyaltyRouter); // điểm thưởng

// ── Uploaded images ────────────────────────────────────
app.get('/api/images/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) { res.status(404).end(); return; }
    const img = await prisma.uploadedImage.findUnique({ where: { id } });
    if (!img) { res.status(404).end(); return; }
    res.setHeader('Content-Type', img.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end(img.data);
  } catch {
    res.status(500).end();
  }
});

// ── SPA HTML pages (mini Jinja-style template renderer) ─
// index.html/blog.html dùng cú pháp {{ a or b or 'lit' }}, {{ x|tojson }}
// và {% if VAR %}...{% endif %}. Hàm dưới resolve đúng các token đó.
function renderTemplate(html: string, ctx: Record<string, any>): string {
  // {% if VAR %}...{% endif %} (không lồng nhau)
  html = html.replace(/\{%\s*if\s+([a-zA-Z0-9_]+)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g,
    (_m, key, inner) => (ctx[key] ? inner : ''));

  // {{ expr }}
  html = html.replace(/\{\{\s*([\s\S]*?)\s*\}\}/g, (_m, raw) => {
    let expr = String(raw).trim();
    let asJson = false;
    expr = expr.replace(/\|\s*safe\s*$/, '').trim();
    if (/\|\s*tojson\s*$/.test(expr)) { asJson = true; expr = expr.replace(/\|\s*tojson\s*$/, '').trim(); }
    if (expr.startsWith('(') && expr.endsWith(')')) expr = expr.slice(1, -1).trim();
    // Đánh giá "a or b or 'literal'": lấy giá trị truthy đầu tiên
    let val: any = '';
    for (const part of expr.split(/\s+or\s+/)) {
      const t = part.trim();
      if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
        val = t.slice(1, -1);
        if (val) break;
        continue;
      }
      const cv = ctx[t];
      if (cv !== undefined && cv !== null && cv !== '') { val = cv; break; }
    }
    if (asJson) return JSON.stringify(val ?? '');
    return String(val ?? '');
  });
  return html;
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
}

// Xây context SEO cho 1 request (site-level + có thể override per-page)
async function buildContext(req: express.Request, extra: Record<string, any> = {}): Promise<Record<string, any>> {
  const s = await loadPublicSettings();
  const cleanPath = req.originalUrl.split('?')[0];
  const url = `${APP_BASE.replace(/\/$/, '')}${cleanPath}`;
  const siteName = s['site_name'] || 'Sweet Premium Store';
  const ctx: Record<string, any> = {
    site_name: siteName,
    site_description: s['site_description'] || '',
    favicon_url: s['favicon_url'] || '/static/candy-icon.png',
    default_image_url: s['default_image_url'] || s['site_logo'] || '/static/candy-icon.png',
    theme_color: s['theme_color'] || '#00AB55',
    copyright_text: s['copyright_text'] || `© ${new Date().getFullYear()} ${siteName}`,
    seo_title: s['seo_title'] || '',
    seo_description: s['seo_description'] || '',
    seo_keywords: s['seo_keywords'] || '',
    seo_author: s['seo_author'] || '',
    seo_image_url: s['seo_image_url'] || '',
    og_type: s['og_type'] || 'website',
    twitter_card: s['twitter_card'] || 'summary_large_image',
    og_image_alt: s['og_image_alt'] || '',
    robots: s['robots'] || 'index, follow',
    canonical_url: url,
    social_url: url,
    css_hash: getFileHash(path.join(STATIC_DIR, 'styles.css')),
    js_hash: getFileHash(path.join(STATIC_DIR, 'app.js')),
    ...extra,
  };
  return ctx;
}

// ── Content Security Policy ────────────────────────────
// CSP đặt riêng cho trang HTML (nơi có nonce). API không cần.
// - script-src: chặn inline <script> chèn lén + eval; chỉ cho 'self' + nonce + CDN tin cậy
//   (unpkg=neon-auth, jsdelivr=anime/tinymce, cdnjs=dompurify/font-awesome).
// - script-src-attr 'unsafe-inline': giữ các handler onerror= của ảnh fallback (core.js).
// - style-src 'unsafe-inline': SPA gắn style động + style= sẵn trong HTML.
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`,
    "script-src-attr 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
    "connect-src 'self' https: wss:",
    "worker-src 'self'",
    "manifest-src 'self'",
  ].join('; ');
}

// ── HTML route helper ──────────────────────────────────
async function serveHtml(req: express.Request, res: express.Response, template: string, extra: Record<string, any> = {}): Promise<void> {
  try {
    const html = await fs.promises.readFile(path.join(STATIC_DIR, template), 'utf-8');
    const nonce = crypto.randomBytes(16).toString('base64');
    const ctx = await buildContext(req, { ...extra, csp_nonce: nonce });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Security-Policy', buildCsp(nonce));
    res.send(renderTemplate(html, ctx));
  } catch {
    res.status(500).send('Server error');
  }
}

// Admin app riêng (tách hoàn toàn khỏi client SPA) — phục vụ admin.html.
// Mọi /admin/* do admin-app.js tự định tuyến phía client.
app.get('/admin', (req, res) => serveHtml(req, res, 'admin.html', { robots: 'noindex, nofollow' }));
app.get('/admin/*', (req, res) => serveHtml(req, res, 'admin.html', { robots: 'noindex, nofollow' }));

// Frontend khách (trang chủ, sản phẩm, blog, checkout...) do app Next.js Minimal Pro
// đảm nhận. Express chỉ còn: /api, /admin (admin SPA), /static, và SEO/health bên dưới.

// ── SEO: robots.txt + sitemap.xml ──────────────────────
app.get('/robots.txt', (_req, res) => {
  const base = APP_BASE.replace(/\/$/, '');
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n`
  );
});

app.get('/sitemap.xml', async (_req, res) => {
  try {
    const base = APP_BASE.replace(/\/$/, '');
    const [products, posts, categories] = await Promise.all([
      prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true }, take: 2000 }),
      prisma.blogPost.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true }, take: 2000 }),
      prisma.category.findMany({ where: { isActive: true }, select: { slug: true }, take: 500 }),
    ]);
    const urls: string[] = [];
    const add = (loc: string, lastmod?: Date) => urls.push(
      `  <url><loc>${escapeHtml(base + loc)}</loc>${lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`
    );
    ['/', '/products', '/blog'].forEach((p) => add(p));
    categories.forEach((c: any) => c.slug && add(`/category/${c.slug}`));
    products.forEach((p: any) => p.slug && add(`/products/${p.slug}`, p.updatedAt));
    posts.forEach((p: any) => p.slug && add(`/blog/${p.slug}`, p.updatedAt));
    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
    );
  } catch {
    res.status(500).type('text/plain').send('sitemap error');
  }
});

// ── PWA manifest ───────────────────────────────────────
app.get('/manifest.webmanifest', async (_req, res) => {
  const s = await loadPublicSettings();
  const name = s['site_name'] || 'Sweet Premium Store';
  const icon = s['favicon_url'] || '/static/candy-icon.png';
  res.type('application/manifest+json').send(JSON.stringify({
    name, short_name: name.slice(0, 12), start_url: '/', display: 'standalone',
    background_color: '#ffffff', theme_color: s['theme_color'] || '#00AB55',
    icons: [
      { src: icon, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: icon, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  }));
});

// ── Healthcheck (KHÔNG phụ thuộc DB) — cho Railway/Render ──
app.get(['/healthz', '/api/health'], (_req, res) => res.status(200).type('text/plain').send('ok'));

// ── 404 fallback ────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ detail: 'Not Found' });
});

// ── Error handler ──────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ detail: 'Internal server error' });
});

// ── Start server ────────────────────────────────────────
async function main() {
  // Mở cổng NGAY để healthcheck (/healthz) thấy server sống — không phụ thuộc DB sẵn sàng.
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sweet Premium Store running on http://0.0.0.0:${PORT}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   APP_BASE: ${APP_BASE}`);
    startReportScheduler();
  });

  if (!process.env.DATABASE_URL) {
    console.error('⚠️  DATABASE_URL CHƯA được đặt! Thêm PostgreSQL trên Railway và gắn biến DATABASE_URL cho service web (xem RAILWAY.md). App sẽ không truy vấn được DB cho tới khi có biến này.');
  }

  // Kết nối DB có retry; KHÔNG kill tiến trình nếu DB chậm/tạm lỗi (tránh crash-loop -> healthcheck fail).
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      await prisma.$connect();
      console.log('✅ Database connected');
      return;
    } catch (err: any) {
      console.error(`DB connect lần ${attempt}/12 thất bại: ${err.message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.error('❌ Không kết nối được DB sau nhiều lần thử. Server vẫn chạy (healthcheck/log) — kiểm tra DATABASE_URL & dịch vụ Postgres.');
}

main();

export default app;
