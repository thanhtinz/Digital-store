import nodemailer from 'nodemailer';
import { getSettings } from './settings';

// Sends transactional email via SMTP configured in Admin → Settings (or env).
// When SMTP is not configured, emails are logged to the server console so
// flows remain testable in development.
export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const s = await getSettings(['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'site_name']);
  if (!s.smtp_host) {
    console.log(`[mail:dev] To: ${to}\nSubject: ${subject}\n${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`);
    return false;
  }
  const transport = nodemailer.createTransport({
    host: s.smtp_host,
    port: Number(s.smtp_port) || 587,
    secure: Number(s.smtp_port) === 465,
    auth: s.smtp_user ? { user: s.smtp_user, pass: s.smtp_pass } : undefined,
  });
  await transport.sendMail({
    from: s.smtp_from || `${s.site_name} <no-reply@localhost>`,
    to,
    subject,
    html,
  });
  return true;
}

export function emailLayout(siteName: string, title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden">
      <tr><td style="background:#4f46e5;padding:20px 32px;color:#fff;font-size:20px;font-weight:bold">${siteName}</td></tr>
      <tr><td style="padding:32px">
        <h2 style="margin:0 0 16px;font-size:18px;color:#111">${title}</h2>
        <div style="font-size:14px;color:#444;line-height:1.6">${bodyHtml}</div>
      </td></tr>
      <tr><td style="padding:16px 32px;background:#fafafa;color:#999;font-size:12px">
        You are receiving this email because of activity on your ${siteName} account.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

export function buttonHtml(url: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${url}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;font-weight:bold">${label}</a></p>
  <p style="font-size:12px;color:#888">Or copy this link into your browser:<br>${url}</p>`;
}
