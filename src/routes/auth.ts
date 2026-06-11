import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import multer from 'multer';
import sharp from 'sharp';
import prisma from '../db';
import crypto from 'crypto';
import { signToken, requireUser, requireAdmin, JWT_SECRET } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimit';
import { notifyNewUser } from '../services/telegram';
import { getMaintenance, isStaffRole } from '../services/features';

const MAINTENANCE_DEFAULT_MSG = 'Hệ thống đang bảo trì. Vui lòng quay lại sau.';
import * as otplib from 'otplib';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import { sendMail } from '../services/mail';

const router = Router();

// Upload avatar: ảnh giữ trong bộ nhớ, nén bằng sharp rồi lưu DB.
const uploadAvatar = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// ── Register ───────────────────────────────────────────
router.post('/register', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { email, password, display_name } = req.body;
    if (!email || !password) {
      res.status(422).json({ detail: 'Email và mật khẩu không được để trống' });
      return;
    }
    // Bảo trì: không cho đăng ký tài khoản mới
    const maintReg = await getMaintenance();
    if (maintReg.on) {
      res.status(503).json({ detail: maintReg.message || MAINTENANCE_DEFAULT_MSG, maintenance: true });
      return;
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ detail: 'Email đã tồn tại' });
      return;
    }
    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash: hash, displayName: display_name || email.split('@')[0] },
    });
    const token = signToken({ user_id: user.id, email: user.email, display_name: user.displayName });
    notifyNewUser(user.id).catch(() => {}); // Telegram thông báo
    res.json({ access_token: token, token, token_type: 'bearer', user: { id: user.id, email: user.email, display_name: user.displayName } });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Login ──────────────────────────────────────────────
