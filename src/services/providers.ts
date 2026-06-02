/**
 * API Provider Adapters
 * Kết nối tới nhà cung cấp bên ngoài (SMM panel, account premium, giftcard...)
 *
 * Hiện hỗ trợ: SMM Panel (giao thức v2 chuẩn — smmresell/perfectpanel style)
 */

import axios from 'axios';

const TIMEOUT = 15000;

export interface ProviderOrderResult {
  orderId: string;
  status: string;
  message?: string;
  deliveryData?: string;
}

export interface ProviderBalance {
  amount: number;
  currency: string;
  formatted: string;
}

export interface SmmServiceRemote {
  service: string | number;
  name: string;
  type?: string;
  category?: string;
  rate: string | number;
  min: string | number;
  max: string | number;
  refill?: boolean;
  cancel?: boolean;
  dripfeed?: boolean;
}

/**
 * SMM Panel API adapter (v2)
 * Auth: API Key gửi trong body POST
 */
export class SmmPanelProvider {
  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {}

  private url(): string {
    const base = this.baseUrl.replace(/\/+$/, '');
    if (base.endsWith('/api/v2')) return base;
    return `${base}/api/v2`;
  }

  private async post(action: string, params: Record<string, any> = {}): Promise<any> {
    const payload = new URLSearchParams({ key: this.apiKey, action, ...stringifyParams(params) });
    const resp = await axios.post(this.url(), payload.toString(), {
      timeout: TIMEOUT,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return resp.data;
  }

  /** Test kết nối — trả về balance */
  async testConnection(): Promise<{ balance: number; currency: string }> {
    const data = await this.post('balance');
    if (data?.error) throw new Error(data.error);
    return { balance: parseFloat(data.balance ?? 0), currency: data.currency || 'USD' };
  }

  async getBalance(): Promise<ProviderBalance> {
    const data = await this.post('balance');
    if (data?.error) throw new Error(data.error);
    const amount = parseFloat(data.balance ?? 0);
    const currency = data.currency || 'USD';
    return { amount, currency, formatted: `${amount} ${currency}` };
  }

  /** Lấy toàn bộ dịch vụ từ panel */
  async getServices(): Promise<SmmServiceRemote[]> {
    const data = await this.post('services');
    if (data && !Array.isArray(data) && data.error) throw new Error(data.error);
    return Array.isArray(data) ? data : [];
  }

  /** Tạo đơn hàng — plan_id = service_id của panel */
  async createOrder(serviceId: string, link: string, quantity: number, extras: Record<string, any> = {}): Promise<ProviderOrderResult> {
    try {
      const params: Record<string, any> = { service: serviceId, link, quantity };
      // Bổ sung tham số đặc thù theo loại dịch vụ
      if (extras.comments) params.comments = extras.comments;
      if (extras.hashtags) params.hashtags = extras.hashtags;
      if (extras.keywords) params.keywords = extras.keywords;
      if (extras.username) params.username = extras.username;
      if (extras.runs) params.runs = extras.runs;
      if (extras.interval) params.interval = extras.interval;

      const data = await this.post('add', params);
      if (data?.error) return { orderId: '', status: 'failed', message: data.error };
      return { orderId: String(data.order || ''), status: 'pending', message: 'Order added' };
    } catch (e: any) {
      return { orderId: '', status: 'failed', message: e.message };
    }
  }

  /** Tra cứu trạng thái đơn */
  async getOrderStatus(orderId: string): Promise<ProviderOrderResult> {
    try {
      const data = await this.post('status', { order: orderId });
      if (data?.error) return { orderId, status: 'unknown', message: data.error };

      const raw = String(data.status || '').toLowerCase();
      let status = 'pending';
      if (raw === 'completed') status = 'completed';
      else if (raw === 'processing' || raw === 'in progress') status = 'processing';
      else if (raw === 'partial') status = 'partial';
      else if (raw === 'canceled' || raw === 'cancelled') status = 'canceled';

      return {
        orderId,
        status,
        deliveryData: JSON.stringify({
          start_count: data.start_count,
          remains: data.remains,
          charge: data.charge,
          currency: data.currency,
          raw_status: data.status,
        }),
        message: `start_count: ${data.start_count ?? 0}, remains: ${data.remains ?? 0}`,
      };
    } catch (e: any) {
      return { orderId, status: 'unknown', message: e.message };
    }
  }

  async createRefill(orderId: string): Promise<any> {
    return this.post('refill', { order: orderId });
  }

  async getRefillStatus(refillId: string): Promise<any> {
    return this.post('refill_status', { refill: refillId });
  }
}

function stringifyParams(params: Record<string, any>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) out[k] = String(v);
  }
  return out;
}

/**
 * Factory — tạo adapter theo provider type
 */
export function getProvider(provider: { providerType: string; baseUrl: string; apiKey: string }) {
  switch (provider.providerType) {
    case 'smm_panel':
      return new SmmPanelProvider(provider.baseUrl, provider.apiKey);
    default:
      throw new Error(`Unsupported provider type: ${provider.providerType}`);
  }
}
