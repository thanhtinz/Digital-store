import { PrismaClient } from '@prisma/client';

// Tự dựng DATABASE_URL từ biến PG* (Railway/Heroku Postgres cấp) nếu chưa có,
// để tránh lỗi "Environment variable not found: DATABASE_URL" khi quên gắn reference.
if (!process.env.DATABASE_URL && process.env.PGHOST) {
  const u = encodeURIComponent(process.env.PGUSER || 'postgres');
  const p = encodeURIComponent(process.env.PGPASSWORD || '');
  const host = process.env.PGHOST;
  const port = process.env.PGPORT || '5432';
  const db = process.env.PGDATABASE || 'railway';
  process.env.DATABASE_URL = `postgresql://${u}:${p}@${host}:${port}/${db}`;
  console.log('[db] Đã dựng DATABASE_URL từ biến PG* (PGHOST/PGUSER/...).');
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
