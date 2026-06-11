/**
 * OAuth Configuration Routes (admin)
 *  - GET  /admin/oauth/public-config  → provider nào đang bật (public, không secret)
 *  - GET  /admin/oauth/config         → cấu hình đầy đủ (secret đã mask)
 *  - PUT  /admin/oauth/config/:provider → cập nhật
 *
 * Discord đã bị loại khỏi danh sách provider đăng nhập.
 */

import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// Discord đã bỏ — chỉ còn các provider này
const OAUTH_PROVIDERS = ['google', 'facebook', 'github', 'tiktok'];

function maskSecret(s: string): string {
  if (!s || s.length < 8) return s ? '****' : '';
  return s.slice(0, 4) + '****' + s.slice(-4);
}

async function getConfigMap(): Promise<Record<string, string>> {
  const keys: string[] = [];
  for (const p of OAUTH_PROVIDERS) {
    keys.push(`oauth_${p}_client_id`, `oauth_${p}_client_secret`, `oauth_${p}_enabled`);
  }
  const configs = await prisma.siteConfig.findMany({ where: { key: { in: keys } } });
  return Object.fromEntries(configs.map((c: { key: string; value: string | null }) => [c.key, c.value || '']));
}

/** Public: provider nào đang bật */
router.get('/public-config', async (_req: Request, res: Response) => {
  const map = await getConfigMap();
  const config: Record<string, { enabled: boolean }> = {};
  for (const provider of OAUTH_PROVIDERS) {
    config[provider] = { enabled: map[`oauth_${provider}_enabled`] === 'true' };
  }
  res.json(config);
});

/** Admin: cấu hình đầy đủ (secret masked) */
router.get('/config', requireAdmin, async (_req: Request, res: Response) => {
  const map = await getConfigMap();
  const config: Record<string, any> = {};
  for (const provider of OAUTH_PROVIDERS) {
    const clientId = map[`oauth_${provider}_client_id`] || '';
    const clientSecret = map[`oauth_${provider}_client_secret`] || '';
    config[provider] = {
      clientId,
      clientSecret: clientSecret ? maskSecret(clientSecret) : '',
      hasSecret: !!clientSecret,
      enabled: map[`oauth_${provider}_enabled`] === 'true',
    };
  }
  res.json(config);
});

/** Admin: cập nhật cấu hình 1 provider */
router.put('/config/:provider', requireAdmin, async (req: Request, res: Response) => {
  const { provider } = req.params;
  if (!OAUTH_PROVIDERS.includes(provider)) {
    res.status(400).json({ detail: 'Provider không hợp lệ' });
    return;
  }
  const { clientId = '', clientSecret = '', enabled = false } = req.body;
  const updates: Array<{ key: string; value: string }> = [
    { key: `oauth_${provider}_client_id`, value: clientId },
    { key: `oauth_${provider}_enabled`, value: enabled ? 'true' : 'false' },
  ];
  if (clientSecret && !clientSecret.includes('****')) {
    updates.push({ key: `oauth_${provider}_client_secret`, value: clientSecret });
  }
  await Promise.all(
    updates.map((u) =>
      prisma.siteConfig.upsert({ where: { key: u.key }, update: { value: u.value }, create: { key: u.key, value: u.value } })
    )
  );
  res.json({ success: true, provider });
});

export default router;
