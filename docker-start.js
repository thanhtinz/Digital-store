/* eslint-disable @typescript-eslint/no-var-requires */
// ============================================================
// Launcher gộp 1 container: chạy ĐỒNG THỜI
//   - Backend Express  (nội bộ, BACKEND_PORT=4000)
//   - Frontend Next.js (công khai, PORT do Railway/VPS cấp)
// Next.js proxy /api, /admin, /static sang Express -> same-origin, không CORS.
// Nếu một tiến trình chết -> kill cái còn lại và thoát (để Railway tự restart).
// ============================================================
const { spawn, execSync } = require('child_process');
const path = require('path');

const BACKEND_PORT = process.env.BACKEND_PORT || '4000';
const PUBLIC_PORT = process.env.PORT || '3000';

// 1) Đồng bộ schema DB (không chặn nếu lỗi — tránh crash-loop khi DB chưa sẵn sàng).
try {
  console.log('[launcher] prisma db push...');
  execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });
} catch (e) {
  console.error('[launcher] prisma db push lỗi (vẫn khởi động):', e.message);
}

const children = [];
let shuttingDown = false;

function start(name, command, args, opts) {
  const child = spawn(command, args, { stdio: 'inherit', ...opts });
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.error(`[launcher] ${name} thoát (code=${code} signal=${signal}). Dừng container.`);
    children.forEach((c) => c !== child && !c.killed && c.kill('SIGTERM'));
    process.exit(code == null ? 1 : code);
  });
  children.push(child);
  return child;
}

// 2) Backend Express (nội bộ).
start('backend', 'node', ['dist/server.js'], {
  env: { ...process.env, BACKEND_PORT, NODE_ENV: 'production' },
});

// 3) Frontend Next.js standalone (công khai).
start('frontend', 'node', ['server.js'], {
  cwd: path.join(__dirname, 'frontend'),
  env: { ...process.env, PORT: PUBLIC_PORT, HOSTNAME: '0.0.0.0', NODE_ENV: 'production' },
});

// Chuyển tín hiệu dừng xuống tiến trình con.
['SIGTERM', 'SIGINT'].forEach((sig) =>
  process.on(sig, () => {
    shuttingDown = true;
    children.forEach((c) => !c.killed && c.kill(sig));
    process.exit(0);
  })
);
