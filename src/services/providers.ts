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

// ────────────────────────────────────────────────────
// Topup Game (Shoperis style) — base {url}/api/public, auth x-api-key
// ────────────────────────────────────────────────────

export interface RemotePlan {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  in_stock: boolean;
  fields?: RemoteFormField[]; // premium: field theo từng plan
}
export interface RemoteProduct {
  id: string;
  name: string;
  slug: string;
  image: string;
  plans: RemotePlan[];
}
export interface RemoteFormField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
}

export class TopupGameProvider {
  constructor(private baseUrl: string, private apiKey: string) {}

  private headers() {
    return { 'x-api-key': this.apiKey, Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' };
  }
  private url(path: string) {
    return `${this.baseUrl.replace(/\/$/, '')}/api/public${path}`;
  }
  private async get(path: string, params?: Record<string, any>) {
    const r = await axios.get(this.url(path), { headers: this.headers(), params, timeout: TIMEOUT });
    return r.data;
  }

  async getBalance(): Promise<ProviderBalance> {
    const data = await this.get('/balance');
    const bal = data?.data || data || {};
    return { amount: Number(bal.balance || 0), currency: bal.currency || 'VND', formatted: bal.formatted || '' };
  }

  /** Map categories → RemoteProduct, products bên trong → plans. */
  async getProducts(categoryId?: string): Promise<RemoteProduct[]> {
    const data = await this.get('/categories');
    let categories = data?.data || data || [];
    if (!Array.isArray(categories)) categories = categories.categories || [];
    if (categoryId) categories = categories.filter((c: any) => String(c.id) === String(categoryId));
    return categories.map((cat: any) => ({
      id: String(cat.id ?? ''),
      name: cat.name || '',
      slug: cat.slug || '',
      image: cat.image || '',
      plans: (cat.products || []).map((p: any) => ({
        id: String(p.id ?? ''),
        name: p.name || '',
        price: Number(p.price || 0),
        sale_price: p.salePrice != null ? Number(p.salePrice) : null,
        in_stock: Number(p.availableCount || 0) > 0,
      })),
    }));
  }

  /** formFields của 1 category (product_id = category id). */
  async getFormFields(productId: string): Promise<RemoteFormField[]> {
    try {
      const data = await this.get(`/categories/${productId}`);
      const cat = data?.data || data || {};
      return (cat.formFields || []).map((f: any) => ({
        key: f.key || '',
        label: f.label || '',
        type: f.type === 'SELECT' ? 'select' : 'text',
        required: f.isRequired !== false,
        options: (f.options || []).map((o: any) => o.label || o.value || ''),
      }));
    } catch {
      return [];
    }
  }
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

/** Adapter cho nguồn topup_game (browse sản phẩm để map khi tạo gói API). */
export function getTopupProvider(provider: { baseUrl: string; apiKey: string }) {
  return new TopupGameProvider(provider.baseUrl, provider.apiKey);
}

// ──────────────────────────────────────────────────────────────
// Account Premium (ShopKey / CMSNT): X-API-Key + X-API-Secret, base {domain}/api/v1
// Port từ src Python api/providers/account_premium.py
// ──────────────────────────────────────────────────────────────
export class AccountPremiumProvider {
  constructor(private baseUrl: string, private apiKey: string, private apiSecret?: string | null) {}

  private headers() {
    const h: Record<string, string> = { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' };
    if (this.apiSecret) h['X-API-Secret'] = this.apiSecret;
    return h;
  }
  private url(path: string) {
    return `${this.baseUrl.replace(/\/$/, '')}/api/v1${path}`;
  }
  private async get(path: string, params?: Record<string, any>) {
    const r = await axios.get(this.url(path), { headers: this.headers(), params, timeout: TIMEOUT });
    const data = r.data || {};
    if (data.success === false) throw new Error(data.message || 'API error');
    return data.data ?? data;
  }

  async getBalance(): Promise<ProviderBalance> {
    const data = await this.get('/account/balance');
    const bal = data.balance ?? data;
    return {
      amount: Number(bal.current ?? bal.balance ?? 0),
      currency: bal.currency || 'VND',
      formatted: bal.formatted || '',
    };
  }

  /** Lấy toàn bộ sản phẩm (phân trang), mỗi sản phẩm kèm plans + fields. */
  async getProducts(productId?: string): Promise<RemoteProduct[]> {
    const out: RemoteProduct[] = [];
    let page = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const data = await this.get('/products/list', { page, limit: 100 });
      const products = data.products || [];
      for (const p of products) {
        out.push({
          id: String(p.id ?? ''),
          name: p.name || '',
          slug: p.slug || '',
          image: p.image || '',
          plans: (p.plans || []).map((pl: any) => ({
            id: String(pl.id ?? ''),
            name: pl.name || '',
            price: Number(pl.final_price ?? pl.price ?? 0),
            sale_price: pl.sale_price != null ? Number(pl.sale_price) : null,
            in_stock: pl.in_stock !== false,
            fields: (pl.fields || []).map((f: any) => ({
              key: f.key || f.field_name || '',
              label: f.label || f.field_name || '',
              type: f.type === 'SELECT' ? 'select' : f.type || 'text',
              required: f.required !== false,
              options: (f.options || []).map((o: any) => o.label || o.value || o),
            })),
          })),
        });
      }
      if (!data.pagination?.has_more) break;
      page += 1;
      if (page > 50) break;
    }
    return productId ? out.filter((p) => String(p.id) === String(productId)) : out;
  }
}

export function getPremiumProvider(provider: { baseUrl: string; apiKey: string; apiSecret?: string | null }) {
  return new AccountPremiumProvider(provider.baseUrl, provider.apiKey, provider.apiSecret);
}
