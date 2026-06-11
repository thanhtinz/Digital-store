/**
 * Mail Configuration Routes (admin)
 *  - GET  /admin/mail/config       → cấu hình hiện tại
 *  - PUT  /admin/mail/config       → lưu cấu hình
 *  - POST /admin/mail/dkim         → sinh cặp khóa DKIM
 *  - GET  /admin/mail/dns-guide    → bản ghi DNS cần thiết
 *  - POST /admin/mail/test         → gửi mail test
 */

import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAdmin } from '../middleware/auth';
import { getMailConfig, sendTestMail, generateDkimKeyPair, getDnsGuide } from '../services/mail';

const router = Router();

const MAIL_KEYS = [
  'mail_mode', 'mail_from_email', 'mail_from_name',
  'mail_smtp_host', 'mail_smtp_port', 'mail_smtp_user', 'mail_smtp_pass',
  'mail_dkim_domain', 'mail_dkim_selector', 'mail_dkim_private_key',
  'mail_resend_api_key', 'mail_sendgrid_api_key',
  'mail_mailgun_api_key', 'mail_mailgun_domain', 'mail_mailgun_region',
  'mail_postmark_token', 'mail_brevo_api_key',
];

// Các key bí mật: GET trả placeholder, PUT bỏ qua nếu vẫn là placeholder.
const SECRET_KEYS = [
  'mail_smtp_pass', 'mail_dkim_private_key',
  'mail_resend_api_key', 'mail_sendgrid_api_key', 'mail_mailgun_api_key',
  'mail_postmark_token', 'mail_brevo_api_key',
];

router.get('/config', requireAdmin, async (_req: Request, res: Response) => {
  const rows = await prisma.siteConfig.findMany({ where: { key: { in: MAIL_KEYS } } });
  const m: Record<string, string> = Object.fromEntries(rows.map((c: any) => [c.key, c.value || '']));
  const mask = (k: string) => (m[k] ? '••••••••' : '');
  res.json({
    mail_mode: m['mail_mode'] || 'relay',
    mail_from_email: m['mail_from_email'] || '',
    mail_from_name: m['mail_from_name'] || 'Sweet Premium Store',
    mail_smtp_host: m['mail_smtp_host'] || '',
    mail_smtp_port: m['mail_smtp_port'] || '587',
    mail_smtp_user: m['mail_smtp_user'] || '',
    mail_smtp_pass: mask('mail_smtp_pass'),
    mail_dkim_domain: m['mail_dkim_domain'] || '',
    mail_dkim_selector: m['mail_dkim_selector'] || 'default',
    mail_dkim_private_key_set: !!m['mail_dkim_private_key'],
    // Nhà cung cấp bên thứ 3 (secret -> mask)
    mail_resend_api_key: mask('mail_resend_api_key'),
    mail_sendgrid_api_key: mask('mail_sendgrid_api_key'),
    mail_mailgun_api_key: mask('mail_mailgun_api_key'),
    mail_mailgun_domain: m['mail_mailgun_domain'] || '',
    mail_mailgun_region: m['mail_mailgun_region'] || 'us',
    mail_postmark_token: mask('mail_postmark_token'),
    mail_brevo_api_key: mask('mail_brevo_api_key'),
  });
});

router.put('/config', requireAdmin, async (req: Request, res: Response) => {
  try {
    const b = req.body as Record<string, string>;
    const updates: Array<{ key: string; value: string }> = [];
    for (const key of MAIL_KEYS) {
      if (b[key] === undefined) continue;
      // Bỏ qua secret nếu là placeholder
      if (SECRET_KEYS.includes(key) && (b[key] === '' || b[key] === '••••••••')) continue;
      updates.push({ key, value: b[key] });
    }
    await Promise.all(
      updates.map((u) =>
        prisma.siteConfig.upsert({ where: { key: u.key }, update: { value: u.value }, create: { key: u.key, value: u.value } })
      )
    );
    res.json({ message: 'Đã lưu cấu hình mail' });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Sinh cặp khóa DKIM — tự lưu private key, trả DNS record để dán */
router.post('/dkim', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { domain, selector } = req.body;
    if (!domain) { res.status(400).json({ detail: 'Thiếu domain' }); return; }
    const sel = selector || 'default';
    const result = await generateDkimKeyPair(sel, domain);

    // Lưu private key + selector + domain vào config
    await Promise.all([
      prisma.siteConfig.upsert({ where: { key: 'mail_dkim_private_key' }, update: { value: result.privateKey }, create: { key: 'mail_dkim_private_key', value: result.privateKey } }),
      prisma.siteConfig.upsert({ where: { key: 'mail_dkim_selector' }, update: { value: sel }, create: { key: 'mail_dkim_selector', value: sel } }),
      prisma.siteConfig.upsert({ where: { key: 'mail_dkim_domain' }, update: { value: domain }, create: { key: 'mail_dkim_domain', value: domain } }),
    ]);

    res.json({
      message: 'Đã tạo khóa DKIM và lưu private key',
      dns_record_name: result.dnsRecordName,
      dns_record_value: result.dnsRecordValue,
    });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Bản ghi DNS cần thiết cho chế độ direct */
router.get('/dns-guide', requireAdmin, async (req: Request, res: Response) => {
  const cfg = await getMailConfig();
  const domain = (req.query.domain as string) || cfg.dkimDomain || (cfg.fromEmail.split('@')[1] || 'yourdomain.com');
  const selector = cfg.dkimSelector || 'default';
  const serverIp = (req.query.ip as string) || process.env.SERVER_IP || undefined;
  res.json({ domain, selector, records: getDnsGuide(domain, selector, serverIp) });
});

/** Gửi mail test */
router.post('/test', requireAdmin, async (req: Request, res: Response) => {
  const to = req.body.to_email || (req as any).user?.email;
  if (!to) { res.status(422).json({ detail: 'Thiếu email nhận' }); return; }
  const result = await sendTestMail(to);
  if (result.ok) res.json({ message: `Đã gửi mail test tới ${to}` });
  else res.status(400).json({ detail: result.error || 'Gửi thất bại' });
});

export default router;
