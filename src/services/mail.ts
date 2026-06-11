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
import axios from 'axios';
import { promises as dns } from 'dns';
import prisma from '../db';

// Các nguồn gửi mail hỗ trợ:
//  - direct  : server mail riêng (tự resolve MX + ký DKIM)
//  - relay   : SMTP bất kỳ (cPanel, Zoho, Gmail, mailcow...)
//  - resend / sendgrid / mailgun / postmark / brevo : dịch vụ bên thứ 3 (HTTP API)
export type MailMode = 'direct' | 'relay' | 'resend' | 'sendgrid' | 'mailgun' | 'postmark' | 'brevo';

export interface MailConfig {
  mode: MailMode;
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
  // nhà cung cấp bên thứ 3 (HTTP API)
  resendApiKey: string;
  sendgridApiKey: string;
  mailgunApiKey: string;
  mailgunDomain: string;
  mailgunRegion: string; // 'us' | 'eu'
  postmarkToken: string;
  brevoApiKey: string;
}

const MAIL_KEYS = [
  'mail_mode', 'mail_from_email', 'mail_from_name',
  'mail_smtp_host', 'mail_smtp_port', 'mail_smtp_user', 'mail_smtp_pass',
  'mail_dkim_domain', 'mail_dkim_selector', 'mail_dkim_private_key',
  'mail_resend_api_key', 'mail_sendgrid_api_key',
  'mail_mailgun_api_key', 'mail_mailgun_domain', 'mail_mailgun_region',
  'mail_postmark_token', 'mail_brevo_api_key',
];

export async function getMailConfig(): Promise<MailConfig> {
  const rows = await prisma.siteConfig.findMany({ where: { key: { in: MAIL_KEYS } } });
  const m: Record<string, string> = Object.fromEntries(rows.map((c: any) => [c.key, c.value || '']));
  return {
    mode: (m['mail_mode'] as MailMode) || 'relay',
    fromEmail: m['mail_from_email'] || process.env.MAIL_FROM_EMAIL || '',
    fromName: m['mail_from_name'] || 'Sweet Premium Store',
    smtpHost: m['mail_smtp_host'] || process.env.SMTP_SERVER || '',
    smtpPort: parseInt(m['mail_smtp_port'] || process.env.SMTP_PORT || '587', 10),
    smtpUser: m['mail_smtp_user'] || process.env.SMTP_USERNAME || '',
    smtpPass: m['mail_smtp_pass'] || process.env.SMTP_PASSWORD || '',
    dkimDomain: m['mail_dkim_domain'] || '',
    dkimSelector: m['mail_dkim_selector'] || 'default',
    dkimPrivateKey: m['mail_dkim_private_key'] || '',
    resendApiKey: m['mail_resend_api_key'] || process.env.RESEND_API_KEY || '',
    sendgridApiKey: m['mail_sendgrid_api_key'] || process.env.SENDGRID_API_KEY || '',
    mailgunApiKey: m['mail_mailgun_api_key'] || process.env.MAILGUN_API_KEY || '',
    mailgunDomain: m['mail_mailgun_domain'] || process.env.MAILGUN_DOMAIN || '',
    mailgunRegion: m['mail_mailgun_region'] || 'us',
    postmarkToken: m['mail_postmark_token'] || process.env.POSTMARK_TOKEN || '',
    brevoApiKey: m['mail_brevo_api_key'] || process.env.BREVO_API_KEY || '',
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

// ── Nhà cung cấp bên thứ 3 (HTTP API) ──────────────────────
// Mỗi hàm gửi 1 email và ném lỗi nếu thất bại (sendMail bắt và trả error).

async function sendViaResend(cfg: MailConfig, input: SendMailInput) {
  if (!cfg.resendApiKey) throw new Error('Chưa cấu hình Resend API key');
  await axios.post(
    'https://api.resend.com/emails',
    { from: `${cfg.fromName} <${cfg.fromEmail}>`, to: [input.to], subject: input.subject, html: input.html, text: input.text },
    { headers: { Authorization: `Bearer ${cfg.resendApiKey}` } }
  );
}

async function sendViaSendgrid(cfg: MailConfig, input: SendMailInput) {
  if (!cfg.sendgridApiKey) throw new Error('Chưa cấu hình SendGrid API key');
  const content = [
    ...(input.text ? [{ type: 'text/plain', value: input.text }] : []),
    ...(input.html ? [{ type: 'text/html', value: input.html }] : []),
  ];
  await axios.post(
    'https://api.sendgrid.com/v3/mail/send',
    {
      personalizations: [{ to: [{ email: input.to }] }],
      from: { email: cfg.fromEmail, name: cfg.fromName },
      subject: input.subject,
      content: content.length ? content : [{ type: 'text/plain', value: ' ' }],
    },
    { headers: { Authorization: `Bearer ${cfg.sendgridApiKey}` } }
  );
}

async function sendViaMailgun(cfg: MailConfig, input: SendMailInput) {
  if (!cfg.mailgunApiKey || !cfg.mailgunDomain) throw new Error('Chưa cấu hình Mailgun API key/domain');
  const base = cfg.mailgunRegion === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net';
  const params = new URLSearchParams();
  params.append('from', `${cfg.fromName} <${cfg.fromEmail}>`);
  params.append('to', input.to);
  params.append('subject', input.subject);
  if (input.html) params.append('html', input.html);
  if (input.text) params.append('text', input.text);
  await axios.post(`${base}/v3/${cfg.mailgunDomain}/messages`, params, {
    auth: { username: 'api', password: cfg.mailgunApiKey },
  });
}

async function sendViaPostmark(cfg: MailConfig, input: SendMailInput) {
  if (!cfg.postmarkToken) throw new Error('Chưa cấu hình Postmark token');
  await axios.post(
    'https://api.postmarkapp.com/email',
    {
      From: `${cfg.fromName} <${cfg.fromEmail}>`,
      To: input.to,
      Subject: input.subject,
      HtmlBody: input.html,
      TextBody: input.text,
      MessageStream: 'outbound',
    },
    { headers: { 'X-Postmark-Server-Token': cfg.postmarkToken, Accept: 'application/json' } }
  );
}

async function sendViaBrevo(cfg: MailConfig, input: SendMailInput) {
  if (!cfg.brevoApiKey) throw new Error('Chưa cấu hình Brevo API key');
  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: { email: cfg.fromEmail, name: cfg.fromName },
      to: [{ email: input.to }],
      subject: input.subject,
      htmlContent: input.html || input.text || ' ',
      textContent: input.text,
    },
    { headers: { 'api-key': cfg.brevoApiKey } }
  );
}

