// Server boot work (Node runtime only): create the first admin account on a
// fresh deployment, then run the background scheduler — auto-coupon rules
// (abandoned cart, win-back) and abandoned PENDING order expiry every 30 min.
import { runAutoCouponRules } from './lib/autoCoupons';
import { expireStaleOrders } from './lib/orders';
import { expireStaleIntents } from './lib/payments';
import { ensureAdminAccount } from './lib/bootstrap';

const globalAny = globalThis as any;

if (!globalAny.__dsSchedulerStarted) {
  globalAny.__dsSchedulerStarted = true;

  ensureAdminAccount().catch((e) => console.error('[bootstrap] admin check failed:', e));

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
    try {
      const expired = await expireStaleIntents();
      if (expired > 0) console.log(`[payments] expired ${expired} stale payment intent(s)`);
    } catch (e) {
      console.error('[payments] expiry run failed:', e);
    }
  };
  // First pass shortly after boot, then every 30 minutes.
  setTimeout(run, 2 * 60 * 1000).unref?.();
  setInterval(run, 30 * 60 * 1000).unref?.();
}
