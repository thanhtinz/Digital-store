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
import { startReportScheduler } from './services/scheduler';

// __dirname is natively available in CommonJS

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const STATIC_DIR = path.join(__dirname, '..', 'static');

// ── Security & Compression ─────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for SPA compatibility
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());

// ── CORS ───────────────────────────────────────────────
const APP_BASE = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
app.use(cors({
  origin: [APP_BASE, 'http://localhost:3000', 'http://localhost:5173'],
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
app.use(express.static(STATIC_DIR, { maxAge: '1h', etag: true }));

// ── Public settings helper ─────────────────────────────
async function loadPublicSettings(): Promise<Record<string, string>> {
  const publicKeys = ['site_name', 'site_logo', 'site_description', 'site_banner', 'currency', 'tax_rate'];
  try {
    const configs = await prisma.siteConfig.findMany({ where: { key: { in: publicKeys } } });
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
app.use('/api/affiliate', affiliateRouter); // affiliate program
app.use('/api', integrationsRouter); // api-providers + ai generate
app.use('/api/card-charge', cardChargeRouter); // nạp thẻ
app.use('/api/stock', stockRouter); // quản lý kho
app.use('/api/admin/mail', mailRouter); // mail server config

// ── Uploaded images ────────────────────────────────────
app.get('/api/images/:id', async (req, res) => {
  try {
    const img = await prisma.uploadedImage.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!img) { res.status(404).end(); return; }
    res.setHeader('Content-Type', img.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end(img.data);
  } catch {
    res.status(500).end();
  }
});

// ── SPA HTML pages ─────────────────────────────────────
const htmlPages: Record<string, string> = {};

async function renderHtml(template: string): Promise<string> {
  try {
    let html = await fs.promises.readFile(path.join(STATIC_DIR, template), 'utf-8');
    const settings = await loadPublicSettings();
    const siteName = settings['site_name'] || 'Sweet Premium Store';
    const siteLogo = settings['site_logo'] || '/candy-icon.png';

    html = html
      .replace(/{{SITE_NAME}}/g, siteName)
      .replace(/{{SITE_LOGO}}/g, siteLogo)
      .replace(/{{JS_HASH}}/g, getFileHash(path.join(STATIC_DIR, 'app.js')))
      .replace(/{{CSS_HASH}}/g, getFileHash(path.join(STATIC_DIR, 'styles.css')));
    return html;
  } catch {
    return '<!DOCTYPE html><html><body>Loading...</body></html>';
  }
}

// ── HTML route helper ──────────────────────────────────
async function serveHtml(res: express.Response, template: string): Promise<void> {
  try {
    const html = await renderHtml(template);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  } catch {
    res.status(500).send('Server error');
  }
}

// Admin pages
app.get('/admin', (_, res) => serveHtml(res, 'index.html'));
app.get('/admin/*', (_, res) => serveHtml(res, 'index.html'));

// Client pages - serve index.html for SPA routing
app.get([
  '/', '/login', '/register', '/profile', '/orders', '/orders/:code',
  '/products', '/products/:slug', '/category/:slug',
  '/checkout/:code', '/payment/:code',
  '/blog', '/blog/:slug', '/wishlist', '/search',
  '/auth-callback', '/smm', '/smm/history', '/smm/history/:id',
], (_, res) => serveHtml(res, 'index.html'));

// Blog public page
app.get('/blog-public', (_, res) => serveHtml(res, 'blog.html'));

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
  try {
    // Test DB connection
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Sweet Premium Store running on http://0.0.0.0:${PORT}`);
      console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   APP_BASE: ${APP_BASE}`);
      startReportScheduler();
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

main();

export default app;
