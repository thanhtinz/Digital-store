/**
 * Trợ lý ảo (Live2D + AI). Mount tại /api/assistant.
 *  - POST /chat   : gửi câu hỏi -> AI trả lời (dùng cấu hình AI có sẵn).
 * Dùng để nhân vật anime ở góc tư vấn/hỗ trợ khách.
 */
import { Router, Request, Response } from 'express';
import axios from 'axios';
import prisma from '../db';
import { optionalUser } from '../middleware/auth';
import { getAiConfig, callProvider } from '../services/ai';

const router = Router();

// Gọi sang N.E.K.O. tự host (OpenAI-compatible /v1/chat/completions). Thử nhanh, lỗi thì bỏ qua.
async function callNeko(baseUrl: string, apiKey: string, messages: Array<{ role: string; content: string }>, maxTokens: number): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
  const resp = await axios.post(
    url,
    { messages, max_tokens: maxTokens, temperature: 0.85, stream: false },
    { headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) }, timeout: 30000 }
  );
  return resp.data?.choices?.[0]?.message?.content?.trim() || '';
}

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
    const cfg = await getCfg(['site_name', 'contact_email', 'hotline', 'zalo', 'live2d_model_url', 'live2d_characters', 'neko_base_url', 'neko_api_key']);
    const siteName = cfg.site_name || 'cửa hàng';
    const useNeko = !!(cfg.neko_base_url || '').trim();

    // Tính cách lấy từ nhân vật Live2D đang chọn (AI đã quét sẵn khi nhập model).
    let charPersona = '';
    let charName = '';
    let charQuotes: string[] = [];
    try {
      const chars = JSON.parse(cfg.live2d_characters || '[]');
      const sel = Array.isArray(chars) ? chars.find((c: any) => c?.modelUrl === (cfg.live2d_model_url || '')) : null;
      if (sel) {
        charPersona = String(sel.personality || '');
        charName = String(sel.name || '');
        if (Array.isArray(sel.quotes)) charQuotes = sel.quotes.map((q: any) => String(q || '')).filter(Boolean);
      }
    } catch { /* noop */ }

    if (!ai?.api_key && !useNeko) {
      // Chưa cấu hình AI -> trả lời mặc định, không lỗi.
      res.json({
        reply: `Xin chào! Mình là trợ lý của ${siteName}. Hiện trợ lý AI chưa được kích hoạt, bạn vui lòng liên hệ hỗ trợ${cfg.hotline ? ' qua ' + cfg.hotline : ''} nhé!`,
        ai: false,
      });
      return;
    }

    // Lấy vài câu thoại mẫu để AI bắt được "giọng" nhân vật (few-shot phong cách).
    const styleSamples = charQuotes.length
      ? charQuotes.sort(() => Math.random() - 0.5).slice(0, 8).map((q) => `- ${q}`).join('\n')
      : '';

    const systemPrompt = charPersona
      ? // Có nhân vật -> NHẬP VAI hoàn toàn.
        `Bạn ĐANG NHẬP VAI nhân vật tên "${charName}" làm trợ lý ảo cho ${siteName} (cửa hàng bán tài khoản premium, key số, nạp game, giftcard, mã nguồn).
TÍNH CÁCH & CÁCH XƯNG HÔ của ${charName}: ${charPersona}

QUY TẮC NHẬP VAI (BẮT BUỘC):
- LUÔN nói chuyện đúng giọng điệu, tính cách, cách xưng hô của ${charName} — KHÔNG trả lời kiểu máy móc, trung tính hay "trợ lý ảo" chung chung.
- Giữ nguyên ngôi xưng và phong cách như các câu mẫu bên dưới; thêm cảm xúc, biểu cảm, đôi khi trêu đùa/tán tỉnh nhẹ nhàng đúng chất nhân vật.
- KHÔNG nhắc đến việc mình là AI/mô hình ngôn ngữ. Luôn coi mình là ${charName}.
${styleSamples ? `\nVÍ DỤ GIỌNG NÓI của ${charName} (bắt chước phong cách, đừng lặp lại nguyên văn):\n${styleSamples}\n` : ''}
NHIỆM VỤ: chào khách, tư vấn chọn & mua sản phẩm, hướng dẫn dùng website (đăng nhập, nạp ví, mua hàng, nhận key, đổi điểm, vòng quay), trả lời thắc mắc.
Trả lời NGẮN (1-3 câu), tiếng Việt, kèm emoji hợp tính cách. Không bịa giá/đơn hàng cụ thể; cần thì hướng dẫn xem trang sản phẩm hoặc liên hệ hỗ trợ${cfg.hotline ? ` (${cfg.hotline})` : ''}. Tuyệt đối KHÔNG rớt vai.`
      : // Không có nhân vật -> trợ lý thường.
        `Bạn là trợ lý ảo thân thiện, dễ thương của ${siteName} — cửa hàng bán tài khoản premium, key số, nạp game, giftcard, mã nguồn.
Nhiệm vụ: chào khách, tư vấn chọn & mua sản phẩm, hướng dẫn sử dụng website, trả lời câu hỏi.
Trả lời NGẮN GỌN (1-3 câu), tiếng Việt, vui vẻ, emoji nhẹ. Không bịa thông tin giá/đơn hàng cụ thể; nếu cần hãy hướng dẫn khách xem trang sản phẩm hoặc liên hệ hỗ trợ${cfg.hotline ? ` (${cfg.hotline})` : ''}.`;

    // Cảm xúc -> động tác/biểu cảm Live2D (giống emotion engine N.E.K.O.).
    const emotionRule =
      '\nBẮT BUỘC: bắt đầu câu trả lời bằng ĐÚNG MỘT thẻ cảm xúc trong [vui] [buồn] [ngại] [ngạc nhiên] [giận] [bình thường], rồi mới tới nội dung. Ví dụ: "[vui] Chào bạn nha!".';

    const messages = [
      { role: 'system', content: systemPrompt + emotionRule },
      ...history
        .filter((h: any) => h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string')
        .map((h: any) => ({ role: h.role, content: String(h.content).slice(0, 1000) })),
      { role: 'user', content: message },
    ];

    // Ưu tiên N.E.K.O. tự host nếu được cấu hình; lỗi/không có thì dùng AI thường.
    let reply = '';
    if (useNeko) {
      try { reply = await callNeko(cfg.neko_base_url, cfg.neko_api_key, messages, 600); } catch { /* fallback */ }
    }
    if (!reply && ai?.api_key) reply = await callProvider(ai, messages, 600);
    reply = String(reply || '').trim() || '[bình thường] Mình chưa rõ ý bạn lắm, bạn nói rõ hơn được không?';

    // Gợi ý 3 câu người dùng có thể trả lời tiếp (chip A/B/C kiểu N.E.K.O.).
    let suggestions: string[] = [];
    try {
      const sgMessages = [
        { role: 'system', content: 'Bạn tạo gợi ý câu trả lời cho NGƯỜI DÙNG. Chỉ trả về DUY NHẤT một mảng JSON gồm 3 chuỗi ngắn.' },
        { role: 'user', content:
          `Trợ lý vừa nói với người dùng: "${reply.replace(/^\s*\[[^\]]+\]\s*/, '')}". ` +
          `Gợi ý 3 câu NGẮN (ngôi thứ nhất, < 12 từ, đa dạng: 1 hỏi tiếp, 1 đồng ý, 1 chuyển hướng) mà NGƯỜI DÙNG có thể nhắn tiếp. Trả về DUY NHẤT mảng JSON 3 chuỗi tiếng Việt.` },
      ];
      let sgRaw = '';
      if (useNeko) { try { sgRaw = await callNeko(cfg.neko_base_url, cfg.neko_api_key, sgMessages, 150); } catch { /* noop */ } }
      if (!sgRaw && ai?.api_key) sgRaw = await callProvider(ai, sgMessages, 150);
      const s = sgRaw.replace(/```(?:json)?/gi, '').replace(/```/g, '');
      const i = s.indexOf('['); const j = s.lastIndexOf(']');
      if (i >= 0 && j > i) { const arr = JSON.parse(s.slice(i, j + 1)); if (Array.isArray(arr)) suggestions = arr.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 3); }
    } catch { /* bỏ qua nếu lỗi */ }

    res.json({ reply, suggestions, ai: true });
  } catch (e: any) {
    res.status(500).json({ detail: e.message || 'Lỗi trợ lý' });
  }
});

export default router;
