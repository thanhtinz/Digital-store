// Background scheduler (Node runtime only): evaluates auto-coupon rules
// (abandoned cart, win-back) every 30 minutes.
import { runAutoCouponRules } from './lib/autoCoupons';

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
  };
  // First pass shortly after boot, then every 30 minutes.
  setTimeout(run, 2 * 60 * 1000).unref?.();
  setInterval(run, 30 * 60 * 1000).unref?.();
}
