/**
 * Nghiệp vụ bán MÃ NGUỒN / THEME (productType = 'source').
 *
 * - Mua xong: cấp SourceLicense + 1 DownloadGrant (lượt tải).
 * - Khách nhập license key (hoặc vào "Tải xuống của tôi") → sinh link tải
 *   dùng-một-lần, có hạn (số phút cấu hình trong admin).
 * - Có bản update mới → cộng thêm 1 grant cho mọi license active.
 * - Hết grant & không có grant chưa dùng → khách mở ticket; admin có thể
 *   cấp lại (license mới + grant mới).
 */
import crypto from 'crypto';
import prisma from '../db';
import { sendMail } from './mail';

const DEFAULT_EXPIRY_MIN = 60;

async function getConfig(key: string): Promise<string | null> {
  const row = await prisma.siteConfig.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function getExpiryMinutes(): Promise<number> {
  const v = parseInt((await getConfig('source_download_expiry_minutes')) || '', 10);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_EXPIRY_MIN;
}

async function baseUrl(): Promise<string> {
  const cfg = (await getConfig('app_base_url')) || process.env.APP_BASE_URL || process.env.PUBLIC_SITE_URL || '';
  return cfg.replace(/\/$/, '');
}

function genLicenseKey(): string {
  // 4 nhóm 4 ký tự, vd: A1B2-C3D4-E5F6-7G8H
  const raw = crypto.randomBytes(10).toString('hex').toUpperCase().slice(0, 16);
  return raw.match(/.{1,4}/g)!.join('-');
}

function genToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

/** Phiên bản mới nhất (ưu tiên isLatest, fallback releasedAt). */
async function latestVersion(productId: number) {
  return (
    (await prisma.sourceVersion.findFirst({ where: { productId, isLatest: true } })) ||
    (await prisma.sourceVersion.findFirst({ where: { productId }, orderBy: { releasedAt: 'desc' } }))
  );
}

/**
 * Cấp license + grant cho mọi sản phẩm type 'source' trong đơn (idempotent),
 * và đánh dấu đơn completed nếu mọi mục đều là mã nguồn (giao tức thì).
 * Gọi khi đơn đã 'paid'.
 */
export async function issueSourceForOrder(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      package: { include: { product: { include: { category: true } } } },
      items: { include: { package: { include: { product: { include: { category: true } } } } } },
    },
  });
  if (!order) return;
  if (order.status !== 'paid' && order.status !== 'completed') return;

  type Line = { productId: number; packageId: number | null; isSource: boolean };
  const lines: Line[] = [];
  if (order.items.length > 0) {
    for (const it of order.items) {
      const prod = it.package?.product;
      lines.push({
        productId: prod?.id ?? 0,
        packageId: it.packageId ?? null,
        isSource: prod?.category?.productType === 'source',
      });
    }
  } else if (order.package?.product) {
    lines.push({
      productId: order.package.product.id,
      packageId: order.packageId ?? null,
      isSource: order.package.product.category?.productType === 'source',
    });
  }

  const sourceLines = lines.filter((l) => l.isSource && l.productId);
  if (sourceLines.length === 0) return;

  const issuedKeys: { name: string; key: string }[] = [];
  for (const l of sourceLines) {
    const existing = await prisma.sourceLicense.findFirst({
      where: { orderId, productId: l.productId },
    });
    if (existing) continue;

    const ver = await latestVersion(l.productId);
    const license = await prisma.sourceLicense.create({
      data: {
        licenseKey: genLicenseKey(),
        userId: order.userId,
        orderId,
        productId: l.productId,
        packageId: l.packageId,
        status: 'active',
      },
    });
    await prisma.downloadGrant.create({
      data: { licenseId: license.id, versionId: ver?.id ?? null, reason: 'purchase' },
    });
    const prod = await prisma.product.findUnique({ where: { id: l.productId }, select: { name: true } });
    issuedKeys.push({ name: prod?.name || `#${l.productId}`, key: license.licenseKey });
  }

  // Giao tức thì: nếu mọi mục trong đơn đều là mã nguồn → completed.
  const allSource = lines.every((l) => l.isSource);
  if (allSource && order.status === 'paid') {
    await prisma.order.updateMany({ where: { id: orderId, status: 'paid' }, data: { status: 'completed' } });
  }

  if (issuedKeys.length && order.userEmail) {
    const url = `${await baseUrl()}/dashboard/downloads`;
    const rows = issuedKeys
      .map((k) => `<li><b>${k.name}</b> — mã: <code>${k.key}</code></li>`)
      .join('');
    sendMail({
      to: order.userEmail,
      subject: `License mã nguồn — đơn ${order.orderCode}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
          <h2 style="margin:0 0 8px">Cảm ơn bạn đã mua hàng</h2>
          <p>License key cho đơn <b>#${order.orderCode}</b>:</p>
          <ul>${rows}</ul>
          <p><a href="${url}" style="display:inline-block;padding:10px 18px;background:#00AB55;color:#fff;text-decoration:none;border-radius:8px">Tải xuống của tôi</a></p>
          <p style="color:#888;font-size:12px">Nhập license key trên trang tải xuống để lấy link. Link tải dùng một lần và sẽ hết hạn.</p>
        </div>`,
      text: issuedKeys.map((k) => `${k.name}: ${k.key}`).join('\n') + `\nTải: ${url}`,
    }).catch(() => {});
  }
}

