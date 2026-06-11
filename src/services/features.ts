/**
 * Feature flags + Maintenance mode.
 *
 * Lưu trong siteConfig key `settings_features` (JSON), cùng nơi admin lưu toggle:
 *   { blog, offers, affiliate, support, flash_sales, reviews, announcements,
 *     balance, api_docs, wishlist, maintenance, maintenance_message }
 *
 * Quy ước: một tính năng coi như BẬT trừ khi bị đặt false tường minh.
 * Maintenance: bật bằng `maintenance: true`. Khi bật, chỉ staff/admin đăng nhập được.
 */
import { Request, Response, NextFunction } from 'express';
import prisma from '../db';

const FEATURE_KEY = 'settings_features';
const STAFF_ROLES = ['admin', 'superadmin', 'staff'];

/** Đọc toàn bộ object settings_features (đã parse). Lỗi -> {} (mặc định bật hết). */
export async function getFeatures(): Promise<Record<string, any>> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { key: FEATURE_KEY } });
    if (!row?.value) return {};
    const obj = JSON.parse(row.value);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

/** Tính năng có đang bật không (mặc định bật nếu chưa cấu hình). */
export async function isFeatureEnabled(name: string): Promise<boolean> {
  const f = await getFeatures();
  return f[name] !== false;
}

/** Trạng thái bảo trì. */
export async function getMaintenance(): Promise<{ on: boolean; message: string }> {
  const f = await getFeatures();
  return {
    on: f.maintenance === true || f.maintenance === '1' || f.maintenance === 'true',
    message: String(f.maintenance_message || '').slice(0, 500),
  };
}

/** role hiện tại từ token đã verify (nếu route có chạy auth middleware trước). */
function roleOf(req: Request): string | undefined {
  return (req as any).user?.role || (req as any).admin?.role;
}

export function isStaffRole(role?: string): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

/**
 * Middleware chặn route khi tính năng tắt. Staff/admin (nếu token đã được parse
 * bởi middleware trước đó) được bỏ qua để xem trước. Các đường dẫn quản trị
 * (bắt đầu bằng /admin) luôn được cho qua để admin vẫn cấu hình được.
 */
export function featureGate(name: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.path.startsWith('/admin')) { next(); return; }
      if (isStaffRole(roleOf(req))) { next(); return; }
      if (await isFeatureEnabled(name)) { next(); return; }
      res.status(403).json({ detail: 'Tính năng này hiện đang tắt' });
    } catch {
      next(); // không để lỗi flag làm sập route
    }
  };
}
