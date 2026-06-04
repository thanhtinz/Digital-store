/**
 * API bán MÃ NGUỒN / THEME (productType = 'source').
 * Mount tại /api (giống admin/misc router).
 */
import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireUser, requireStaffOrAdmin } from '../middleware/auth';
import {
  redeemForUser,
  resolveToken,
  markGrantUsed,
  addGrantsForNewVersion,
  adminResendLicense,
  getExpiryMinutes,
} from '../services/source';
import { streamDriveFile, getServiceAccountEmail } from '../services/drive';

const router = Router();

// ── Công khai: changelog các phiên bản (KHÔNG lộ driveFileId) ──
router.get('/source/:productId/versions', async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.productId);
    const versions = await prisma.sourceVersion.findMany({
      where: { productId },
      orderBy: { releasedAt: 'desc' },
      select: { id: true, version: true, changelog: true, fileSize: true, isLatest: true, releasedAt: true },
    });
    res.json({ items: versions.map((v: any) => ({ ...v, releasedAt: v.releasedAt?.toISOString() })) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Khách: nhập license key → trả link tải ──
router.post('/source/redeem', requireUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.user_id.toString();
    const key = (req.body?.license_key || '').toString();
    if (!key.trim()) { res.status(422).json({ detail: 'Thiếu license key' }); return; }
    const r = await redeemForUser(userId, key);
    if (!r.ok) {
      const map: Record<string, string> = {
        not_found: 'License key không hợp lệ hoặc không thuộc tài khoản của bạn',
        revoked: 'License đã bị thu hồi',
        no_version: 'Sản phẩm chưa có phiên bản tải xuống',
        need_ticket: 'Bạn đã dùng hết lượt tải. Vui lòng tạo ticket để được hỗ trợ.',
      };
      res.status(400).json({ detail: map[r.reason] || 'Không thể tạo link', reason: r.reason });
      return;
    }
    res.json({
      download_url: r.downloadUrl,
      token: r.token,
      version: r.version,
      expires_at: r.expiresAt.toISOString(),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Khách: danh sách "Tải xuống của tôi" ──
router.get('/me/downloads', requireUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.user_id.toString();
    const licenses = await prisma.sourceLicense.findMany({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, slug: true, imageUrl: true } },
        grants: { select: { usedAt: true } },
      },
    });
    const items = await Promise.all(
      licenses.map(async (l: any) => {
        const latest = await prisma.sourceVersion.findFirst({
          where: { productId: l.productId },
          orderBy: [{ isLatest: 'desc' }, { releasedAt: 'desc' }],
          select: { version: true, fileSize: true, releasedAt: true },
        });
        const remaining = l.grants.filter((g: any) => !g.usedAt).length;
        return {
          license_id: l.id,
          license_key: l.licenseKey,
          product: l.product,
          latest_version: latest?.version || null,
          file_size: latest?.fileSize || null,
          remaining_downloads: remaining,
          can_download: remaining > 0,
          created_at: l.createdAt?.toISOString(),
        };
      })
    );
    res.json({ items });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Tải file qua token dùng-một-lần (proxy Drive, ẩn link thật) ──
router.get('/source/download/:token', async (req: Request, res: Response) => {
  try {
    const r = await resolveToken(req.params.token);
    if (!r.ok) {
      const map: Record<string, string> = {
        invalid: 'Link không hợp lệ',
        used: 'Link đã được dùng',
        expired: 'Link đã hết hạn',
        revoked: 'License đã bị thu hồi',
        no_file: 'Chưa có file để tải',
      };
      res.status(410).json({ detail: map[r.reason] || 'Link không khả dụng', reason: r.reason });
      return;
    }
    // Stream thành công mới đánh dấu đã dùng (tránh tiêu lượt khi lỗi).
    await streamDriveFile(r.fileId, res, r.fileName || undefined);
    await markGrantUsed(r.grantId);
  } catch (e: any) {
    if (!res.headersSent) {
      const msg =
        e?.message === 'DRIVE_NOT_CONFIGURED'
          ? 'Hệ thống chưa cấu hình Google Drive'
          : e?.message === 'GOOGLEAPIS_NOT_INSTALLED'
          ? 'Thiếu thư viện googleapis trên server'
          : 'Lỗi tải file';
      res.status(500).json({ detail: msg });
    } else {
      res.end();
    }
  }
});

// ════════════════════════════════════════════════════
// ADMIN
// ════════════════════════════════════════════════════

// Trạng thái kết nối Drive (email service account để admin biết share folder).
router.get('/admin/source/drive-status', requireStaffOrAdmin, async (_req: Request, res: Response) => {
  try {
    const email = await getServiceAccountEmail();
    res.json({ configured: !!email, service_account_email: email, expiry_minutes: await getExpiryMinutes() });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Liệt kê phiên bản (đầy đủ, gồm driveFileId) cho admin.
router.get('/admin/source/:productId/versions', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.productId);
    const versions = await prisma.sourceVersion.findMany({ where: { productId }, orderBy: { releasedAt: 'desc' } });
    res.json({ items: versions.map((v: any) => ({ ...v, releasedAt: v.releasedAt?.toISOString(), createdAt: v.createdAt?.toISOString() })) });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Tạo phiên bản mới → cộng lượt tải cho khách đã mua.
router.post('/admin/source/:productId/versions', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.productId);
    const { version, changelog, drive_file_id, file_name, file_size, is_latest } = req.body || {};
    if (!version) { res.status(422).json({ detail: 'Thiếu số phiên bản' }); return; }
    const makeLatest = is_latest !== false; // mặc định version mới là latest
    if (makeLatest) {
      await prisma.sourceVersion.updateMany({ where: { productId }, data: { isLatest: false } });
    }
    const v = await prisma.sourceVersion.create({
      data: {
        productId,
        version: String(version),
        changelog: changelog || null,
        driveFileId: drive_file_id || null,
        fileName: file_name || null,
        fileSize: file_size || null,
        isLatest: makeLatest,
      },
    });
    const added = await addGrantsForNewVersion(productId, v.id);
    res.status(201).json({ id: v.id, granted: added });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Sửa phiên bản.
router.patch('/admin/source/versions/:vid', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const vid = parseInt(req.params.vid);
    const cur = await prisma.sourceVersion.findUnique({ where: { id: vid } });
    if (!cur) { res.status(404).json({ detail: 'Không tìm thấy phiên bản' }); return; }
    const b = req.body || {};
    if (b.is_latest === true) {
      await prisma.sourceVersion.updateMany({ where: { productId: cur.productId }, data: { isLatest: false } });
    }
    const v = await prisma.sourceVersion.update({
      where: { id: vid },
      data: {
        ...(b.version !== undefined && { version: String(b.version) }),
        ...(b.changelog !== undefined && { changelog: b.changelog || null }),
        ...(b.drive_file_id !== undefined && { driveFileId: b.drive_file_id || null }),
        ...(b.file_name !== undefined && { fileName: b.file_name || null }),
        ...(b.file_size !== undefined && { fileSize: b.file_size || null }),
        ...(b.is_latest !== undefined && { isLatest: !!b.is_latest }),
      },
    });
    res.json({ id: v.id });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.delete('/admin/source/versions/:vid', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.sourceVersion.delete({ where: { id: parseInt(req.params.vid) } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Liệt kê license (theo đơn hoặc sản phẩm) cho admin.
router.get('/admin/source/licenses', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.orderId) where.orderId = parseInt(req.query.orderId as string);
    if (req.query.productId) where.productId = parseInt(req.query.productId as string);
    const licenses = await prisma.sourceLicense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true } }, grants: { select: { usedAt: true } } },
      take: 200,
    });
    res.json({
      items: licenses.map((l: any) => ({
        id: l.id,
        license_key: l.licenseKey,
        user_id: l.userId,
        order_id: l.orderId,
        product_name: l.product?.name,
        status: l.status,
        remaining_downloads: l.grants.filter((g: any) => !g.usedAt).length,
        created_at: l.createdAt?.toISOString(),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// Cấp lại license + link mới cho khách.
router.post('/admin/source/licenses/:lid/resend', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const r = await adminResendLicense(parseInt(req.params.lid));
    if (!r) { res.status(404).json({ detail: 'Không tìm thấy license' }); return; }
    res.json({ ok: true, license_key: r.licenseKey });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

export default router;
