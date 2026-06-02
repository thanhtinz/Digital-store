/**
 * AI Generate Service
 * Tất cả provider dùng định dạng OpenAI-compatible /chat/completions.
 * Config lưu trong SiteConfig key 'ai_config' (JSON).
 */

import axios from 'axios';
import prisma from '../db';

export const AI_CONFIG_KEY = 'ai_config';

export const AI_PROVIDERS: Record<string, { name: string; baseUrl: string; models: string[]; defaultModel: string }> = {
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'],
    defaultModel: 'llama-3.3-70b-versatile',
  },
  gemini: {
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'],
    defaultModel: 'gemini-2.0-flash',
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini'],
    defaultModel: 'gpt-4o-mini',
  },
  glm: {
    name: 'GLM (Zhipu)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4-flash', 'glm-4-air', 'glm-4-plus'],
    defaultModel: 'glm-4-flash',
  },
};

interface AiConfig {
  provider?: string;
  model?: string;
  api_key?: string;
  custom_base_url?: string;
}

export function maskKey(key: string): string {
  if (!key || key.length < 8) return key ? '****' : '';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

export async function getAiConfig(): Promise<AiConfig> {
  const row = await prisma.siteConfig.findUnique({ where: { key: AI_CONFIG_KEY } });
  if (!row?.value) return {};
  try { return JSON.parse(row.value); } catch { return {}; }
}

export async function saveAiConfig(cfg: AiConfig): Promise<void> {
  await prisma.siteConfig.upsert({
    where: { key: AI_CONFIG_KEY },
    update: { value: JSON.stringify(cfg) },
    create: { key: AI_CONFIG_KEY, value: JSON.stringify(cfg) },
  });
}

/** Gọi provider OpenAI-compatible */
export async function callProvider(
  cfg: AiConfig,
  messages: Array<{ role: string; content: string }>,
  maxTokens = 500
): Promise<string> {
  const providerDef = cfg.provider ? AI_PROVIDERS[cfg.provider] : undefined;
  const baseUrl = (cfg.custom_base_url || providerDef?.baseUrl || '').replace(/\/$/, '');
  const model = cfg.model || providerDef?.defaultModel;
  if (!baseUrl || !cfg.api_key || !model) {
    throw new Error('Cấu hình AI chưa đầy đủ');
  }

  const resp = await axios.post(
    `${baseUrl}/chat/completions`,
    { model, messages, max_tokens: maxTokens, temperature: 0.7 },
    { headers: { Authorization: `Bearer ${cfg.api_key}`, 'Content-Type': 'application/json' }, timeout: 30000 }
  );

  return resp.data?.choices?.[0]?.message?.content?.trim() || '';
}

/** Tạo prompt theo loại field */
export function buildMessages(fieldType: string, context: string, prompt?: string): Array<{ role: string; content: string }> {
  const system = 'Bạn là trợ lý viết nội dung thương mại điện tử tiếng Việt. Trả lời ngắn gọn, hấp dẫn, đúng trọng tâm.';
  let userPrompt = prompt || '';
  if (!userPrompt) {
    switch (fieldType) {
      case 'product_description':
        userPrompt = `Viết mô tả sản phẩm hấp dẫn cho: ${context}`;
        break;
      case 'product_name':
        userPrompt = `Đề xuất tên sản phẩm ngắn gọn cho: ${context}`;
        break;
      case 'blog':
        userPrompt = `Viết đoạn mở đầu blog về: ${context}`;
        break;
      default:
        userPrompt = context;
    }
  }
  return [
    { role: 'system', content: system },
    { role: 'user', content: userPrompt },
  ];
}
