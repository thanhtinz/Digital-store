# Digital Store

A modern, full-featured e-commerce platform for **digital goods** (subscriptions, game top-ups, license keys) built for the US / European market. One codebase, one deployable service.

**Stack:** Next.js 14 (App Router) · TypeScript · Prisma · PostgreSQL · Tailwind CSS

## Features

**Storefront** (fully responsive — mobile, tablet, desktop)
- Hero banner carousel, category browsing, search, sorting, pagination
- Product pages with multi-image gallery, package/tier pricing, rich description & usage guide tabs, verified-purchase reviews with rating breakdown, related products
- Per-package **custom checkout fields** (e.g. player ID, account email) defined by the admin and filled by the buyer
- Cart (server-synced), buy-now, wishlist
- **Flash sales** with live countdown, per-item quantity limits and automatic price override
- **Coupons** (percent/fixed, min order, caps, usage & per-user limits, time windows)

**Payments**
- **Stripe Checkout** — Visa, Mastercard, Amex and more, with signature-verified webhooks
- **PayPal** (Orders v2) — capture on return
- Orders auto-deliver from a stock pool of keys/accounts, or manually from the admin panel; buyers get an email receipt and see delivered items on the order page

**Accounts & security**
- Email + password sign-up with **email verification**
- **Google OAuth** login
- Forgot / reset password, change password
- **Two-factor authentication** (TOTP, QR enrollment)
- **Login history** (IP, device, method, success/failure)

**Admin panel** (`/admin`)
- Dashboard: revenue today/month/total, 14-day chart, recent orders
- Products (packages, pricing, compare-at prices, custom fields builder, image uploads, auto-delivery stock manager)
- Categories, banners, coupons, flash sales, reviews (approve/hide/reply), users (roles, block), orders (manual delivery, mark paid, cancel, refund)
- Settings: site identity, currency, **payment gateways** (Stripe/PayPal with connection tests and webhook URLs), Google OAuth, SMTP

## Quick start (local)

Requirements: Node.js 20+, PostgreSQL 13+.

```bash
npm install
cp .env.example .env        # set DATABASE_URL, AUTH_SECRET
npx prisma db push          # create tables
npm run db:seed             # admin account + demo catalog
npm run dev                 # http://localhost:3000
```

Default admin: `admin@example.com` / `Admin12345!` (override with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`; change it after first login).

## Configuration

Everything can be configured from **Admin → Settings** — no code changes needed:

| Area | What you set |
|------|--------------|
| Site | Name, tagline, logo, currency (USD default), support email, public URL |
| Stripe | Secret/publishable keys, webhook secret. Webhook endpoint: `<APP_URL>/api/webhooks/stripe`, event `checkout.session.completed` |
| PayPal | Client ID/secret, sandbox or live mode |
| Google login | OAuth client ID/secret. Redirect URI: `<APP_URL>/api/auth/google/callback` |
| Email | SMTP host/port/credentials. Empty host = emails logged to console (dev) |

Environment variables with the same meaning (see `.env.example`) always override DB settings — useful for pinning secrets at deploy time.

## Deploy (Docker)

```bash
docker build -t digital-store .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://… \
  -e AUTH_SECRET=$(openssl rand -hex 32) \
  -e APP_URL=https://yourstore.com \
  digital-store
```

The container runs `prisma db push` at boot (schema migrates automatically) and then starts the standalone Next.js server. Works out of the box on Railway, Render, Fly.io or any VPS with Docker.

On first boot with no admin in the database, the app creates one from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. If no password is configured it generates a random one and prints it to the deploy logs once — sign in and change it immediately. Demo catalog data is only created by `npm run db:seed`, so a deployed store starts empty.

## Deploy (Railway)

1. **New Project → Deploy from GitHub repo**, then add a **PostgreSQL** database to the same project.
2. On the app service, set variables:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference the Postgres service) |
   | `AUTH_SECRET` | a long random string — `openssl rand -hex 32` |
   | `APP_URL` | your public URL, e.g. `https://yourstore.up.railway.app` |
   | `SEED_ADMIN_EMAIL` | your admin email (optional) |
   | `SEED_ADMIN_PASSWORD` | your admin password (optional — random if unset) |

3. Deploy. `railway.json` selects the Dockerfile builder and points the health check at `/api/health`; the schema is pushed automatically on boot.
4. Generate a domain under **Settings → Networking**, set `APP_URL` to it, then configure Stripe/PayPal/SMTP in **Admin → Settings**.

Keep the service at **1 replica**: the background scheduler and API rate limiter hold state in memory, so multiple replicas would duplicate scheduled runs. Uploaded images live in Postgres, not on disk, so no volume is needed and redeploys keep every asset.

## Project layout

```
prisma/schema.prisma      # data model (users, catalog, orders, promos…)
prisma/seed.ts            # admin + demo data
src/lib/                  # domain logic: auth, orders, coupons, stripe, paypal, mail…
src/app/                  # storefront + auth + account + orders pages
src/app/admin/            # admin panel (guarded by role)
src/app/api/              # REST API route handlers (auth, cart, checkout, webhooks, admin CRUD)
```