/** Cộng thêm 1 lượt tải (grant) cho mọi license active của sản phẩm khi có version mới. */
export async function addGrantsForNewVersion(productId: number, versionId: number): Promise<number> {
  const licenses = await prisma.sourceLicense.findMany({ where: { productId, status: 'active' }, select: { id: true } });
  if (!licenses.length) return 0;
  await prisma.downloadGrant.createMany({
    data: licenses.map((l: { id: number }) => ({ licenseId: l.id, versionId, reason: 'update' })),
  });
  return licenses.length;
}

export type RedeemResult =
  | { ok: true; token: string; expiresAt: Date; version: string | null; downloadUrl: string }
  | { ok: false; reason: 'not_found' | 'revoked' | 'no_version' | 'need_ticket' };

/** Khách nhập license key → trả link tải (nếu còn lượt). Account-bound. */
export async function redeemForUser(userId: string, licenseKey: string): Promise<RedeemResult> {
  const license = await prisma.sourceLicense.findUnique({ where: { licenseKey: licenseKey.trim().toUpperCase() } });
  if (!license || license.userId !== userId) return { ok: false, reason: 'not_found' };
  if (license.status !== 'active') return { ok: false, reason: 'revoked' };

  const ver = await latestVersion(license.productId);
  if (!ver || !ver.driveFileId) return { ok: false, reason: 'no_version' };

  // Lượt tải chưa dùng (cũ nhất trước).
  const grant = await prisma.downloadGrant.findFirst({
    where: { licenseId: license.id, usedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  if (!grant) return { ok: false, reason: 'need_ticket' };

  const now = new Date();
  let { token, expiresAt } = grant;
  // Token còn hạn & chưa dùng → tái sử dụng; nếu không thì cấp token mới.
  if (!token || !expiresAt || expiresAt <= now) {
    token = genToken();
    expiresAt = new Date(now.getTime() + (await getExpiryMinutes()) * 60_000);
    await prisma.downloadGrant.update({
      where: { id: grant.id },
      data: { token, expiresAt, versionId: grant.versionId ?? ver.id },
    });
  }

  return {
    ok: true,
    token: token!,
    expiresAt: expiresAt!,
    version: ver.version,
    downloadUrl: `${await baseUrl()}/api/source/download/${token}`,
  };
}

/** Lấy grant hợp lệ theo token (chưa dùng, chưa hết hạn) + thông tin file. */
export async function resolveToken(token: string) {
  const grant = await prisma.downloadGrant.findUnique({
    where: { token },
    include: { version: true, license: true },
  });
  if (!grant) return { ok: false as const, reason: 'invalid' as const };
  if (grant.usedAt) return { ok: false as const, reason: 'used' as const };
  if (!grant.expiresAt || grant.expiresAt <= new Date()) return { ok: false as const, reason: 'expired' as const };
  if (grant.license.status !== 'active') return { ok: false as const, reason: 'revoked' as const };

  // File phục vụ: version gắn với grant, fallback version mới nhất.
  let fileId = grant.version?.driveFileId || null;
  let fileName = grant.version?.fileName || null;
  if (!fileId) {
    const ver = await latestVersion(grant.license.productId);
    fileId = ver?.driveFileId || null;
    fileName = ver?.fileName || null;
  }
  if (!fileId) return { ok: false as const, reason: 'no_file' as const };
  return { ok: true as const, grantId: grant.id, fileId, fileName };
}

export async function markGrantUsed(grantId: number): Promise<void> {
  await prisma.downloadGrant.update({ where: { id: grantId }, data: { usedAt: new Date() } });
}

/** Admin cấp lại: license mới + grant mới + gửi mail. */
export async function adminResendLicense(licenseId: number): Promise<{ licenseKey: string } | null> {
  const old = await prisma.sourceLicense.findUnique({ where: { id: licenseId } });
  if (!old) return null;
  await prisma.sourceLicense.update({ where: { id: licenseId }, data: { status: 'revoked' } });

  const ver = await latestVersion(old.productId);
  const fresh = await prisma.sourceLicense.create({
    data: {
      licenseKey: genLicenseKey(),
      userId: old.userId,
      orderId: old.orderId,
      productId: old.productId,
      packageId: old.packageId,
      status: 'active',
    },
  });
  await prisma.downloadGrant.create({
    data: { licenseId: fresh.id, versionId: ver?.id ?? null, reason: 'admin_resend' },
  });

  const order = old.orderId ? await prisma.order.findUnique({ where: { id: old.orderId } }) : null;
  const prod = await prisma.product.findUnique({ where: { id: old.productId }, select: { name: true } });
  if (order?.userEmail) {
    const url = `${await baseUrl()}/dashboard/downloads`;
    sendMail({
      to: order.userEmail,
      subject: `License mới — ${prod?.name || 'mã nguồn'}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
          <h2 style="margin:0 0 8px">License mới của bạn</h2>
          <p>Mã license mới cho <b>${prod?.name || ''}</b>: <code>${fresh.licenseKey}</code></p>
          <p><a href="${url}" style="display:inline-block;padding:10px 18px;background:#00AB55;color:#fff;text-decoration:none;border-radius:8px">Tải xuống của tôi</a></p>
        </div>`,
      text: `License mới: ${fresh.licenseKey}\nTải: ${url}`,
    }).catch(() => {});
  }
  return { licenseKey: fresh.licenseKey };
}
