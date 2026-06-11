# ============================================================
# Digital Store — ALL-IN-ONE (1 image chạy cả Backend + Frontend)
#   - Backend Express (API + admin SPA) chạy nội bộ cổng 4000
#   - Frontend Next.js Minimal Pro chạy ở $PORT, proxy /api,/admin,/static
#     sang backend nội bộ -> same-origin, KHÔNG cần CORS, KHÔNG cần URL backend.
# Deploy 1 lần là chạy hết (Railway 1 service / VPS 1 container).
# ============================================================

# ---------- 1) Build BACKEND ----------
FROM node:20-alpine AS backend
WORKDIR /app
# Prisma trên Alpine cần openssl + libc6-compat.
RUN apk add --no-cache openssl libc6-compat
# Copy schema TRƯỚC khi install vì postinstall chạy `prisma generate`.
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --include=dev
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
# Bỏ devDependencies để runtime gọn (giữ lại prisma CLI vì nó nằm ở dependencies).
RUN npm prune --omit=dev

# ---------- 2) Build FRONTEND ----------
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* frontend/yarn.lock* ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
# Rỗng -> axios dùng đường dẫn tương đối (same-origin). /api proxy nội bộ.
ENV NEXT_PUBLIC_HOST_API=
# Dấu mốc build + ÉP rebuild frontend mỗi commit: Railway tự cấp RAILWAY_GIT_COMMIT_SHA
# lúc build; layer build phụ thuộc biến này nên mỗi commit là cache-miss (frontend
# chắc chắn build lại). /build-info.json giúp kiểm tra phiên bản frontend đang chạy.
ARG RAILWAY_GIT_COMMIT_SHA=dev
ENV NEXT_PUBLIC_BUILD_ID=$RAILWAY_GIT_COMMIT_SHA
RUN echo "{\"buildId\":\"$RAILWAY_GIT_COMMIT_SHA\",\"builtAt\":\"$(date -u +%FT%TZ)\"}" > public/build-info.json
RUN npm run build

# ---------- 3) Runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
# Prisma runtime cũng cần openssl (chạy `prisma db push` lúc khởi động).
RUN apk add --no-cache openssl libc6-compat
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV BACKEND_PORT=4000

# Backend
COPY --from=backend /app/dist ./dist
COPY --from=backend /app/node_modules ./node_modules
COPY --from=backend /app/package.json ./package.json
COPY --from=backend /app/prisma ./prisma
# static/ (admin SPA + ảnh upload/banner) copy thẳng từ build context.
COPY static ./static

# Frontend (Next.js standalone)
COPY --from=frontend /app/frontend/.next/standalone ./frontend/
COPY --from=frontend /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend /app/frontend/public ./frontend/public

COPY docker-start.js ./docker-start.js

EXPOSE 3000
CMD ["node", "docker-start.js"]
