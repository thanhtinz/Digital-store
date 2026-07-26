// Shared helpers usable on both server and client.

export function formatMoney(value: number | string, currency = 'USD'): string {
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(safe);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

export function generateOrderCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 10; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Custom-field definition stored on Package.customFields
export type CustomFieldDef = {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'number' | 'textarea';
  required?: boolean;
  placeholder?: string;
  help?: string;
};

export function parseCustomFields(raw: unknown): CustomFieldDef[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
    .map((f) => ({
      key: String(f.key || '').slice(0, 60),
      label: String(f.label || f.key || '').slice(0, 120),
      type: (['text', 'email', 'number', 'textarea'].includes(String(f.type)) ? f.type : 'text') as CustomFieldDef['type'],
      required: f.required !== false,
      placeholder: f.placeholder ? String(f.placeholder).slice(0, 160) : undefined,
      help: f.help ? String(f.help).slice(0, 200) : undefined,
    }))
    .filter((f) => f.key);
}
