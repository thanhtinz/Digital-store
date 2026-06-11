/**
 * Cấu hình PM2 — chạy app ở chế độ production, tự khởi động lại khi crash.
 * Dùng: pm2 start ecosystem.config.js
 */
module.exports = {
  apps: [
    {
      name: 'sweet-store',
      script: 'dist/server.js',
      cwd: __dirname,
      instances: 1,            // tăng lên 'max' nếu VPS nhiều CPU
      exec_mode: 'fork',       // dùng 'cluster' nếu instances > 1
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      time: true,
    },
  ],
};
