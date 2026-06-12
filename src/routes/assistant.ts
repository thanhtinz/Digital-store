/**
 * Trợ lý ảo (Live2D + AI). Mount tại /api/assistant.
 *  - POST /chat   : gửi câu hỏi -> AI trả lời (dùng cấu hình AI có sẵn).
 * Dùng để nhân vật anime ở góc tư vấn/hỗ trợ khách.
 */
import { Router, Request, Response } from 'express';
import prisma from '../db';
import { optionalUser } from '../middleware/auth';
import { getAiConfig, callProvider } from '../services/ai';

const router = Router();

async function getCfg(keys: string[]): Promise<Record<string, string>> {
  const rows = await prisma.siteConfig.findMany({ where: { key: { in: keys } } });
  return Object.fromEntries(rows.map((r: any) => [r.key, r.value || '']));
}

router.post('/chat', optionalUser, async (req: Request, res: Response) => {
  try {
    const message = String(req.body?.message || '').trim().slice(0, 1000);
    if (!message) { res.status(400).json({ detail: 'Nội dung trống' }); return; }
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];

    const ai = await getAiConfig();
    const cfg = await getCfg(['site_name', 'contact_email', 'hotline', 'zalo', 'live2d_model_url', 'live2d_characters']);
    const siteName = cfg.site_name || 'cửa hàng';

    // Tính cách lấy từ nhân vật Live2D đang chọn (AI đã quét sẵn khi nhập model).
    let charPersona = '';
    let charName = '';
    try {
      const chars = JSON.parse(cfg.live2d_characters || '[]');
      const sel = Array.isArray(chars) ? chars.find((c: any) => c?.modelUrl === (cfg.live2d_model_url || '')) : null;
      if (sel) { charPersona = String(sel.personality || ''); charName = String(sel.name || ''); }
    } catch { /* noop */ }

    if (!ai?.api_key) {
      // Chưa cấu hình AI -> trả lời mặc định, không lỗi.
      res.json({
        reply: `Xin chào! Mình là trợ lý của ${siteName}. Hiện trợ lý AI chưa được kích hoạt, bạn vui lòng liên hệ hỗ trợ${cfg.hotline ? ' qua ' + cfg.hotline : ''} nhé!`,
        ai: false,
      });
      return;
    }

    const personaLine = charPersona
      ? `Bạn nhập vai nhân vật ${charName || ''}. Tính cách & cách xưng hô: ${charPersona}\n`
      : `Bạn là trợ lý ảo thân thiện, dễ thương của ${siteName}.\n`;
    const systemPrompt =
      `${personaLine}${siteName} là cửa hàng bán tài khoản premium, key sản phẩm số, nạp game, giftcard, mã nguồn.
Nhiệm vụ: chào khách, tư vấn chọn & mua sản phẩm, hướng dẫn sử dụng website (đăng nhập, nạp tiền vào ví, mua hàng, nhận key, đổi điểm, vòng quay), và trả lời câu hỏi.
LUÔN giữ đúng tính cách nhân vật. Trả lời NGẮN GỌN (1-3 câu), tiếng Việt, có thể dùng emoji nhẹ. Không bịa thông tin giá/đơn hàng cụ thể; nếu cần hãy hướng dẫn khách xem trang sản phẩm hoặc liên hệ hỗ trợ${cfg.hotline ? ` (${cfg.hotline})` : ''}.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history
        .filter((h: any) => h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string')
        .map((h: any) => ({ role: h.role, content: String(h.content).slice(0, 1000) })),
      { role: 'user', content: message },
    ];

    const reply = await callProvider(ai, messages, 300);
    res.json({ reply: String(reply || '').trim() || 'Mình chưa rõ ý bạn lắm, bạn nói rõ hơn được không?', ai: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message || 'Lỗi trợ lý' });
  }
});

export default router;
