/**
 * Seed Script — khởi tạo dữ liệu ban đầu
 * Chạy: npm run db:seed
 *
 * Tạo: site config mặc định, tài khoản admin, danh mục + sản phẩm mẫu,
 * SMM platform mẫu, support pages cơ bản.
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import slugify from 'slugify';
import prisma from '../db';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@sweetstore.vn';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@123456';

// ── Site config mặc định ──────────────────────────────
const DEFAULT_CONFIG: Record<string, string> = {
  site_name: 'Sweet Premium Store',
  site_description: 'Cửa hàng tài khoản & sản phẩm số cao cấp',
  site_logo: '/candy-icon.png',
  site_banner: '',
  currency: 'VND',
  tax_rate: '0',
  home_categories: '[]',
  app_base_url: process.env.APP_BASE_URL || 'http://localhost:3000',
  // SePay (để trống — admin tự điền trong dashboard)
  sepay_api_key: '',
  sepay_account_number: '',
  sepay_bank_code: '',
  sepay_webhook_secret: '',
  // Telegram admin bot (admin tự điền trong dashboard)
  telegram_bot_token: '',
  telegram_admin_chat_id: '',
  telegram_notify_new_order: 'true',
  telegram_notify_new_user: 'true',
  telegram_daily_report: 'false',
  // Mail server (admin tự cấu hình)
  mail_mode: 'relay',
  mail_from_name: 'Sweet Premium Store',
  // Feature flags
  settings_features: JSON.stringify({
    smm: true,
    affiliate: true,
    card_charge: true,
    blog: true,
    reviews: true,
    wishlist: true,
  }),
};

async function seedConfig() {
  console.log('→ Seeding site config...');
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    await prisma.siteConfig.upsert({
      where: { key },
      update: {}, // không ghi đè nếu đã tồn tại
      create: { key, value },
    });
  }
  console.log(`  ✓ ${Object.keys(DEFAULT_CONFIG).length} config keys`);
}

async function seedAdmin() {
  console.log('→ Seeding admin user...');
  let user = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!user) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    user = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash: hash,
        displayName: 'Administrator',
        provider: 'local',
        isActive: true,
        role: 'superadmin',
      },
    });
    console.log(`  ✓ Created user: ${ADMIN_EMAIL}`);
    console.log(`  ✓ Granted superadmin role`);
    console.log(`\n  ⚠️  Mật khẩu admin mặc định: ${ADMIN_PASSWORD}`);
    console.log(`     ĐỔI NGAY sau khi đăng nhập lần đầu!\n`);
  } else {
    if (user.role !== 'superadmin') {
      await prisma.user.update({ where: { id: user.id }, data: { role: 'superadmin' } });
      console.log(`  ✓ Updated role -> superadmin`);
    }
    console.log(`  • User already exists: ${ADMIN_EMAIL}`);
  }
}

async function seedCategories() {
  console.log('→ Seeding sample categories & products...');

  const categoriesData = [
    { name: 'Tài khoản Premium', productType: 'premium', icon: '👑' },
    { name: 'Nạp game', productType: 'game', icon: '🎮' },
    { name: 'Gift Card', productType: 'giftcard', icon: '🎁' },
  ];

  for (const [idx, cat] of categoriesData.entries()) {
    const slug = slugify(cat.name, { lower: true, strict: true });
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) continue;

    const category = await prisma.category.create({
      data: {
        name: cat.name,
        slug,
        iconUrl: cat.icon,
        productType: cat.productType,
        sortOrder: idx,
        isActive: true,
      },
    });

    // Sản phẩm mẫu cho danh mục Premium
    if (cat.productType === 'premium') {
      const productSlug = slugify('Netflix Premium', { lower: true, strict: true });
      const exists = await prisma.product.findUnique({ where: { slug: productSlug } });
      if (!exists) {
        const product = await prisma.product.create({
          data: {
            categoryId: category.id,
            name: 'Netflix Premium',
            slug: productSlug,
            description: 'Tài khoản Netflix Premium 4K Ultra HD',
            isFeatured: true,
            isActive: true,
            sortOrder: 0,
          },
        });
        await prisma.productPackage.createMany({
          data: [
            { productId: product.id, name: '1 Tháng', price: 79000, originalPrice: 120000, deliveryType: 'manual', sortOrder: 0 },
            { productId: product.id, name: '3 Tháng', price: 219000, originalPrice: 360000, deliveryType: 'manual', sortOrder: 1 },
            { productId: product.id, name: '12 Tháng', price: 799000, originalPrice: 1440000, deliveryType: 'manual', sortOrder: 2 },
          ],
        });
      }
    }
  }
  console.log(`  ✓ Categories + sample products`);
}

async function seedSmm() {
  console.log('→ Seeding SMM platforms...');
  const platforms = [
    { name: 'Facebook', icon: '📘' },
    { name: 'Instagram', icon: '📷' },
    { name: 'TikTok', icon: '🎵' },
    { name: 'YouTube', icon: '▶️' },
  ];
  for (const [idx, p] of platforms.entries()) {
    const slug = slugify(p.name, { lower: true, strict: true });
    const existing = await prisma.smmPlatform.findUnique({ where: { slug } });
    if (existing) continue;
    const platform = await prisma.smmPlatform.create({
      data: { name: p.name, slug, iconUrl: p.icon, sortOrder: idx, isActive: true },
    });
    // 1 category + 1 service mẫu
    const catSlug = slugify(`${p.name} Likes`, { lower: true, strict: true });
    const cat = await prisma.smmCategory.create({
      data: { platformId: platform.id, name: `${p.name} Likes`, slug: catSlug, sortOrder: 0, isActive: true },
    });
    await prisma.smmService.create({
      data: {
        categoryId: cat.id,
        name: `${p.name} Likes - Việt Nam`,
        rate: 50000, // 50k / 1000
        minQuantity: 100,
        maxQuantity: 100000,
        deliveryType: 'manual',
        isActive: true,
      },
    });
  }
  console.log(`  ✓ SMM platforms + sample services`);
}

async function seedSupportPages() {
  console.log('→ Seeding support pages...');
  const pages = [
    { slug: 'chinh-sach-bao-hanh', title: 'Chính sách bảo hành', pageType: 'warranty', content: '<p>Nội dung chính sách bảo hành...</p>' },
    { slug: 'huong-dan-mua-hang', title: 'Hướng dẫn mua hàng', pageType: 'purchase_guide', content: '<p>Nội dung hướng dẫn mua hàng...</p>' },
    { slug: 'chinh-sach-bao-mat', title: 'Chính sách bảo mật', pageType: 'privacy', content: '<p>Nội dung chính sách bảo mật...</p>' },
  ];
  for (const [idx, p] of pages.entries()) {
    await prisma.supportPage.upsert({
      where: { slug: p.slug },
      update: {},
      create: { ...p, sortOrder: idx, isPublished: true },
    });
  }
  console.log(`  ✓ Support pages`);
}

async function main() {
  console.log('\n🌱 Seeding database...\n');
  try {
    await seedConfig();
    await seedAdmin();
    await seedCategories();
    await seedSmm();
    await seedSupportPages();
    console.log('\n✅ Seed completed successfully!\n');
  } catch (err) {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
