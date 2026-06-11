/**
 * Web Push — gửi thông báo đẩy tới trình duyệt của user đã đăng ký.
 * Khóa VAPID lưu trong site_config (vapid_public_key / vapid_private_key);
 * nếu chưa có sẽ tự sinh một lần. An toàn: mọi lỗi đều nuốt, không phá nghiệp vụ.
 */
import prisma from '../db';
// eslint-disable-next-line @typescript-eslint/no-var-requires
let webpush: any = null;
try {
  // require động để app không chết nếu thư viện chưa cài
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  webpush = require('web-push');
} catch {
  webpush = null;
}

let cachedKeys: { publicKey: string; privateKey: string } | null = null;

/** Lấy (hoặc sinh) cặp khóa VAPID, lưu vào site_config. */
export async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string } | null> {
  if (cachedKeys) return cachedKeys;
  if (!webpush) return null;
  try {
    const rows = await prisma.siteConfig.findMany({
      where: { key: { in: ['vapid_public_key', 'vapid_private_key'] } },
    });
    const map = Object.fromEntries(rows.map((r: any) => [r.key, r.value || '']));
    let pub = map['vapid_public_key'];
    let priv = map['vapid_private_key'];
    if (!pub || !priv) {
      const gen = webpush.generateVAPIDKeys();
      pub = gen.publicKey;
      priv = gen.privateKey;
      await prisma.siteConfig.upsert({
        where: { key: 'vapid_public_key' },
        update: { value: pub },
        create: { key: 'vapid_public_key', value: pub },
      });
      await prisma.siteConfig.upsert({
        where: { key: 'vapid_private_key' },
        update: { value: priv },
        create: { key: 'vapid_private_key', value: priv },
      });
    }
    cachedKeys = { publicKey: pub, privateKey: priv };
    return cachedKeys;
  } catch {
    return null;
  }
}

export async function getPublicVapidKey(): Promise<string | null> {
  const keys = await getVapidKeys();
  return keys?.publicKey || null;
}

async function configure(): Promise<boolean> {
  if (!webpush) return false;
  const keys = await getVapidKeys();
  if (!keys) return false;
  try {
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
    webpush.setVapidDetails(subject, keys.publicKey, keys.privateKey);
    return true;
  } catch {
    return false;
  }
}

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  icon?: string;
}

/** Gửi push tới mọi thiết bị của 1 user. Tự dọn subscription hỏng (410/404). */
export async function sendPushToUser(userId: number | string | null | undefined, payload: PushPayload): Promise<void> {
  try {
    const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    if (!uid || Number.isNaN(uid)) return;
    if (!(await configure())) return;
    const subs = await prisma.pushSubscription.findMany({ where: { userId: uid } });
    if (!subs.length) return;
    const data = JSON.stringify({
      title: payload.title,
      body: payload.body || '',
      url: payload.url || '/',
      icon: payload.icon || '',
    });
    await Promise.all(
      subs.map(async (s: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            data
          );
        } catch (err: any) {
          const code = err?.statusCode;
          if (code === 404 || code === 410) {
            await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          }
        }
      })
    );
  } catch {
    /* nuốt lỗi */
  }
}
