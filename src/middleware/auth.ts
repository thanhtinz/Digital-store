import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, AdminPayload } from '../types/index';
import prisma from '../db';

/**
 * Lấy role HIỆN TẠI từ DB (bảng admin_users theo email) thay vì tin role trong
 * token. Nhờ vậy khi đổi vai trò, hiệu lực ngay — không cần đăng nhập lại.
 * Fallback role trong token nếu DB lỗi.
 */
async function resolveRole(payload: any): Promise<string> {
  try {
    if (payload?.email) {
      const adminUser = await prisma.adminUser.findUnique({ where: { email: payload.email } });
      if (adminUser?.role) return adminUser.role;
    }
  } catch {
    /* DB lỗi -> dùng role trong token */
  }
  return payload?.role || 'user';
}

/**
 * Khóa JWT dùng chung toàn hệ thống.
 * - Production: bắt buộc có JWT_SECRET, nếu thiếu thì dừng app (fail-closed)
 *   để tránh dùng khóa mặc định khiến ai cũng tự ký được token admin.
 * - Dev: cho phép fallback nhưng cảnh báo rõ.
 */
function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required (>=16 ký tự) ở production');
  }
  console.warn('[security] JWT_SECRET chưa đặt/đủ dài — đang dùng khóa dev KHÔNG an toàn. Tuyệt đối không dùng ở production.');
  return 'dev-secret-change-in-production';
}

export const JWT_SECRET = resolveJwtSecret();

export function requireUser(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ detail: 'Not authenticated' });
    return;
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ detail: 'Invalid or expired token' });
  }
}

/**
 * Chỉ ADMIN/SUPERADMIN. Dùng cho thao tác nhạy cảm: secret thanh toán/SMTP/OAuth,
 * cấu hình DB, quản lý người dùng, xóa cứng dữ liệu, mã giảm giá, flash sale...
 * (Staff bị từ chối — staff chỉ vận hành đơn/chat + quản lý sản phẩm/kho qua
 *  requireStaffOrAdmin.)
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ detail: 'Not authenticated' });
    return;
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as AdminPayload;
    const role = await resolveRole(payload);
    if (!['admin', 'superadmin'].includes(role)) {
      res.status(403).json({ detail: 'Admin access required' });
      return;
    }
    (req as any).admin = { ...payload, role };
    next();
  } catch {
    res.status(401).json({ detail: 'Invalid or expired token' });
  }
}

/**
 * ADMIN/SUPERADMIN hoặc STAFF. Dùng cho vận hành hằng ngày: quản lý đơn,
 * giao hàng, chat hỗ trợ, quản lý sản phẩm/gói/kho/danh mục/banner.
 */
export async function requireStaffOrAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ detail: 'Not authenticated' });
    return;
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as AdminPayload;
    const role = await resolveRole(payload);
    if (!['admin', 'superadmin', 'staff'].includes(role)) {
      res.status(403).json({ detail: 'Staff or admin access required' });
      return;
    }
    (req as any).admin = { ...payload, role };
    next();
  } catch {
    res.status(401).json({ detail: 'Invalid or expired token' });
  }
}

export function signToken(payload: Record<string, any>, expiresIn: string = '7d'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as any);
}

export function optionalUser(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const token = header.slice(7);
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
      (req as any).user = payload;
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}
