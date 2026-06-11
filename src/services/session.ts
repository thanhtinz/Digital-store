/**
 * Quản lý phiên đăng nhập (thiết bị). Mỗi lần đăng nhập tạo 1 bản ghi
 * user_sessions với jti ngẫu nhiên; jti này được nhúng vào JWT (claim `sid`).
 * Admin/khách có thể xem danh sách & đăng xuất từ xa (thu hồi phiên).
 */
import crypto from 'crypto';
import prisma from '../db';
import type { Request } from 'express';

export function clientIp(req: Request): string {
  const xff = (req.headers['x-forwarded-for'] as string) || '';
  return (xff.split(',')[0] || req.ip || '').trim().slice(0, 50);
}

/** Tạo phiên mới, trả về jti để nhúng vào token. Không ném lỗi. */
export async function createSession(userId: number, req: Request): Promise<string | undefined> {
  try {
    const jti = crypto.randomBytes(24).toString('hex');
    await prisma.userSession.create({
      data: {
        userId,
        jti,
        userAgent: String(req.headers['user-agent'] || '').slice(0, 500) || null,
        ipAddress: clientIp(req) || null,
      },
    });
    return jti;
  } catch {
    return undefined;
  }
}