router.post('/login', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(422).json({ detail: 'Email và mật khẩu không được để trống' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      res.status(401).json({ detail: 'Email hoặc mật khẩu không đúng' });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ detail: 'Email hoặc mật khẩu không đúng' });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ detail: 'Tài khoản đã bị khóa' });
      return;
    }
    const adminUser = await prisma.adminUser.findUnique({ where: { email } });
    const role = adminUser?.role || 'user';
    // Bảo trì: chỉ staff/admin được đăng nhập
    if (!isStaffRole(role)) {
      const maint = await getMaintenance();
      if (maint.on) {
        res.status(503).json({ detail: maint.message || MAINTENANCE_DEFAULT_MSG, maintenance: true });
        return;
      }
    }
    const token = signToken({ user_id: user.id, email: user.email, display_name: user.displayName, role });
    res.json({
      access_token: token,
      token, // alias cho frontend (auth-pages.js đọc data.token)
      token_type: 'bearer',
      user: { id: user.id, email: user.email, display_name: user.displayName, avatar_url: user.avatarUrl, balance: user.balance, role },
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Admin / Staff login (tách riêng khỏi login khách) ──
// Chỉ chấp nhận tài khoản có vai trò admin/superadmin/staff. User thường -> 403.
// Không bị chặn bởi chế độ bảo trì.
router.post('/admin/login', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(422).json({ detail: 'Email và mật khẩu không được để trống' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      res.status(401).json({ detail: 'Email hoặc mật khẩu không đúng' });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ detail: 'Email hoặc mật khẩu không đúng' });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ detail: 'Tài khoản đã bị khóa' });
      return;
    }
    const adminUser = await prisma.adminUser.findUnique({ where: { email } });
    const role = adminUser?.role || 'user';
    if (!isStaffRole(role)) {
      res.status(403).json({ detail: 'Tài khoản này không có quyền truy cập quản trị' });
      return;
    }
    const token = signToken({ user_id: user.id, email: user.email, display_name: user.displayName, role });
    res.json({
      access_token: token,
      token,
      token_type: 'bearer',
      user: { id: user.id, email: user.email, display_name: user.displayName, avatar_url: user.avatarUrl, balance: user.balance, role },
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Me ─────────────────────────────────────────────────
router.get('/me', requireUser, async (req: Request, res: Response) => {
  try {
    const payload = (req as any).user;
    const user = await prisma.user.findUnique({ where: { id: payload.user_id } });
    if (!user) { res.status(404).json({ detail: 'User not found' }); return; }
    const adminUser = await prisma.adminUser.findUnique({ where: { email: user.email } });
    res.json({
      id: user.id,
      email: user.email,
      display_name: user.displayName,
      avatar_url: user.avatarUrl,
      language: (user as any).language || 'vn',
      balance: user.balance,
      is_active: user.isActive,
      two_factor_enabled: !!user.twoFactorSecret,
      role: adminUser?.role || 'user',
      created_at: user.createdAt,
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Update profile ─────────────────────────────────────
router.patch('/me', requireUser, async (req: Request, res: Response) => {
  try {
    const payload = (req as any).user;
    const { display_name, avatar_url } = req.body;
    const user = await prisma.user.update({
      where: { id: payload.user_id },
      data: { ...(display_name && { displayName: display_name }), ...(avatar_url && { avatarUrl: avatar_url }) },
    });
    res.json({ id: user.id, email: user.email, display_name: user.displayName, avatar_url: user.avatarUrl });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Upload avatar ──────────────────────────────────────
// Nhận file ảnh, nén về ảnh vuông 256px (webp), lưu vào uploaded_images,
// cập nhật avatarUrl của user rồi trả về user mới.
router.post('/me/avatar', requireUser, uploadAvatar.single('file'), async (req: Request, res: Response) => {
  try {
    const payload = (req as any).user;
    const f = (req as any).file;
    if (!f || !f.buffer) { res.status(400).json({ detail: 'Thiếu file ảnh' }); return; }

    let data: Buffer = f.buffer;
    let mime = f.mimetype || 'image/jpeg';
    try {
      data = await sharp(f.buffer)
        .rotate()
        .resize(256, 256, { fit: 'cover', position: 'centre' })
        .webp({ quality: 82 })
        .toBuffer();
      mime = 'image/webp';
    } catch {
      data = f.buffer;
      mime = f.mimetype || 'image/jpeg';
    }

    const img = await prisma.uploadedImage.create({
      data: { filename: f.originalname || null, data, mimeType: mime },
    });
    const avatarUrl = `/api/images/${img.id}`;
    const user = await prisma.user.update({
      where: { id: payload.user_id },
      data: { avatarUrl },
    });
    res.status(201).json({ id: user.id, email: user.email, display_name: user.displayName, avatar_url: user.avatarUrl });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Change password ────────────────────────────────────
// Lưu ngôn ngữ ưa thích của user (cho đồng bộ đa thiết bị).
router.post('/language', requireUser, async (req: Request, res: Response) => {
  try {
    const payload = (req as any).user;
    const language = String(req.body?.language || '').slice(0, 10);
    if (!language) { res.status(400).json({ detail: 'Thiếu language' }); return; }
    await prisma.user.update({ where: { id: payload.user_id }, data: { language } as any });
    res.json({ language });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/change-password', requireUser, async (req: Request, res: Response) => {
  try {
    const payload = (req as any).user;
    const { current_password, new_password } = req.body;
    const user = await prisma.user.findUnique({ where: { id: payload.user_id } });
    if (!user || !user.passwordHash) { res.status(400).json({ detail: 'Không có mật khẩu' }); return; }
    const valid = await bcrypt.compare(current_password, user.passwordHash);
    if (!valid) { res.status(400).json({ detail: 'Mật khẩu hiện tại không đúng' }); return; }
    const hash = await bcrypt.hash(new_password, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── OAuth Config ───────────────────────────────────────
router.get('/config', async (_req: Request, res: Response) => {
  const configs = await prisma.siteConfig.findMany({
    where: { key: { in: ['google_client_id', 'github_client_id'] } },
  });
  const map = Object.fromEntries(configs.map((c: { key: string; value: string | null }) => [c.key, c.value || '']));
  res.json({
    google_enabled: !!(process.env.GOOGLE_CLIENT_ID || map['google_client_id']),
    discord_enabled: false,
    github_enabled: !!(map['github_client_id']),
    facebook_enabled: false,
    tiktok_enabled: false,
  });
});

// ── Google OAuth ───────────────────────────────────────
router.get('/google', (_req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) { res.status(503).json({ detail: 'Google OAuth not configured' }); return; }
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email+profile`;
  res.redirect(url);
});

router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

    const tokenResp = await axios.post('https://oauth2.googleapis.com/token', {
      code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code',
    });
    const { access_token } = tokenResp.data;
    const userResp = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const { email, name, picture } = userResp.data;

    let user = await prisma.user.findUnique({ where: { email } });
    // Bảo trì: chặn đăng ký/đăng nhập user thường qua OAuth (staff/admin vẫn được)
    const adminUser = await prisma.adminUser.findUnique({ where: { email } });
    const role = adminUser?.role || 'user';
    if (!isStaffRole(role)) {
      const maint = await getMaintenance();
      if (maint.on) { res.redirect(`${baseUrl}/login?error=maintenance`); return; }
    }
    if (!user) {
      user = await prisma.user.create({ data: { email, displayName: name, avatarUrl: picture, provider: 'google' } });
      notifyNewUser(user.id).catch(() => {});
    } else {
      user = await prisma.user.update({ where: { id: user.id }, data: { displayName: name, avatarUrl: picture } });
    }
    const token = signToken({ user_id: user.id, email: user.email, display_name: user.displayName, role });
    res.redirect(`${baseUrl}/auth-callback?token=${token}`);
  } catch (e: any) {
    res.redirect(`${process.env.APP_BASE_URL || ''}/login?error=oauth_failed`);
  }
});

// ── 2FA ────────────────────────────────────────────────
router.get('/2fa/setup', requireUser, async (req: Request, res: Response) => {
  try {
    const u = (req as any).user;
    const user = await prisma.user.findUnique({ where: { id: u.user_id } });
    if (!user) { res.status(404).json({ detail: 'User not found' }); return; }
    if (user.twoFactorSecret) { res.status(400).json({ detail: '2FA đã được bật' }); return; }

    const secret = otplib.generateSecret();
    const otpauth = otplib.generateURI({ strategy: 'totp', issuer: 'Sweet Premium Store', label: user.email, secret });
    const qrCode = await QRCode.toDataURL(otpauth);
    res.json({ secret, qr_code: qrCode });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/2fa/verify', requireUser, async (req: Request, res: Response) => {
  try {
    const u = (req as any).user;
    const { secret, code } = req.body;
    const result = await otplib.verify({ token: String(code), secret });
    if (!result?.valid) {
      res.status(400).json({ detail: 'Mã xác thực không chính xác' });
      return;
    }
    await prisma.user.update({ where: { id: u.user_id }, data: { twoFactorSecret: secret } });
    res.json({ ok: true, message: 'Xác thực 2 bước đã được bật' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/2fa/disable', requireUser, async (req: Request, res: Response) => {
  try {
    const u = (req as any).user;
    await prisma.user.update({ where: { id: u.user_id }, data: { twoFactorSecret: null } });
    res.json({ ok: true, message: 'Xác thực 2 bước đã bị tắt' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Forgot / Reset password ────────────────────────────
router.post('/forgot-password', authRateLimit, async (req: Request, res: Response) => {
  const generic = { ok: true, message: 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi.' };
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || !user.passwordHash) { res.json(generic); return; }

    // Token reset = JWT ngắn hạn (15 phút), ký kèm passwordHash để 1 lần dùng
    const token = jwt.sign(
      { uid: user.id, purpose: 'reset', v: (user.passwordHash || '').slice(-8) },
      JWT_SECRET, { expiresIn: '15m' }
    );

    // Lấy site_url
    const cfg = await prisma.siteConfig.findFirst({ where: { key: 'app_base_url' } });
    const siteUrl = (cfg?.value || process.env.APP_BASE_URL || '').replace(/\/$/, '');
    const link = `${siteUrl}/reset-password?token=${token}`;

    // Gửi email qua mail service (direct/relay theo domain)
    await sendMail({
      to: user.email,
      subject: 'Đặt lại mật khẩu - Sweet Premium Store',
      html: `<p>Bấm vào link sau để đặt lại mật khẩu (hết hạn sau 15 phút):</p><p><a href="${link}">${link}</a></p>`,
    });
    res.json(generic);
  } catch {
    res.json(generic); // không lộ lỗi để tránh enumeration
  }
});

router.post('/reset-password', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { token, new_password } = req.body;
    if (!new_password || new_password.length < 8) { res.status(400).json({ detail: 'Mật khẩu tối thiểu 8 ký tự' }); return; }

    let payload: any;
    try { payload = jwt.verify(token, JWT_SECRET); } catch { res.status(400).json({ detail: 'Link không hợp lệ hoặc đã hết hạn' }); return; }
    if (payload.purpose !== 'reset') { res.status(400).json({ detail: 'Token không hợp lệ' }); return; }

    const user = await prisma.user.findUnique({ where: { id: payload.uid } });
    if (!user || (user.passwordHash || '').slice(-8) !== payload.v) {
      res.status(400).json({ detail: 'Link đã hết hạn hoặc đã được sử dụng' });
      return;
    }
    const hash = await bcrypt.hash(new_password, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
    res.json({ ok: true, message: 'Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

// ── Make admin (with secret key) ───────────────────────
router.post('/make-admin', authRateLimit, async (req: Request, res: Response) => {
  const { email, secret } = req.body;
  const adminSecret = process.env.ADMIN_SECRET || '';
  // Fail-closed: chưa cấu hình ADMIN_SECRET thì không cho dùng
  if (!adminSecret || adminSecret.length < 16) {
    res.status(503).json({ detail: 'ADMIN_SECRET chưa được cấu hình (>=16 ký tự)' });
    return;
  }
  // So sánh hằng thời gian để chống dò (timing attack)
  const a = Buffer.from(String(secret || ''));
  const b = Buffer.from(adminSecret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(403).json({ detail: 'Invalid secret' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) { res.status(404).json({ detail: 'User not found' }); return; }
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (!existing) {
    await prisma.adminUser.create({ data: { userId: user.id.toString(), email, role: 'admin' } });
  }
  res.json({ message: `${email} is now admin` });
});

export default router;
