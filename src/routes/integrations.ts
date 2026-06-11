/**
 * Routes:
 *  - /api-providers/*   → quản lý nguồn cung cấp (account_premium, topup_game, giftcard)
 *  - /admin/ai/*        → cấu hình & dùng AI generate
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import prisma from '../db';
import { requireAdmin, requireStaffOrAdmin } from '../middleware/auth';
import { getProvider, getTopupProvider, getPremiumProvider } from '../services/providers';
import {
  AI_PROVIDERS, AI_CONFIG_KEY, getAiConfig, saveAiConfig,
  callProvider, buildMessages, maskKey,
} from '../services/ai';

const router = Router();

// ════════════════════════════════════════════════════
// API PROVIDERS
// ════════════════════════════════════════════════════

const VALID_TYPES = ['account_premium', 'topup_game', 'giftcard', 'smm_panel'];

function providerToDict(p: any) {
  return {
    id: p.id,
    name: p.name,
    provider_type: p.providerType,
    base_url: p.baseUrl,
    api_key: p.apiKey ? '••••••••' : '',
    has_api_key: !!p.apiKey,
    partner_id: p.partnerId,
    card_rates: p.cardRates,
    is_active: p.isActive,
    created_at: p.createdAt?.toISOString(),
  };
}

router.get('/api-providers', requireAdmin, async (_req: Request, res: Response) => {
  const providers = await prisma.apiProvider.findMany({ orderBy: { id: 'asc' } });
  res.json(providers.map(providerToDict));
});

router.post('/api-providers', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, provider_type, base_url, api_key, api_secret, partner_id, card_rates, is_active } = req.body;
    if (!VALID_TYPES.includes(provider_type)) {
      res.status(400).json({ detail: `provider_type phải là một trong: ${VALID_TYPES.join(', ')}` });
      return;
    }
    const p = await prisma.apiProvider.create({
      data: {
        name,
        providerType: provider_type,
        baseUrl: (base_url || '').replace(/\/$/, ''),
        apiKey: api_key || '',
        apiSecret: api_secret || null,
        partnerId: partner_id || null,
        cardRates: card_rates || undefined,
        isActive: is_active !== false,
      },
    });
    res.status(201).json(providerToDict(p));
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.put('/api-providers/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const b = req.body;
    const data: any = {};
    if (b.name !== undefined) data.name = b.name;
    if (b.base_url !== undefined) data.baseUrl = String(b.base_url).replace(/\/$/, '');
    if (b.api_key !== undefined && b.api_key && b.api_key !== '••••••••') data.apiKey = b.api_key;
    if (b.api_secret !== undefined) data.apiSecret = b.api_secret;
    if (b.partner_id !== undefined) data.partnerId = b.partner_id;
    if (b.card_rates !== undefined) data.cardRates = b.card_rates;
    if (b.is_active !== undefined) data.isActive = b.is_active;
    const p = await prisma.apiProvider.update({ where: { id: parseInt(req.params.id) }, data });
    res.json(providerToDict(p));
  } catch (e: any) {
    res.status(e.code === 'P2025' ? 404 : 500).json({ detail: e.message });
  }
});

router.delete('/api-providers/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.apiProvider.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

/** Kiểm tra kết nối tới nguồn cung cấp. */
router.post('/api-providers/:id/test', requireAdmin, async (req: Request, res: Response) => {
  try {
    const provider = await prisma.apiProvider.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!provider) { res.status(404).json({ detail: 'Không tìm thấy nguồn' }); return; }
    if (provider.providerType === 'smm_panel') {
      const balance = await getProvider(provider).getBalance();
      res.json({ ok: true, message: `Kết nối OK · số dư: ${balance.formatted || balance.amount}` });
      return;
    }
    if (provider.providerType === 'topup_game') {
      const balance = await getTopupProvider(provider).getBalance();
      res.json({ ok: true, message: `Kết nối OK · số dư: ${balance.formatted || balance.amount} ${balance.currency}` });
      return;
    }
    // Các loại khác: kiểm tra reachability cơ bản tới base_url.
    if (!provider.baseUrl) { res.status(400).json({ detail: 'Chưa cấu hình Base URL' }); return; }
    try {
      const r = await axios.get(provider.baseUrl, { timeout: 8000, validateStatus: () => true });
      res.json({ ok: true, message: `Máy chủ phản hồi (HTTP ${r.status})` });
    } catch (e: any) {
      res.status(400).json({ detail: `Không kết nối được: ${e.message}` });
    }
  } catch (e: any) {
    res.status(400).json({ detail: e.message });
  }
});

