/**
 * Mail Service — gửi email theo domain, không cần thuê bên thứ 3.
 *
 * Hai chế độ (cấu hình trong admin):
 *   1. 'direct'  — App tự resolve MX của domain người nhận và gửi thẳng,
 *                  ký DKIM bằng private key của domain bạn. Không cần SMTP ngoài.
 *                  Yêu cầu: server mở port 25 outbound, có PTR/reverse DNS,
 *                  DNS domain có SPF + DKIM + DMARC (xem hướng dẫn trong admin).
 *   2. 'relay'   — Gửi qua một SMTP server (cPanel, mailcow, Zoho, Gmail...).
 *
 * Tất cả email hệ thống (đơn hàng, reset mật khẩu, thông báo) đi qua sendMail().
 */

import nodemailer, { Transporter } from 'nodemailer';
import { promises as dns } from 'dns';
import prisma from '../db';

export interface MailConfig {
  mode: 'direct' | 'relay';
  fromEmail: string;
  fromName: string;
  // relay
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  // direct + DKIM
  dkimDomain: string;
  dkimSelector: string;
  dkimPrivateKey: string;
}

const MAIL_KEYS = [
  'mail_mode', 'mail_from_email', 'mail_from_name',
  'mail_smtp_host', 'mail_smtp_port', 'mail_smtp_user', 'mail_smtp_pass',
  'mail_dkim_domain', 'mail_dkim_selector', 'mail_dkim_private_key',
];

export async function getMailConfig(): Promise<MailConfig> {
  const rows = await prisma.siteConfig.findMany({ where: { key: { in: MAIL_KEYS } } });
  const m: Record<string, string> = Object.fromEntries(rows.map((c: any) => [c.key, c.value || '']));
  return {
    mode: (m['mail_mode'] as 'direct' | 'relay') || 'relay',
    fromEmail: m['mail_from_email'] || process.env.MAIL_FROM_EMAIL || '',
    fromName: m['mail_from_name'] || 'Sweet Premium Store',
    smtpHost: m['mail_smtp_host'] || process.env.SMTP_SERVER || '',
    smtpPort: parseInt(m['mail_smtp_port'] || process.env.SMTP_PORT || '587', 10),
    smtpUser: m['mail_smtp_user'] || process.env.SMTP_USERNAME || '',
    smtpPass: m['mail_smtp_pass'] || process.env.SMTP_PASSWORD || '',
    dkimDomain: m['mail_dkim_domain'] || '',
    dkimSelector: m['mail_dkim_selector'] || 'default',
    dkimPrivateKey: m['mail_dkim_private_key'] || '',
  };
}

function buildDkim(cfg: MailConfig) {
  if (cfg.dkimDomain && cfg.dkimPrivateKey) {
    return {
      domainName: cfg.dkimDomain,
      keySelector: cfg.dkimSelector || 'default',
      privateKey: cfg.dkimPrivateKey,
    };
  }
  return undefined;
}

/** Transport cho chế độ relay (SMTP ngoài) */
function relayTransport(cfg: MailConfig): Transporter {
  return nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure: cfg.smtpPort === 465,
    auth: cfg.smtpUser ? { user: cfg.smtpUser, pass: cfg.smtpPass } : undefined,
    ...(buildDkim(cfg) ? { dkim: buildDkim(cfg) } : {}),
  } as any);
}

/** Resolve MX server của domain người nhận (cho chế độ direct) */
async function resolveMx(domain: string): Promise<string | null> {
  try {
    const records = await dns.resolveMx(domain);
    if (!records.length) return null;
    records.sort((a, b) => a.priority - b.priority);
    return records[0].exchange;
  } catch {
    return null;
  }
}

/** Transport cho chế độ direct — gửi thẳng tới MX của người nhận */
function directTransport(mxHost: string, cfg: MailConfig): Transporter {
  return nodemailer.createTransport({
    host: mxHost,
    port: 25,
    secure: false,
    requireTLS: false,
    tls: { rejectUnauthorized: false }, // nhiều MX dùng self-signed
    name: cfg.dkimDomain || cfg.fromEmail.split('@')[1] || undefined, // EHLO hostname
    ...(buildDkim(cfg) ? { dkim: buildDkim(cfg) } : {}),
  } as any);
}

