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
COPY package.json package-lock.json* ./
RUN npm install --include=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
# Bỏ devDependencies để runtime gọn
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
RUN npm run build

# ---------- 3) Runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV BACKEND_PORT=4000

# Backend
COPY --from=backend /app/dist ./dist
COPY --from=backend /app/node_modules ./node_modules
COPY --from=backend /app/package.json ./package.json
COPY --from=backend /app/prisma ./prisma
COPY --from=backend /app/static ./static

# Frontend (Next.js standalone)
COPY --from=frontend /app/frontend/.next/standalone ./frontend/
COPY --from=frontend /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend /app/frontend/public ./frontend/public

COPY docker-start.js ./docker-start.js

EXPOSE 3000
CMD ["node", "docker-start.js"]