/** Danh sách sản phẩm/plan từ nguồn topup_game (để map khi tạo gói API). */
router.get('/api-providers/:id/remote-products', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const provider = await prisma.apiProvider.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!provider) { res.status(404).json({ detail: 'Không tìm thấy nguồn' }); return; }
    if (!['topup_game', 'account_premium'].includes(provider.providerType)) {
      res.status(400).json({ detail: 'Chỉ hỗ trợ nguồn loại Nạp game hoặc Tài khoản Premium' });
      return;
    }
    const adapter: any =
      provider.providerType === 'account_premium' ? getPremiumProvider(provider) : getTopupProvider(provider);
    const products = await adapter.getProducts(req.query.category_id as string | undefined);
    res.json(products);
  } catch (e: any) {
    res.status(502).json({ detail: `Lỗi gọi nguồn: ${e.message}` });
  }
});

/** Trường nhập (form fields) của 1 sản phẩm nguồn. */
router.get('/api-providers/:id/remote-products/:productId/form-fields', requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const provider = await prisma.apiProvider.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!provider) { res.status(404).json({ detail: 'Không tìm thấy nguồn' }); return; }
    if (provider.providerType !== 'topup_game') { res.json([]); return; }
    const fields = await getTopupProvider(provider).getFormFields(req.params.productId);
    res.json(fields);
  } catch (e: any) {
    res.status(502).json({ detail: `Lỗi gọi nguồn: ${e.message}` });
  }
});

// ════════════════════════════════════════════════════
// AI GENERATE
// ════════════════════════════════════════════════════

router.get('/admin/ai/config', requireAdmin, async (_req: Request, res: Response) => {
  const cfg = await getAiConfig();
  res.json({
    provider: cfg.provider || '',
    model: cfg.model || '',
    custom_base_url: cfg.custom_base_url || '',
    api_key_masked: maskKey(cfg.api_key || ''),
    has_api_key: !!cfg.api_key,
    providers: Object.fromEntries(
      Object.entries(AI_PROVIDERS).map(([id, p]) => [id, { name: p.name, models: p.models, default_model: p.defaultModel }])
    ),
  });
});

router.put('/admin/ai/config', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { provider, model, api_key, custom_base_url } = req.body;
    if (provider && !AI_PROVIDERS[provider]) {
      res.status(400).json({ detail: `Provider không hợp lệ: ${provider}` });
      return;
    }
    const existing = await getAiConfig();
    const newCfg: any = {
      provider,
      model: model || AI_PROVIDERS[provider]?.defaultModel || '',
      custom_base_url: custom_base_url || '',
    };
    if (api_key) newCfg.api_key = api_key;
    else if (existing.api_key) newCfg.api_key = existing.api_key;

    await saveAiConfig(newCfg);
    res.json({ ok: true, provider: newCfg.provider, model: newCfg.model, api_key_masked: maskKey(newCfg.api_key || '') });
  } catch (e: any) {
    res.status(500).json({ detail: e.message });
  }
});

router.post('/admin/ai/test', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const cfg = await getAiConfig();
    if (!cfg.provider || !cfg.api_key) {
      res.status(400).json({ detail: 'Chưa cấu hình AI provider hoặc API key' });
      return;
    }
    const result = await callProvider(
      cfg,
      [
        { role: 'system', content: 'Trả lời ngắn gọn.' },
        { role: 'user', content: "Xin chào, trả lời 'OK' nếu bạn hoạt động." },
      ],
      50
    );
    res.json({ ok: true, response: result });
  } catch (e: any) {
    res.status(400).json({ detail: e.response?.data?.error?.message || e.message });
  }
});

router.post('/admin/ai/generate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const cfg = await getAiConfig();
    if (!cfg.provider || !cfg.api_key) {
      res.status(400).json({ detail: 'Chưa cấu hình AI. Vào Cài đặt → AI để thiết lập.' });
      return;
    }
    const { field_type, context, prompt, max_tokens } = req.body;
    const messages = buildMessages(field_type, context || '', prompt);
    const result = await callProvider(cfg, messages, max_tokens || 500);
    res.json({ ok: true, content: result });
  } catch (e: any) {
    res.status(400).json({ detail: e.response?.data?.error?.message || e.message });
  }
});

export default router;
