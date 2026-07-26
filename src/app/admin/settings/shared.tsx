'use client';

// Shared plumbing for the separate admin settings pages (site / payments /
// google / email). Each page loads the full settings map but only renders and
// saves its own fields — the API merges partial updates.
import { useEffect, useState } from 'react';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';

export type Settings = Record<string, string>;

export function useSettings() {
  const { toast } = useStore();
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ settings: Settings }>('/api/admin/settings').then((d) => setS(d.settings)).catch(() => {});
  }, []);

  const set = (key: string, value: string) => setS((prev) => (prev ? { ...prev, [key]: value } : prev));

  const save = async () => {
    if (!s) return;
    setBusy(true);
    try {
      await api('/api/admin/settings', { method: 'POST', json: s });
      toast('Settings saved');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return { s, set, save, busy, toast };
}

// Rendered as function calls (not JSX components) so the inputs keep identity
// across re-renders and don't lose focus while typing.
export function field(
  s: Settings,
  set: (k: string, v: string) => void,
  opts: { k: string; label: string; type?: string; placeholder?: string; help?: string }
) {
  const { k, label, type = 'text', placeholder, help } = opts;
  return (
    <div key={k}>
      <label className="label">{label}</label>
      <input className="input" type={type} placeholder={placeholder} value={s[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
      {help && <p className="mt-1 text-xs text-gray-400">{help}</p>}
    </div>
  );
}

export function toggle(s: Settings, set: (k: string, v: string) => void, k: string, label: string) {
  return (
    <label key={k} className="flex items-center gap-2 text-sm font-medium">
      <input type="checkbox" checked={s[k] === 'true'} onChange={(e) => set(k, e.target.checked ? 'true' : 'false')} />
      {label}
    </label>
  );
}

export function SettingsHeader({ title, subtitle, onSave, busy }: {
  title: string;
  subtitle: string;
  onSave: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
      </div>
      <button className="btn-primary" onClick={onSave} disabled={busy}>
        {busy ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

export function webhookBase(s: Settings): string {
  return s.app_url || (typeof window !== 'undefined' ? window.location.origin : '');
}