export interface SendMailInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

/** Gửi 1 email — tự chọn chế độ theo cấu hình */
export async function sendMail(input: SendMailInput): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getMailConfig();
  if (!cfg.fromEmail) return { ok: false, error: 'Chưa cấu hình email gửi (from)' };

  const from = `"${cfg.fromName}" <${cfg.fromEmail}>`;
  const message = { from, to: input.to, subject: input.subject, html: input.html, text: input.text };

  try {
    if (cfg.mode === 'direct') {
      const recipientDomain = input.to.split('@')[1];
      if (!recipientDomain) return { ok: false, error: 'Email người nhận không hợp lệ' };
      const mx = await resolveMx(recipientDomain);
      if (!mx) return { ok: false, error: `Không tìm thấy MX cho ${recipientDomain}` };
      const transport = directTransport(mx, cfg);
      await transport.sendMail(message);
      return { ok: true };
    } else {
      if (!cfg.smtpHost) return { ok: false, error: 'Chưa cấu hình SMTP host (relay)' };
      const transport = relayTransport(cfg);
      await transport.sendMail(message);
      return { ok: true };
    }
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

/** Test cấu hình mail — gửi 1 email test */
export async function sendTestMail(to: string): Promise<{ ok: boolean; error?: string }> {
  return sendMail({
    to,
    subject: 'Email test — Sweet Premium Store',
    html: '<p>Đây là email test. Nếu bạn nhận được, hệ thống mail của bạn đã hoạt động. ✅</p>',
    text: 'Email test. Nếu bạn nhận được, hệ thống mail đã hoạt động.',
  });
}

/**
 * Sinh cặp khóa DKIM (RSA 2048) để admin tạo nhanh.
 * Trả về private key (lưu vào config) + chuỗi DNS TXT để dán vào DNS.
 */
export async function generateDkimKeyPair(selector: string, domain: string): Promise<{
  privateKey: string;
  dnsRecordName: string;
  dnsRecordValue: string;
}> {
  const { generateKeyPairSync } = await import('crypto');
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  // Lấy phần base64 của public key (bỏ header/footer PEM) cho bản ghi DNS
  const pubB64 = publicKey
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');
  return {
    privateKey,
    dnsRecordName: `${selector}._domainkey.${domain}`,
    dnsRecordValue: `v=DKIM1; k=rsa; p=${pubB64}`,
  };
}

/** Gợi ý các bản ghi DNS cần thiết cho chế độ direct */
export function getDnsGuide(domain: string, selector: string, serverIp?: string): Array<{ type: string; name: string; value: string; note: string }> {
  return [
    {
      type: 'TXT (SPF)',
      name: domain,
      value: serverIp ? `v=spf1 ip4:${serverIp} ~all` : 'v=spf1 a mx ~all',
      note: 'Cho phép server của bạn gửi mail thay mặt domain',
    },
    {
      type: 'TXT (DKIM)',
      name: `${selector}._domainkey.${domain}`,
      value: 'v=DKIM1; k=rsa; p=<public key — bấm "Tạo khóa DKIM">',
      note: 'Chữ ký xác thực email. Dùng nút tạo khóa để sinh tự động',
    },
    {
      type: 'TXT (DMARC)',
      name: `_dmarc.${domain}`,
      value: `v=DMARC1; p=quarantine; rua=mailto:postmaster@${domain}`,
      note: 'Chính sách xử lý mail giả mạo',
    },
    {
      type: 'PTR (Reverse DNS)',
      name: serverIp || '<IP server>',
      value: `mail.${domain}`,
      note: 'Cấu hình tại nhà cung cấp VPS — bắt buộc để không bị đánh spam',
    },
    {
      type: 'A',
      name: `mail.${domain}`,
      value: serverIp || '<IP server>',
      note: 'Trỏ hostname mail về IP server',
    },
  ];
}
