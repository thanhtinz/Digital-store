/**
 * SePay Payment Service
 * Tích hợp cổng thanh toán SePay (thay thế PayOS)
 *
 * Docs: https://docs.sepay.vn
 * SePay sử dụng phương thức chuyển khoản ngân hàng + QR code VietQR
 */

import crypto from 'crypto';
import axios from 'axios';
import prisma from '../db';

const SEPAY_API_BASE = 'https://my.sepay.vn/userapi';

export interface SepayConfig {
  apiKey: string;
  accountNumber: string;
  bankCode: string;
  webhookSecret: string;
}

export function getSepayConfig(): SepayConfig {
  return {
    apiKey: process.env.SEPAY_API_KEY || '',
    accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || '',
    bankCode: process.env.SEPAY_BANK_CODE || '',
    webhookSecret: process.env.SEPAY_WEBHOOK_SECRET || '',
  };
}

/**
 * Lấy config SePay từ DB (fallback từ env)
 */
export async function getSepayConfigFromDb(): Promise<SepayConfig> {
  const base = getSepayConfig();
  try {
    const configs = await prisma.siteConfig.findMany({
      where: {
        key: { in: ['sepay_api_key', 'sepay_account_number', 'sepay_bank_code', 'sepay_webhook_secret'] },
      },
    });
    const map = Object.fromEntries(configs.map((c: { key: string; value: string | null }) => [c.key, c.value || '']));
    return {
      apiKey: base.apiKey || map['sepay_api_key'] || '',
      accountNumber: base.accountNumber || map['sepay_account_number'] || '',
      bankCode: base.bankCode || map['sepay_bank_code'] || '',
      webhookSecret: base.webhookSecret || map['sepay_webhook_secret'] || '',
    };
  } catch {
    return base;
  }
}

/**
 * Tạo nội dung chuyển khoản (transfer content) cho đơn hàng
 * Format: ORDXXXXXX (chỉ chữ và số, tối đa 25 ký tự)
 */
export function buildTransferContent(orderCode: string): string {
  return `ORD${orderCode}`.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 25);
}

/**
 * Tạo QR code URL dùng VietQR API
 * Docs: https://vietqr.io/danh-sach-api/
 */
export function buildVietQrUrl(params: {
  bankCode: string;
  accountNumber: string;
  amount: number;
  content: string;
  accountName?: string;
}): string {
  const { bankCode, accountNumber, amount, content, accountName } = params;
  // VietQR format: https://img.vietqr.io/image/{bankCode}-{accountNumber}-{template}.png?amount=...&addInfo=...
  const template = 'compact2';
  const url = new URL(
    `https://img.vietqr.io/image/${bankCode}-${accountNumber}-${template}.png`
  );
  url.searchParams.set('amount', amount.toString());
  url.searchParams.set('addInfo', content);
  if (accountName) url.searchParams.set('accountName', accountName);
  return url.toString();
}

export interface SepayPaymentInfo {
  orderCode: string;
  transferContent: string;
  accountNumber: string;
  bankCode: string;
  amount: number;
  qrCodeUrl: string;
  status: string;
  expiredAt: string;
}

/**
 * Tạo thông tin thanh toán SePay cho đơn hàng
 */
export async function createSepayPayment(
  orderId: number,
  amount: number,
  orderCode: string
): Promise<SepayPaymentInfo> {
  const cfg = await getSepayConfigFromDb();
  const transferContent = buildTransferContent(orderCode);
  const expiredAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const qrCodeUrl = buildVietQrUrl({
    bankCode: cfg.bankCode,
    accountNumber: cfg.accountNumber,
    amount,
    content: transferContent,
    accountName: 'CONG TY / CHU TK',
  });

  // Lưu payment_link_id = transferContent để sau này match webhook
  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentLinkId: transferContent,
      status: 'pending_payment',
      paymentMethod: 'sepay',
    },
  });

  return {
    orderCode,
    transferContent,
    accountNumber: cfg.accountNumber,
    bankCode: cfg.bankCode,
    amount,
    qrCodeUrl,
    status: 'pending_payment',
    expiredAt,
  };
}

/**
 * Kiểm tra trạng thái giao dịch từ SePay API
 * Tra cứu theo nội dung chuyển khoản
 */
export async function checkSepayTransaction(transferContent: string): Promise<boolean> {
  const cfg = await getSepayConfigFromDb();
  if (!cfg.apiKey) return false;

  try {
    const resp = await axios.get(`${SEPAY_API_BASE}/transactions/list`, {
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
      params: {
        account_number: cfg.accountNumber,
        transaction_content: transferContent,
        limit: 1,
      },
    });

    const transactions = resp.data?.transactions || [];
    return transactions.some(
      (tx: any) =>
        tx.transaction_content?.includes(transferContent) &&
        tx.transfer_type === 'in'
    );
  } catch {
    return false;
  }
}

/**
 * Verify chữ ký webhook từ SePay
 */
export function verifySepayWebhook(
  body: Record<string, any>,
  signature: string,
  secret: string
): boolean {
  if (!secret || !signature) return false; // Fail-closed: thiếu secret/chữ ký = không hợp lệ
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(body));
  const expected = hmac.digest('hex');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  // timingSafeEqual ném lỗi nếu khác độ dài → so sánh độ dài trước
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

/**
 * Parse nội dung từ SePay webhook để tìm đơn hàng
 * SePay gửi toàn bộ nội dung transfer trong field `content`
 */
export function extractOrderCodeFromContent(content: string): string | null {
  if (!content) return null;
  // Pattern: ORD<orderCode> hoặc chứa orderCode
  const match = content.match(/ORD([A-Z0-9]+)/i);
  return match ? match[1] : null;
}

/**
 * Test kết nối SePay API
 */
export async function testSepayConnection(apiKey: string, accountNumber: string): Promise<boolean> {
  try {
    const resp = await axios.get(`${SEPAY_API_BASE}/bank_accounts/list`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const accounts = resp.data?.bankAccounts || [];
    return accounts.some((a: any) => a.account_number === accountNumber);
  } catch {
    return false;
  }
}
