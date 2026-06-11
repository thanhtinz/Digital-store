/**
 * Notify service — tạo thông báo trong ứng dụng (chuông).
 * An toàn: mọi lỗi đều nuốt để không ảnh hưởng luồng chính.
 */
import prisma from '../db';
import { sendPushToUser } from './push';

export interface NotifyInput {
  type?: string;        // order | payment | points | system...
  title: string;
  body?: string;
  link?: string;
}

/** Tạo 1 thông báo cho user (userId dạng số hoặc chuỗi số). Không ném lỗi. */
export async function createNotification(userId: number | string | null | undefined, input: NotifyInput): Promise<void> {
  try {
    const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    if (!uid || Number.isNaN(uid)) return;
    await prisma.notification.create({
      data: {
        userId: uid,
        type: input.type || 'info',
        title: input.title.slice(0, 250),
        body: input.body || null,
        link: input.link || null,
      },
    });
    // Đẩy web push song song (không chờ, không ném lỗi).
    sendPushToUser(uid, { title: input.title, body: input.body, url: input.link || '/' }).catch(() => {});
  } catch {
    /* bỏ qua: thông báo không được phép làm hỏng nghiệp vụ chính */
  }
}
