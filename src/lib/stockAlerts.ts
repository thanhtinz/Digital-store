import prisma from './db';
import { sendMail, emailLayout, buttonHtml } from './mail';
import { getSettings, getAppUrl } from './settings';
import { notifyUser } from './notify';
import { escapeHtml } from './telegram';

// Email everyone waiting on a package once it is back in stock.
// Called after an admin imports stock; failures only log — the import
// itself must never fail because of notification issues.
export async function notifyRestock(packageId: number): Promise<number> {
  const pending = await prisma.stockAlert.findMany({
    where: { packageId, notifiedAt: null },
    take: 500,
  });
  if (!pending.length) return 0;

  const pkg = await prisma.package.findUnique({
    where: { id: packageId },
    include: { product: { select: { name: true, slug: true } } },
  });
  if (!pkg) return 0;

  const [{ site_name: siteName }, appUrl] = await Promise.all([getSettings(['site_name']), getAppUrl()]);
  const url = `${appUrl.replace(/\/$/, '')}/product/${pkg.product.slug}`;
  const title = `${pkg.product.name} is back in stock`;
  const html = emailLayout(
    siteName,
    title,
    `<p><b>${pkg.product.name} — ${pkg.name}</b> is available again.</p>
     <p>Stock is limited, so grab yours while it lasts.</p>
     ${buttonHtml(url, 'View product')}`
  );

  let sent = 0;
  const text = `<b>${escapeHtml(title)}</b>\n${escapeHtml(`${pkg.product.name} — ${pkg.name}`)} is available again.\n${url}`;
  for (const alert of pending) {
    if (alert.userId) {
      await notifyUser(alert.userId, { subject: title, html, text }).catch(() => {});
      sent += 1;
    } else {
      const ok = await sendMail(alert.email, title, html).catch(() => false);
      if (ok !== false) sent += 1;
    }
    await prisma.stockAlert.update({ where: { id: alert.id }, data: { notifiedAt: new Date() } }).catch(() => {});
  }
  return sent;
}
