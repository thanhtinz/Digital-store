import prisma from './db';
import { clientIp } from './rateLimit';
import type { User } from '@prisma/client';

// Fire-and-forget audit trail for admin actions. Never throws — a logging
// failure must not break the action itself.
export function audit(user: User, action: string, target?: string, detail?: string) {
  let ip: string | undefined;
  try {
    ip = clientIp();
  } catch {
    ip = undefined;
  }
  prisma.auditLog
    .create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action,
        target: target?.slice(0, 190) || null,
        detail: detail?.slice(0, 2000) || null,
        ip,
      },
    })
    .catch((e) => console.error('[audit] write failed:', e));
}
