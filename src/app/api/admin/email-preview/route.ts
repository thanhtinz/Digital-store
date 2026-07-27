import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { handler, jsonError } from '@/lib/api';
import { emailLayout, buttonHtml } from '@/lib/mail';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// GET ?template=x — renders system email templates with sample data so the
// admin can see exactly what customers receive.
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin();
  const template = req.nextUrl.searchParams.get('template') || 'order';
  const { site_name: siteName, app_url: appUrl } = await getSettings(['site_name', 'app_url']);
  const base = appUrl || 'https://yourstore.com';

  let html = '';
  switch (template) {
    case 'order':
      html = emailLayout(siteName, 'Payment received — order AB12CD34EF',
        `<p>Thank you for your purchase! We received your payment of <b>$29.98</b>.</p>
         <table width="100%" style="font-size:14px;border-collapse:collapse">
           <tr><td style="padding:6px 0">StreamMax Premium — 1 Month × 1</td><td align="right">$9.99</td></tr>
           <tr><td style="padding:6px 0">SecureVault — Personal × 1</td><td align="right">$19.99</td></tr>
         </table>
         <p>Track your order and view delivered items here:<br><a href="${base}/orders/AB12CD34EF">${base}/orders/AB12CD34EF</a></p>`);
      break;
    case 'delivery':
      html = emailLayout(siteName, 'Your order AB12CD34EF has been delivered',
        `<p>Good news — your item is ready:</p>
         <p style="margin:16px 0 4px"><b>SecureVault — Personal</b></p>
         <pre style="background:#111827;color:#d1fae5;padding:12px;border-radius:8px;font-size:12px;white-space:pre-wrap;word-break:break-all">SV-XXXX-YYYY-ZZZZ-DEMO</pre>
         <p>You can always find your items on the order page:<br><a href="${base}/orders/AB12CD34EF">${base}/orders/AB12CD34EF</a></p>`);
      break;
    case 'verify':
      html = emailLayout(siteName, 'Verify your email',
        `<p>Welcome to ${siteName}! Confirm your email address to activate your account.</p>
         ${buttonHtml(`${base}/verify-email?token=SAMPLE`, 'Verify my email')}`);
      break;
    case 'reset':
      html = emailLayout(siteName, 'Reset your password',
        `<p>We received a request to reset your password. This link is valid for 1 hour.</p>
         ${buttonHtml(`${base}/reset-password?token=SAMPLE`, 'Choose a new password')}
         <p>If you did not request this, you can safely ignore this email.</p>`);
      break;
    case 'restock':
      html = emailLayout(siteName, 'StreamMax Premium is back in stock',
        `<p><b>StreamMax Premium — 12 Months</b> is available again.</p>
         <p>Stock is limited, so grab yours while it lasts.</p>
         ${buttonHtml(`${base}/product/streammax-premium`, 'View product')}`);
      break;
    case 'coupon':
      html = emailLayout(siteName, 'Your personal code: CART-AB12CD',
        `<p>You left some great picks in your cart — here is a little push to finish your order:</p>
         <p style="font-size:22px;font-weight:bold;letter-spacing:2px;background:#eef2ff;color:#4338ca;padding:12px 16px;border-radius:8px;text-align:center">CART-AB12CD</p>
         <p>10% off · valid for 7 days · one use.</p>
         ${buttonHtml(`${base}/cart`, 'Finish my order')}`);
      break;
    case 'giftcard':
      html = emailLayout(siteName, 'Your gift card is ready',
        `<p>Thank you for your purchase! Here is your <b>$25.00</b> gift card code:</p>
         <p style="font-size:22px;font-weight:bold;letter-spacing:2px;background:#eef2ff;color:#4338ca;padding:12px 16px;border-radius:8px;text-align:center">GIFT-AB12-CD34-EF56</p>
         <p>Send it to anyone — they redeem it on the Gift cards page and the amount lands in their wallet instantly.</p>`);
      break;
    default:
      return jsonError(400, 'Unknown template');
  }
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
});
