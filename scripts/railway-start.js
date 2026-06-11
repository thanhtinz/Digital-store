/**
 * Launcher cho Railway / nền tảng PaaS.
 * 1) Nếu thiếu DATABASE_URL nhưng có biến PG* (Railway Postgres) -> tự dựng DATABASE_URL.
 * 2) prisma db push (đồng bộ schema) — KHÔNG chặn server nếu lỗi.
 * 3) require dist/server.js trong CÙNG tiến trình để giữ env vừa set.
 */
const { execSync } = require('child_process');
const path = require('path');

if (!process.env.DATABASE_URL && process.env.PGHOST) {
  const u = encodeURIComponent(process.env.PGUSER || 'postgres');
  const p = encodeURIComponent(process.env.PGPASSWORD || '');
  const port = process.env.PGPORT || '5432';
  const db = process.env.PGDATABASE || 'railway';
  process.env.DATABASE_URL = `postgresql://${u}:${p}@${process.env.PGHOST}:${port}/${db}`;
  console.log('[start] Đã dựng DATABASE_URL từ biến PG* (PGHOST/PGUSER/...).');
}

if (process.env.DATABASE_URL) {
  try {
    execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });
  } catch (e) {
    console.error('[start] prisma db push lỗi (vẫn khởi động server):', e.message);
  }
  // Seed admin + dữ liệu mẫu khi bật biến RUN_SEED (chạy 1 lần rồi nên gỡ biến).
  if (process.env.RUN_SEED === '1' || process.env.RUN_SEED === 'true') {
    try {
      console.log('[start] RUN_SEED=1 -> đang tạo admin + dữ liệu mẫu...');
      execSync('npm run db:seed', { stdio: 'inherit' });
      console.log('[start] ✅ Seed xong. Hãy GỠ biến RUN_SEED rồi redeploy.');
    } catch (e) {
      console.error('[start] seed lỗi:', e.message);
    }
  }
} else {
  console.error('[start] ⚠️ THIẾU DATABASE_URL và không có PG*. Chưa thêm/gắn PostgreSQL trên Railway — xem RAILWAY.md. Server vẫn lên để healthcheck/log.');
}

require(path.join(__dirname, '..', 'dist', 'server.js'));
