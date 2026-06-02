#!/usr/bin/env node
/**
 * db-switch.js — Đổi nhanh database provider trong prisma/schema.prisma
 *
 * Dùng:
 *   npm run db:switch postgresql
 *   npm run db:switch mysql
 *
 * Sau khi đổi, nhớ:
 *   - Cập nhật DATABASE_URL trong .env cho khớp
 *   - Chạy: npx prisma generate && npx prisma db push
 */

const fs = require('fs');
const path = require('path');

const SUPPORTED = ['postgresql', 'mysql'];
const target = process.argv[2];

if (!target || !SUPPORTED.includes(target)) {
  console.error(`❌ Provider không hợp lệ. Dùng: ${SUPPORTED.join(' | ')}`);
  console.error('   Ví dụ: npm run db:switch mysql');
  console.error('   (Supabase / Neon / Railway Postgres → dùng "postgresql")');
  process.exit(1);
}

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const before = schema;
schema = schema.replace(
  /(datasource db \{\s*provider\s*=\s*)"[^"]+"/,
  `$1"${target}"`
);

if (schema === before) {
  console.error('❌ Không tìm thấy dòng provider trong schema.prisma');
  process.exit(1);
}

fs.writeFileSync(schemaPath, schema);
console.log(`✅ Đã đổi provider → "${target}"`);
console.log('');
console.log('Tiếp theo:');
console.log(`  1. Cập nhật DATABASE_URL trong .env (xem mẫu trong .env.example)`);
console.log('  2. npx prisma generate');
console.log('  3. npx prisma db push');