const API_PROVIDERS: Record<string, (cfg: MailConfig, input: SendMailInput) => Promise<void>> = {
  resend: sendViaResend,
  sendgrid: sendViaSendgrid,
  mailgun: sendViaMailgun,
  postmark: sendViaPostmark,
  brevo: sendViaBrevo,
};

/** Gửi 1 email — tự chọn nguồn gửi theo cấu hình */
export async function sendMail(input: SendMailInput): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getMailConfig();
  if (!cfg.fromEmail) return { ok: false, error: 'Chưa cấu hình email gửi (from)' };

  const from = `"${cfg.fromName}" <${cfg.fromEmail}>`;
  const message = { from, to: input.to, subject: input.subject, html: input.html, text: input.text };

  try {
    // Nhà cung cấp bên thứ 3 qua HTTP API
    const apiSend = API_PROVIDERS[cfg.mode];
    if (apiSend) {
      await apiSend(cfg, input);
      return { ok: true };
    }

    if (cfg.mode === 'direct') {
      const recipientDomain = input.to.split('@')[1];
      if (!recipientDomain) return { ok: false, error: 'Email người nhận không hợp lệ' };
      const mx = await resolveMx(recipientDomain);
      if (!mx) return { ok: false, error: `Không tìm thấy MX cho ${recipientDomain}` };
      const transport = directTransport(mx, cfg);
      await transport.sendMail(message);
      return { ok: true };
    }

    // Mặc định: relay (SMTP)
    if (!cfg.smtpHost) return { ok: false, error: 'Chưa cấu hình SMTP host (relay)' };
    const transport = relayTransport(cfg);
    await transport.sendMail(message);
    return { ok: true };
  } catch (e: any) {
    // Lỗi từ axios (API provider) thường có response.data
    const apiErr = e?.response?.data;
    const detail = apiErr ? (typeof apiErr === 'string' ? apiErr : JSON.stringify(apiErr)) : e.message;
    return { ok: false, error: detail };
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
