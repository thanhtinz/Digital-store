import prisma from './db';
import { getSettings, getAppUrl } from './settings';
import { sendMail, emailLayout, buttonHtml } from './mail';

// Evaluates every active auto-coupon rule against its configured conditions
// and emails personal one-time codes to matching customers.
//
// Triggers & conditions:
//   ABANDONED_CART — items sitting in the cart for at least `delayHours`
//                    (max 7 days old), optional `minCartValue`
//   WINBACK        — last paid order older than `inactiveDays`,
//                    optional `minSpentTotal` lifetime spend
// Per rule, a user is granted at most one code every `cooldownDays`.

function generateCouponCode(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${code}`;
}

export async function runAutoCouponRules(): Promise<{ granted: number }> {
  const rules = await prisma.autoCouponRule.findMany({ where: { isActive: true } });
  if (!rules.length) return { granted: 0 };

  const s = await getSettings(['site_name']);
  const appUrl = await getAppUrl();
  let granted = 0;

  for (const rule of rules) {
    const cooldownCutoff = new Date(Date.now() - rule.cooldownDays * 86400_000);
    let candidates: number[] = [];

    if (rule.trigger === 'ABANDONED_CART') {
      const newest = new Date(Date.now() - rule.delayHours * 3600_000);
      const oldest = new Date(Date.now() - 7 * 86400_000);
      const carts = await prisma.cartItem.findMany({
        where: { createdAt: { lte: newest, gte: oldest } },
        include: { package: { select: { price: true } } },
      });
      const byUser = new Map<number, number>();
      for (const item of carts) {
        byUser.set(item.userId, (byUser.get(item.userId) || 0) + Number(item.package.price) * item.quantity);
      }
      candidates = Array.from(byUser.entries())
        .filter(([, value]) => rule.minCartValue == null || value >= Number(rule.minCartValue))
        .map(([userId]) => userId);
    } else if (rule.trigger === 'WINBACK') {
      const cutoff = new Date(Date.now() - rule.inactiveDays * 86400_000);
      const groups = await prisma.order.groupBy({
        by: ['userId'],
        where: { status: { in: ['PAID', 'COMPLETED'] } },
        _max: { paidAt: true },
        _sum: { total: true },
      });
      candidates = groups
        .filter((g) => g._max.paidAt && g._max.paidAt < cutoff)
        .filter((g) => rule.minSpentTotal == null || Number(g._sum.total || 0) >= Number(rule.minSpentTotal))
        .map((g) => g.userId);
    }

    for (const userId of candidates) {
      // Cooldown: skip users granted recently by this rule.
      const recent = await prisma.autoCouponGrant.findFirst({
        where: { ruleId: rule.id, userId, createdAt: { gte: cooldownCutoff } },
      });
      if (recent) continue;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.isBlocked || !user.emailVerifiedAt) continue;

      const code = generateCouponCode(rule.trigger === 'ABANDONED_CART' ? 'CART' : 'MISSU');
      await prisma.coupon.create({
        data: {
          code,
          type: rule.discountType === 'FIXED' ? 'FIXED' : 'PERCENT',
          value: rule.value,
          maxDiscount: rule.maxDiscount,
          maxUses: 1,
          perUserLimit: 1,
          endsAt: new Date(Date.now() + rule.expiresDays * 86400_000),
        },
      });
      await prisma.autoCouponGrant.create({ data: { ruleId: rule.id, userId, couponCode: code } });
      granted += 1;

      const discountLabel = rule.discountType === 'FIXED'
        ? `$${Number(rule.value).toFixed(2)} off`
        : `${Number(rule.value)}% off${rule.maxDiscount ? ` (up to $${Number(rule.maxDiscount).toFixed(2)})` : ''}`;
      const intro = rule.trigger === 'ABANDONED_CART'
        ? '<p>You left some great picks in your cart — here is a little push to finish your order:</p>'
        : '<p>We miss you! Here is a personal discount to welcome you back:</p>';

      sendMail(
        user.email,
        `A ${discountLabel} code just for you — ${s.site_name}`,
        emailLayout(s.site_name, `Your personal code: ${code}`,
          `${intro}
           <p style="font-size:22px;font-weight:bold;letter-spacing:2px;background:#eef2ff;color:#4338ca;padding:12px 16px;border-radius:8px;text-align:center">${code}</p>
           <p>${discountLabel} · valid for ${rule.expiresDays} day${rule.expiresDays === 1 ? '' : 's'} · one use.</p>
           ${buttonHtml(`${appUrl}${rule.trigger === 'ABANDONED_CART' ? '/cart' : '/products'}`, rule.trigger === 'ABANDONED_CART' ? 'Finish my order' : 'Shop now')}`)
      ).catch(() => {});
    }
  }

  return { granted };
}
