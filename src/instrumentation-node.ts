// Background scheduler (Node runtime only): evaluates auto-coupon rules
// (abandoned cart, win-back) and expires abandoned PENDING orders every
// 30 minutes.
import { runAutoCouponRules } from './lib/autoCoupons';
import { expireStaleOrders } from './lib/orders';

const globalAny = globalThis as any;

if (!globalAny.__dsSchedulerStarted) {
  globalAny.__dsSchedulerStarted = true;

  const run = async () => {
    try {
      const { granted } = await runAutoCouponRules();
      if (granted > 0) console.log(`[auto-coupons] granted ${granted} code(s)`);
    } catch (e) {
      console.error('[auto-coupons] run failed:', e);
    }
    try {
      const expired = await expireStaleOrders();
      if (expired > 0) console.log(`[orders] expired ${expired} stale pending order(s)`);
    } catch (e) {
      console.error('[orders] expiry run failed:', e);
    }
  };
  // First pass shortly after boot, then every 30 minutes.
  setTimeout(run, 2 * 60 * 1000).unref?.();
  setInterval(run, 30 * 60 * 1000).unref?.();
}
