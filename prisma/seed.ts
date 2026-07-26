/**
 * Seed script — creates the initial admin account and, on an empty database,
 * a small set of demo categories/products/banners/coupons so the storefront
 * is browsable immediately.
 *
 *   npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ── Admin account ────────────────────────────────────────────────
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin12345!';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN' },
    create: {
      email: adminEmail,
      name: 'Store Admin',
      passwordHash: bcrypt.hashSync(adminPassword, 10),
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`✅ Admin ready: ${adminEmail} (change the password after first login)`);

  // ── Demo catalog (only when empty) ───────────────────────────────
  const productCount = await prisma.product.count();
  if (productCount > 0) {
    console.log('ℹ️  Products already exist — skipping demo data.');
    return;
  }

  const streaming = await prisma.category.create({
    data: { name: 'Streaming', slug: 'streaming', sortOrder: 1 },
  });
  const gaming = await prisma.category.create({
    data: { name: 'Gaming', slug: 'gaming', sortOrder: 2 },
  });
  const software = await prisma.category.create({
    data: { name: 'Software', slug: 'software', sortOrder: 3 },
  });

  await prisma.product.create({
    data: {
      categoryId: streaming.id,
      name: 'StreamMax Premium Subscription',
      slug: 'streammax-premium',
      shortDesc: '4K streaming on all your devices. Instant activation after payment.',
      description: '<h2>What you get</h2><ul><li>4K Ultra HD streaming</li><li>Watch on 4 devices at once</li><li>Ad-free experience</li></ul><p>Delivered as an activation voucher within seconds of payment.</p>',
      guide: '<ol><li>Open the StreamMax app or website.</li><li>Go to <b>Redeem voucher</b>.</li><li>Enter the code we delivered to your order page and email.</li></ol>',
      isFeatured: true,
      packages: {
        create: [
          { name: '1 Month', price: 9.99, comparePrice: 12.99, sortOrder: 0, autoDeliver: true },
          { name: '6 Months', price: 49.99, comparePrice: 69.99, sortOrder: 1, autoDeliver: true },
          { name: '12 Months', price: 89.99, comparePrice: 129.99, sortOrder: 2, autoDeliver: true },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      categoryId: gaming.id,
      name: 'Game Credits Top-Up',
      slug: 'game-credits-topup',
      shortDesc: 'Top up your in-game wallet — enter your player ID at checkout.',
      description: '<p>Credits are applied directly to your account. Make sure your player ID is correct — deliveries to the wrong ID cannot be reversed.</p>',
      guide: '<p>After payment we top up your account within 15 minutes. You will see the credits in your in-game wallet.</p>',
      isFeatured: true,
      packages: {
        create: [
          {
            name: '1,000 Credits',
            price: 4.99,
            sortOrder: 0,
            customFields: [
              { key: 'player_id', label: 'Player ID', type: 'text', required: true, placeholder: 'e.g. 5301249', help: 'Find it in Settings → Account inside the game.' },
              { key: 'server', label: 'Server / Region', type: 'text', required: true, placeholder: 'e.g. NA-West' },
            ],
          },
          {
            name: '5,500 Credits (+10% bonus)',
            price: 24.99,
            sortOrder: 1,
            customFields: [
              { key: 'player_id', label: 'Player ID', type: 'text', required: true, placeholder: 'e.g. 5301249' },
              { key: 'server', label: 'Server / Region', type: 'text', required: true, placeholder: 'e.g. NA-West' },
            ],
          },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      categoryId: software.id,
      name: 'SecureVault Password Manager — License Key',
      slug: 'securevault-license',
      shortDesc: 'Lifetime license key, delivered instantly.',
      description: '<p>One-time purchase, lifetime updates. Works on Windows, macOS, Linux, iOS and Android.</p>',
      guide: '<ol><li>Download SecureVault from the official site.</li><li>Open <b>Settings → License</b>.</li><li>Paste the key from your order page.</li></ol>',
      packages: {
        create: [
          { name: 'Personal (1 device)', price: 19.99, sortOrder: 0, autoDeliver: true },
          { name: 'Family (6 devices)', price: 39.99, comparePrice: 59.99, sortOrder: 1, autoDeliver: true },
        ],
      },
    },
  });

  await prisma.coupon.create({
    data: { code: 'WELCOME10', type: 'PERCENT', value: 10, perUserLimit: 1, maxDiscount: 20 },
  });

  console.log('✅ Demo catalog created (3 products, 3 categories, coupon WELCOME10).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
