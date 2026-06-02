export interface JwtPayload {
  user_id: number;
  email: string;
  display_name?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface AdminPayload {
  user_id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface SepayWebhookPayload {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  subAccount?: string;
  code?: string;
  content: string;
  transferType: 'in' | 'out';
  description: string;
  transferAmount: number;
  referenceCode: string;
  accumulated: number;
}

export interface SepayConfig {
  apiKey: string;
  accountNumber: string;
  bankCode: string;
  webhookSecret: string;
  baseUrl: string;
}

export type OrderStatus = 'pending' | 'pending_payment' | 'paid' | 'processing' | 'completed' | 'cancelled';
export type PaymentMethod = 'sepay' | 'balance' | 'card';
