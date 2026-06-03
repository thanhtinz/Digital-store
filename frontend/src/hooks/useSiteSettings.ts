import { useEffect, useState } from 'react';
// utils
import axiosInstance from '../utils/axios';

// ----------------------------------------------------------------------
// Cấu hình site công khai (logo, tên...) lấy từ backend /api/settings.
// Cache ở module-level để chỉ gọi 1 lần cho toàn app.
// ----------------------------------------------------------------------

export type SiteSettings = {
  site_name?: string;
  site_logo?: string;
  site_description?: string;
  currency?: string;
  [key: string]: any;
};

let cache: SiteSettings | null = null;
let inflight: Promise<SiteSettings> | null = null;
const listeners = new Set<(s: SiteSettings) => void>();

function load(): Promise<SiteSettings> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = axiosInstance
    .get('/api/settings')
    .then((res) => {
      cache = res.data || {};
      listeners.forEach((fn) => fn(cache as SiteSettings));
      return cache as SiteSettings;
    })
    .catch(() => {
      cache = {};
      return cache as SiteSettings;
    });
  return inflight;
}

export default function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(cache || {});

  useEffect(() => {
    let alive = true;
    const update = (s: SiteSettings) => alive && setSettings(s);
    listeners.add(update);
    load().then(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  return settings;
}
