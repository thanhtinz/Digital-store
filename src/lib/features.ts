import { getSettings } from './settings';

// Site-wide feature switches, editable in Admin → Features. Everything is
// ON by default; a feature is off only when its setting is exactly 'false'.
export const FEATURE_KEYS = [
  'wallet', 'giftcards', 'reviews', 'wishlist', 'news', 'flash_sale', 'livechat', 'support',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export async function featureEnabled(key: FeatureKey): Promise<boolean> {
  const settings = await getSettings([`feature_${key}`]);
  return settings[`feature_${key}`] !== 'false';
}

export async function getFeatures(): Promise<Record<FeatureKey, boolean>> {
  const keys = FEATURE_KEYS.map((k) => `feature_${k}`);
  const s = await getSettings(keys);
  return Object.fromEntries(FEATURE_KEYS.map((k) => [k, s[`feature_${k}`] !== 'false'])) as Record<FeatureKey, boolean>;
}
