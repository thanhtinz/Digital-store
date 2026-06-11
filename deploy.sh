#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# deploy.sh — Script triển khai/cập nhật trên VPS
#
# Chạy trên VPS, trong thư mục dự án:
#   bash deploy.sh
#
# Việc nó làm:
#   1. Kéo code mới nhất (nếu dùng git)
#   2. Cài dependencies
#   3. Sinh Prisma client + đồng bộ schema vào DB
#   4. Build TypeScript → dist/
#   5. Seed dữ liệu lần đầu (nếu thêm cờ --seed)
#   6. Khởi động / reload app bằng PM2
# ──────────────────────────────────────────────────────────────

set -e  # dừng ngay nếu có lỗi

echo "🚀 Bắt đầu deploy Sweet Premium Store..."

# 1. Kéo code mới (bỏ qua nếu không dùng git)
if [ -d .git ]; then
  echo "📥 Đang kéo code mới..."
  git pull origin main || echo "⚠️  Bỏ qua git pull"
fi

# 2. Cài dependencies (production)
echo "📦 Đang cài dependencies..."
npm install

# 3. Prisma: sinh client + đồng bộ schema
echo "🗄️  Đang sinh Prisma client..."
npx prisma generate

echo "🗄️  Đang đồng bộ schema vào database..."
npx prisma db push

# 4. Build TypeScript
echo "🔨 Đang build TypeScript..."
npm run build

# 5. Seed dữ liệu (chỉ khi có cờ --seed, thường chỉ lần đầu)
if [ "$1" == "--seed" ]; then
  echo "🌱 Đang seed dữ liệu ban đầu..."
  npm run db:seed
fi

# 6. Khởi động / reload bằng PM2
mkdir -p logs
if pm2 describe sweet-store > /dev/null 2>&1; then
  echo "♻️  Đang reload app..."
  pm2 reload ecosystem.config.js --update-env
else
  echo "▶️  Đang khởi động app lần đầu..."
  pm2 start ecosystem.config.js
  pm2 save
fi

echo ""
echo "✅ Deploy hoàn tất!"
echo "   Xem log:     pm2 logs sweet-store"
echo "   Xem trạng thái: pm2 status"
