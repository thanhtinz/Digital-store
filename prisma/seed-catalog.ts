/**
 * Catalog-only demo seed — fills the storefront with demo catalog data so
 * every homepage section (hero banners, DANH MỤC, voucher strip, Flash Sale,
 * GỢI Ý HÔM NAY) has something real to render.
 *
 *   npm run db:seed-catalog
 *
 * HARD RULES (do not break):
 * - NEVER creates, modifies or deletes users/admins.
 * - NEVER touches site settings.
 * - Idempotent: everything is upserted by its natural key (category/product
 *   slug, coupon code, banner title, flash-sale name + package), so re-running
 *   updates the demo catalog in place without duplicating rows.
 * - Sales counters (product soldCount / ratings, flash-item soldCount) are
 *   only written on CREATE — re-running never clobbers real accumulated sales.
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ── Artwork ──────────────────────────────────────────────────────
// Product/banner art is generated as inline SVG data URIs (gradient + one
// white glyph) so the demo needs no external image hosting.
const GLYPHS: Record<string, string> = {
  play: `<circle cx='200' cy='200' r='76' fill='white' fill-opacity='0.22'/><path d='M182 156 L270 200 L182 244 Z' fill='white'/>`,
  game: `<rect x='102' y='154' width='196' height='98' rx='49' fill='white' fill-opacity='0.22'/><path d='M152 188 v30 M137 203 h30' stroke='white' stroke-width='11' stroke-linecap='round'/><circle cx='248' cy='191' r='8' fill='white'/><circle cx='267' cy='214' r='8' fill='white'/>`,
  key: `<circle cx='166' cy='234' r='54' fill='none' stroke='white' stroke-width='20'/><path d='M206 198 L290 114 M260 144 l32 32 M234 170 l24 24' stroke='white' stroke-width='20' stroke-linecap='round' fill='none'/>`,
  shield: `<path d='M200 94 L294 128 V206 C294 268 255 304 200 320 C145 304 106 268 106 206 V128 Z' fill='white' fill-opacity='0.25'/><path d='M163 207 l27 27 l50 -54' stroke='white' stroke-width='14' fill='none' stroke-linecap='round' stroke-linejoin='round'/>`,
  music: `<path d='M172 258 V136 l104 -22 v122' fill='none' stroke='white' stroke-width='16' stroke-linejoin='round'/><circle cx='142' cy='260' r='31' fill='white'/><circle cx='246' cy='238' r='31' fill='white'/>`,
  book: `<path d='M200 126 C175 106 139 102 110 109 V294 C139 287 175 291 200 310 C225 291 261 287 290 294 V109 C261 102 225 106 200 126 Z' fill='white' fill-opacity='0.25'/><path d='M200 126 V310' stroke='white' stroke-width='10'/>`,
  code: `<path d='M148 146 L94 200 L148 254 M252 146 L306 200 L252 254' stroke='white' stroke-width='16' fill='none' stroke-linecap='round' stroke-linejoin='round'/>`,
  cloud: `<circle cx='166' cy='224' r='47' fill='white'/><circle cx='224' cy='196' r='60' fill='white'/><circle cx='270' cy='230' r='38' fill='white'/><rect x='166' y='224' width='104' height='47' fill='white'/>`,
  camera: `<rect x='102' y='140' width='196' height='142' rx='18' fill='white' fill-opacity='0.25'/><circle cx='200' cy='211' r='35' fill='none' stroke='white' stroke-width='12'/><rect x='162' y='116' width='76' height='26' rx='11' fill='white' fill-opacity='0.6'/>`,
  gift: `<circle cx='166' cy='148' r='21' fill='none' stroke='white' stroke-width='12'/><circle cx='234' cy='148' r='21' fill='none' stroke='white' stroke-width='12'/><rect x='112' y='176' width='176' height='34' rx='8' fill='white'/><rect x='128' y='210' width='144' height='94' rx='10' fill='white' fill-opacity='0.75'/><rect x='188' y='176' width='24' height='128' fill='white' fill-opacity='0.5'/>`,
  globe: `<circle cx='200' cy='200' r='90' fill='none' stroke='white' stroke-width='13'/><path d='M110 200 h180 M200 110 c31 27 31 153 0 180 M200 110 c-31 27 -31 153 0 180' stroke='white' stroke-width='10' fill='none'/>`,
};

function artwork(w: number, h: number, c1: string, c2: string, glyph: string, scale = 1, cxRatio = 0.5): string {
  const cx = Math.round(w * cxRatio);
  const cy = Math.round(h / 2);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' preserveAspectRatio='xMidYMid slice'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs>` +
    `<rect width='${w}' height='${h}' fill='url(#g)'/>` +
    `<circle cx='${w - 30}' cy='-30' r='${Math.round(h * 0.55)}' fill='white' opacity='0.12'/>` +
    `<circle cx='20' cy='${h + 20}' r='${Math.round(h * 0.42)}' fill='white' opacity='0.10'/>` +
    `<g transform='translate(${cx} ${cy}) scale(${scale}) translate(-200 -200)'>${GLYPHS[glyph] || GLYPHS.gift}</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ── Demo data ────────────────────────────────────────────────────
type PkgDef = {
  name: string;
  price: number;
  comparePrice?: number;
  sortOrder: number;
  autoDeliver?: boolean;
  customFields?: Array<Record<string, unknown>>;
};

type ProductDef = {
  slug: string;
  category: string;
  name: string;
  shortDesc: string;
  description: string;
  guide?: string;
  isFeatured?: boolean;
  soldCount: number;
  ratingAvg: number;
  ratingCount: number;
  colors: [string, string];
  glyph: string;
  packages: PkgDef[];
};

const PLAYER_FIELDS: Array<Record<string, unknown>> = [
  { key: 'player_id', label: 'Player ID', type: 'text', required: true, placeholder: 'e.g. 5301249', help: 'Find it in Settings → Account inside the game.' },
  { key: 'server', label: 'Server / Region', type: 'text', required: true, placeholder: 'e.g. NA-West' },
];
const PLAYER_FIELDS_SHORT: Array<Record<string, unknown>> = [
  { key: 'player_id', label: 'Player ID', type: 'text', required: true, placeholder: 'e.g. 5301249' },
  { key: 'server', label: 'Server / Region', type: 'text', required: true, placeholder: 'e.g. NA-West' },
];

const CATEGORIES = [
  { name: 'Streaming', slug: 'streaming', sortOrder: 1 },
  { name: 'Gaming', slug: 'gaming', sortOrder: 2 },
  { name: 'Software', slug: 'software', sortOrder: 3 },
  { name: 'Music', slug: 'music', sortOrder: 4 },
  { name: 'Education', slug: 'education', sortOrder: 5 },
  { name: 'Security & VPN', slug: 'security-vpn', sortOrder: 6 },
];

const PRODUCTS: ProductDef[] = [
  {
    slug: 'streammax-premium',
    category: 'streaming',
    name: 'StreamMax Premium Subscription',
    shortDesc: '4K streaming on all your devices. Instant activation after payment.',
    description: '<h2>What you get</h2><ul><li>4K Ultra HD streaming</li><li>Watch on 4 devices at once</li><li>Ad-free experience</li></ul><p>Delivered as an activation voucher within seconds of payment.</p>',
    guide: '<ol><li>Open the StreamMax app or website.</li><li>Go to <b>Redeem voucher</b>.</li><li>Enter the code we delivered to your order page and email.</li></ol>',
    isFeatured: true,
    soldCount: 2841, ratingAvg: 4.9, ratingCount: 312,
    colors: ['#7c3aed', '#db2777'], glyph: 'play',
    packages: [
      { name: '1 Month', price: 9.99, comparePrice: 12.99, sortOrder: 0, autoDeliver: true },
      { name: '6 Months', price: 49.99, comparePrice: 69.99, sortOrder: 1, autoDeliver: true },
      { name: '12 Months', price: 89.99, comparePrice: 129.99, sortOrder: 2, autoDeliver: true },
    ],
  },
  {
    slug: 'cinehub-4k',
    category: 'streaming',
    name: 'CineHub 4K Subscription',
    shortDesc: 'Movies and series in 4K HDR, two screens included.',
    description: '<p>A full year of CineHub with 4K HDR, offline downloads and two simultaneous screens.</p>',
    guide: '<ol><li>Sign in to CineHub.</li><li>Open <b>Account → Activate</b>.</li><li>Paste the code from your order page.</li></ol>',
    soldCount: 1204, ratingAvg: 4.8, ratingCount: 198,
    colors: ['#0ea5e9', '#6366f1'], glyph: 'play',
    packages: [
      { name: '1 Month', price: 7.99, comparePrice: 9.99, sortOrder: 0, autoDeliver: true },
      { name: '12 Months', price: 69.99, comparePrice: 99.99, sortOrder: 1, autoDeliver: true },
    ],
  },
  {
    slug: 'game-credits-topup',
    category: 'gaming',
    name: 'Game Credits Top-Up',
    shortDesc: 'Top up your in-game wallet — enter your player ID at checkout.',
    description: '<p>Credits are applied directly to your account. Make sure your player ID is correct — deliveries to the wrong ID cannot be reversed.</p>',
    guide: '<p>After payment we top up your account within 15 minutes. You will see the credits in your in-game wallet.</p>',
    isFeatured: true,
    soldCount: 5210, ratingAvg: 4.9, ratingCount: 864,
    colors: ['#f59e0b', '#ef4444'], glyph: 'game',
    packages: [
      { name: '1,000 Credits', price: 4.99, sortOrder: 0, customFields: PLAYER_FIELDS },
      { name: '5,500 Credits (+10% bonus)', price: 24.99, sortOrder: 1, customFields: PLAYER_FIELDS_SHORT },
    ],
  },
  {
    slug: 'battle-arena-season-pass',
    category: 'gaming',
    name: 'Battle Arena — Season Pass',
    shortDesc: 'Full season pass with exclusive skins and the premium reward track.',
    description: '<p>Unlock the premium reward track for the current season: 100 tiers, exclusive skins and bonus credits.</p>',
    guide: '<p>The pass is applied to the player ID you give at checkout, usually within 15 minutes of payment.</p>',
    soldCount: 864, ratingAvg: 4.7, ratingCount: 121,
    colors: ['#06b6d4', '#3b82f6'], glyph: 'game',
    packages: [
      { name: 'Season Pass', price: 19.99, comparePrice: 29.99, sortOrder: 0, customFields: PLAYER_FIELDS_SHORT },
      { name: 'Season Pass + DLC Bundle', price: 34.99, comparePrice: 49.99, sortOrder: 1, customFields: PLAYER_FIELDS_SHORT },
    ],
  },
  {
    slug: 'securevault-license',
    category: 'software',
    name: 'SecureVault Password Manager — License Key',
    shortDesc: 'Lifetime license key, delivered instantly.',
    description: '<p>One-time purchase, lifetime updates. Works on Windows, macOS, Linux, iOS and Android.</p>',
    guide: '<ol><li>Download SecureVault from the official site.</li><li>Open <b>Settings → License</b>.</li><li>Paste the key from your order page.</li></ol>',
    soldCount: 1730, ratingAvg: 4.9, ratingCount: 402,
    colors: ['#0f766e', '#22c55e'], glyph: 'key',
    packages: [
      { name: 'Personal (1 device)', price: 19.99, sortOrder: 0, autoDeliver: true },
      { name: 'Family (6 devices)', price: 39.99, comparePrice: 59.99, sortOrder: 1, autoDeliver: true },
    ],
  },
  {
    slug: 'designpro-suite',
    category: 'software',
    name: 'DesignPro Suite — License',
    shortDesc: 'Vector design, photo editing and prototyping in one suite.',
    description: '<p>The complete DesignPro suite with all pro features, cloud sync and free updates during the license term.</p>',
    guide: '<ol><li>Install DesignPro.</li><li>Open <b>Help → Activate license</b>.</li><li>Enter the key from your order page.</li></ol>',
    isFeatured: true,
    soldCount: 642, ratingAvg: 4.8, ratingCount: 97,
    colors: ['#db2777', '#f97316'], glyph: 'camera',
    packages: [
      { name: '1 Year', price: 59.99, comparePrice: 89.99, sortOrder: 0, autoDeliver: true },
      { name: 'Lifetime', price: 149.99, comparePrice: 249.99, sortOrder: 1, autoDeliver: true },
    ],
  },
  {
    slug: 'clouddrive-2tb',
    category: 'software',
    name: 'CloudDrive 2TB — 1 Year',
    shortDesc: '2TB encrypted cloud storage with instant activation.',
    description: '<p>2 terabytes of end-to-end encrypted storage, apps for every platform and unlimited file sharing links.</p>',
    guide: '<p>Your plan is upgraded automatically once the code is redeemed in CloudDrive → Settings → Plan.</p>',
    soldCount: 958, ratingAvg: 4.6, ratingCount: 143,
    colors: ['#2563eb', '#06b6d4'], glyph: 'cloud',
    packages: [
      { name: '2TB — 1 Year', price: 49.99, comparePrice: 71.88, sortOrder: 0, autoDeliver: true },
    ],
  },
  {
    slug: 'musicwave-premium',
    category: 'music',
    name: 'MusicWave Premium',
    shortDesc: 'Lossless music streaming, offline mode, zero ads.',
    description: '<p>Stream in lossless quality, download for offline listening and skip the ads forever.</p>',
    guide: '<ol><li>Open MusicWave.</li><li>Go to <b>Premium → Redeem</b>.</li><li>Enter the code from your order page.</li></ol>',
    isFeatured: true,
    soldCount: 3312, ratingAvg: 4.8, ratingCount: 517,
    colors: ['#9333ea', '#f43f5e'], glyph: 'music',
    packages: [
      { name: '1 Month', price: 5.99, comparePrice: 7.99, sortOrder: 0, autoDeliver: true },
      { name: '12 Months', price: 54.99, comparePrice: 84.99, sortOrder: 1, autoDeliver: true },
    ],
  },
  {
    slug: 'audiobooks-plus',
    category: 'music',
    name: 'AudioBooks Plus — 6 Months',
    shortDesc: 'Unlimited audiobooks for six months, new titles weekly.',
    description: '<p>Six months of unlimited listening across the full AudioBooks Plus catalogue.</p>',
    soldCount: 733, ratingAvg: 4.7, ratingCount: 88,
    colors: ['#b45309', '#f59e0b'], glyph: 'book',
    packages: [
      { name: '6 Months', price: 29.99, comparePrice: 44.99, sortOrder: 0, autoDeliver: true },
    ],
  },
  {
    slug: 'learnlang-pro',
    category: 'education',
    name: 'LearnLang Pro — Lifetime',
    shortDesc: 'Lifetime access to 40+ language courses with speech AI.',
    description: '<p>Every current and future language course, AI conversation practice and offline lessons — one payment, forever.</p>',
    guide: '<p>Create a free LearnLang account, then redeem the code under <b>Settings → Subscription</b>.</p>',
    soldCount: 1490, ratingAvg: 4.9, ratingCount: 264,
    colors: ['#059669', '#84cc16'], glyph: 'globe',
    packages: [
      { name: 'Lifetime', price: 79.99, comparePrice: 129.99, sortOrder: 0, autoDeliver: true },
    ],
  },
  {
    slug: 'codecamp-pro',
    category: 'education',
    name: 'CodeCamp Pro — Membership',
    shortDesc: 'All coding courses, projects and certificates included.',
    description: '<p>Full access to every CodeCamp course, hands-on projects and verified certificates.</p>',
    guide: '<p>We email an activation link after payment — your membership starts the moment you click it.</p>',
    soldCount: 1105, ratingAvg: 4.8, ratingCount: 176,
    colors: ['#1e293b', '#475569'], glyph: 'code',
    packages: [
      { name: 'Monthly', price: 12.99, sortOrder: 0, autoDeliver: true },
      { name: 'Annual', price: 99.99, comparePrice: 149.99, sortOrder: 1, autoDeliver: true },
    ],
  },
  {
    slug: 'safenet-vpn',
    category: 'security-vpn',
    name: 'SafeNet VPN — Premium',
    shortDesc: 'Premium VPN for 10 devices, servers in 90+ countries.',
    description: '<p>No-logs premium VPN with WireGuard speeds, 10 simultaneous devices and servers in more than 90 countries.</p>',
    guide: '<ol><li>Install SafeNet VPN.</li><li>Sign in and open <b>Activate premium</b>.</li><li>Paste the key from your order page.</li></ol>',
    soldCount: 2267, ratingAvg: 4.7, ratingCount: 329,
    colors: ['#0e7490', '#0ea5e9'], glyph: 'shield',
    packages: [
      { name: '1 Year (10 devices)', price: 39.99, comparePrice: 83.88, sortOrder: 0, autoDeliver: true },
      { name: '2 Years (10 devices)', price: 59.99, comparePrice: 167.76, sortOrder: 1, autoDeliver: true },
    ],
  },
];

const COUPONS = [
  { code: 'WELCOME10', type: 'PERCENT' as const, value: 10, maxDiscount: 20, perUserLimit: 1, minOrder: null as number | null, endsInDays: null as number | null },
  { code: 'FLASH20', type: 'PERCENT' as const, value: 20, maxDiscount: 25, perUserLimit: null, minOrder: null, endsInDays: 7 },
  { code: 'SAVE5', type: 'FIXED' as const, value: 5, maxDiscount: null, perUserLimit: null, minOrder: 30, endsInDays: null },
];

const BANNERS = [
  {
    title: 'Flash Sale — giảm tới 40%',
    subtitle: 'Key & tài khoản giao tự động qua email trong vài giây',
    linkUrl: '/flash-sale',
    sortOrder: 1,
    colors: ['#ee4d2d', '#ff7337'] as [string, string],
    glyph: 'gift',
  },
  {
    title: 'StreamMax Premium 4K',
    subtitle: 'Xem trên 4 thiết bị cùng lúc, không quảng cáo',
    linkUrl: '/product/streammax-premium',
    sortOrder: 2,
    colors: ['#7c3aed', '#db2777'] as [string, string],
    glyph: 'play',
  },
  {
    title: 'Nhập mã WELCOME10',
    subtitle: 'Giảm thêm 10% cho đơn hàng đầu tiên của bạn',
    linkUrl: '/products',
    sortOrder: 3,
    colors: ['#0e7490', '#0ea5e9'] as [string, string],
    glyph: 'key',
  },
];

const FLASH_SALE_NAME = 'Flash Sale';
const FLASH_ITEMS: Array<{ product: string; pkg: string; salePrice: number; quantityLimit: number; soldCount: number }> = [
  { product: 'streammax-premium', pkg: '12 Months', salePrice: 53.99, quantityLimit: 100, soldCount: 87 },
  { product: 'game-credits-topup', pkg: '5,500 Credits (+10% bonus)', salePrice: 17.49, quantityLimit: 200, soldCount: 154 },
  { product: 'securevault-license', pkg: 'Family (6 devices)', salePrice: 23.99, quantityLimit: 80, soldCount: 41 },
  { product: 'musicwave-premium', pkg: '12 Months', salePrice: 32.99, quantityLimit: 120, soldCount: 96 },
  { product: 'safenet-vpn', pkg: '2 Years (10 devices)', salePrice: 35.99, quantityLimit: 60, soldCount: 58 },
  { product: 'learnlang-pro', pkg: 'Lifetime', salePrice: 47.99, quantityLimit: 50, soldCount: 19 },
];

async function main() {
  // ── Categories (upsert by slug) ────────────────────────────────
  const categoryIds = new Map<string, number>();
  for (const c of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: c.sortOrder, isActive: true },
      create: { name: c.name, slug: c.slug, sortOrder: c.sortOrder },
    });
    categoryIds.set(c.slug, row.id);
  }

  // ── Products + packages + one artwork image (upsert by slug) ──
  const packageIds = new Map<string, number>();
  for (const p of PRODUCTS) {
    const scalars = {
      categoryId: categoryIds.get(p.category) ?? null,
      name: p.name,
      shortDesc: p.shortDesc,
      description: p.description,
      guide: p.guide ?? null,
      isFeatured: !!p.isFeatured,
      isActive: true,
    };
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      // Sales counters intentionally NOT updated on re-runs.
      update: scalars,
      create: { slug: p.slug, ...scalars, soldCount: p.soldCount, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount },
    });

    const imageCount = await prisma.productImage.count({ where: { productId: product.id } });
    if (imageCount === 0) {
      await prisma.productImage.create({
        data: { productId: product.id, url: artwork(400, 400, p.colors[0], p.colors[1], p.glyph), sortOrder: 0 },
      });
    }

    for (const k of p.packages) {
      const data = {
        price: k.price,
        comparePrice: k.comparePrice ?? null,
        sortOrder: k.sortOrder,
        autoDeliver: !!k.autoDeliver,
        isActive: true,
        ...(k.customFields ? { customFields: k.customFields as Prisma.InputJsonValue } : {}),
      };
      const existing = await prisma.package.findFirst({ where: { productId: product.id, name: k.name } });
      const pkg = existing
        ? await prisma.package.update({ where: { id: existing.id }, data })
        : await prisma.package.create({ data: { productId: product.id, name: k.name, ...data } });
      packageIds.set(`${p.slug}::${k.name}`, pkg.id);
    }
  }

  // ── Coupons (upsert by code) ───────────────────────────────────
  for (const c of COUPONS) {
    const endsAt = c.endsInDays != null ? new Date(Date.now() + c.endsInDays * 86_400_000) : null;
    const data = {
      type: c.type,
      value: c.value,
      minOrder: c.minOrder,
      maxDiscount: c.maxDiscount,
      perUserLimit: c.perUserLimit,
      isActive: true,
      ...(endsAt ? { endsAt } : {}),
    };
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: data,
      create: { code: c.code, ...data, endsAt },
    });
  }

  // ── Homepage banners (matched by title — no unique key exists) ─
  for (const b of BANNERS) {
    const data = {
      title: b.title,
      subtitle: b.subtitle,
      imageUrl: artwork(800, 300, b.colors[0], b.colors[1], b.glyph, 0.62, 0.76),
      linkUrl: b.linkUrl,
      sortOrder: b.sortOrder,
      isActive: true,
    };
    const existing = await prisma.banner.findFirst({ where: { title: b.title } });
    if (existing) {
      await prisma.banner.update({ where: { id: existing.id }, data });
    } else {
      await prisma.banner.create({ data });
    }
  }

  // ── Flash sale (matched by name; window refreshed every run) ───
  const now = new Date();
  const window = {
    startsAt: new Date(now.getTime() - 3_600_000),
    endsAt: new Date(now.getTime() + 26 * 3_600_000),
    isActive: true,
  };
  const existingSale = await prisma.flashSale.findFirst({ where: { name: FLASH_SALE_NAME }, orderBy: { id: 'asc' } });
  const sale = existingSale
    ? await prisma.flashSale.update({ where: { id: existingSale.id }, data: window })
    : await prisma.flashSale.create({ data: { name: FLASH_SALE_NAME, ...window } });

  for (const item of FLASH_ITEMS) {
    const packageId = packageIds.get(`${item.product}::${item.pkg}`);
    if (!packageId) throw new Error(`Flash sale references unknown package ${item.product} :: ${item.pkg}`);
    await prisma.flashSaleItem.upsert({
      where: { flashSaleId_packageId: { flashSaleId: sale.id, packageId } },
      // soldCount intentionally NOT updated on re-runs.
      update: { salePrice: item.salePrice, quantityLimit: item.quantityLimit },
      create: { flashSaleId: sale.id, packageId, salePrice: item.salePrice, quantityLimit: item.quantityLimit, soldCount: item.soldCount },
    });
  }

  const [categories, products, packages, coupons, banners, flashSales, flashItems] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
    prisma.package.count(),
    prisma.coupon.count(),
    prisma.banner.count(),
    prisma.flashSale.count(),
    prisma.flashSaleItem.count(),
  ]);
  console.log(
    `✅ Catalog seed done — categories: ${categories}, products: ${products}, packages: ${packages}, ` +
    `coupons: ${coupons}, banners: ${banners}, flash sales: ${flashSales} (${flashItems} items).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
