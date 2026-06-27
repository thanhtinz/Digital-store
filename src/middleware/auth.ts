import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, AdminPayload } from '../types/index';
import prisma from '../db';

/**
 * Lấy role HIỆN TẠI từ DB (cột users.role) thay vì tin role trong token.
 * Nhờ vậy khi đổi vai trò, hiệu lực ngay — không cần đăng nhập lại.
 * Fallback role trong token nếu DB lỗi.
 */
async function resolveRole(payload: any): Promise<string> {
  try {
    let user: { role: string } | null = null;
    if (payload?.user_id) {
      user = await prisma.user.findUnique({ where: { id: payload.user_id }, select: { role: true } });
    } else if (payload?.email) {
      user = await prisma.user.findUnique({ where: { email: payload.email }, select: { role: true } });
    }
    if (user?.role) return user.role;
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

// Cache jti đã thu hồi (đăng xuất từ xa) để tránh truy vấn DB mỗi request.
const revokedJtis = new Set<string>();
// Cache jti đã xác thực gần đây (positive cache) -> không truy vấn DB mỗi request.
const validatedJtis = new Map<string, number>();
const VALIDATE_TTL_MS = 5 * 60 * 1000;
export function markJtiRevoked(jti: string): void {
  if (jti) {
    revokedJtis.add(jti);
    validatedJtis.delete(jti);
  }
}

export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ detail: 'Not authenticated' });
    return;
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    // Đăng xuất từ xa: nếu token gắn sid và phiên đã bị thu hồi -> chặn.
    const sid = (payload as any).sid as string | undefined;
    if (sid) {
      if (revokedJtis.has(sid)) {
        res.status(401).json({ detail: 'Phiên đã bị đăng xuất' });
        return;
      }
      // Bỏ qua truy vấn DB nếu đã xác thực trong TTL gần đây.
      const seen = validatedJtis.get(sid);
      if (!seen || Date.now() - seen > VALIDATE_TTL_MS) {
        try {
          const sess = await prisma.userSession.findUnique({ where: { jti: sid } });
          if (sess?.revokedAt) {
            revokedJtis.add(sid);
            res.status(401).json({ detail: 'Phiên đã bị đăng xuất' });
            return;
          }
          validatedJtis.set(sid, Date.now());
        } catch {
          /* DB lỗi -> fail-open, vẫn cho qua dựa trên token hợp lệ */
        }
      }
    }
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
