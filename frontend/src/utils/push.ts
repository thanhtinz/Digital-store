// Web Push helpers: đăng ký service worker + subscribe/unsubscribe.
import axiosInstance from './axios';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

/** Bật push: xin quyền, đăng ký SW, subscribe và gửi lên server. */
export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!pushSupported()) return { ok: false, error: 'Trình duyệt không hỗ trợ' };
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, error: 'Bạn đã từ chối quyền thông báo' };

    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const { data } = await axiosInstance.get('/api/account/push/public-key');
    const key = data?.public_key;
    if (!key) return { ok: false, error: 'Server chưa cấu hình push' };

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    await axiosInstance.post('/api/account/push/subscribe', { subscription: sub.toJSON() });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Không thể bật thông báo' };
  }
}

export async function disablePush(): Promise<void> {
  try {
    if (!pushSupported()) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await axiosInstance.post('/api/account/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

export async function isPushEnabled(): Promise<boolean> {
  try {
    if (!pushSupported()) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}
