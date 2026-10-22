'use client';

import { useEffect, useState } from 'react';
import { useAdminT, useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';
import { useSettings, field, toggle, SettingsHeader } from '../shared';

export default function AdminNotificationSettingsPage() {
  const { s, set, save, busy } = useSettings();
  const { toast } = useStore();
  const t = useAdminT();
  const [testing, setTesting] = useState(false);
  const [hookBusy, setHookBusy] = useState(false);
  const [hook, setHook] = useState<{ url?: string; lastError?: string } | null | undefined>(undefined);

  const loadHook = () =>
    api<{ info: { url?: string; lastError?: string } | null }>('/api/admin/telegram/webhook')
      .then((d) => setHook(d.info))
      .catch(() => setHook(null));
  useEffect(() => { loadHook(); }, []);

  const activate = async () => {
    setHookBusy(true);
    try {
      const d = await api<{ url: string }>('/api/admin/telegram/webhook', { method: 'POST' });
      toast(t('admin.notify.webhookRegistered', { url: d.url }));
      await loadHook();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setHookBusy(false);
    }
  };

  if (!s) return <div className="py-16 text-center text-gray-400">{t('admin.settings.loading')}</div>;

  const test = async () => {
    setTesting(true);
    try {
      const d = await api<{ message: string }>('/api/admin/settings/test', { method: 'POST', json: { gateway: 'telegram' } });
      toast(d.message);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <SettingsHeader
        title={t('admin.notify.title')}
        subtitle={t('admin.notify.subtitle')}
        onSave={save}
        busy={busy}
      />

      <div className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="telegram" className="text-sky-500" /> {t('admin.notify.telegramTitle')}
          </h2>
          {toggle(s, set, 'telegram_enabled', t('admin.notify.enabled'))}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {t('admin.notify.alertsFor')}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(s, set, { k: 'telegram_bot_token', label: t('admin.notify.botToken'), type: 'password', placeholder: '123456:ABC-DEF…', help: t('admin.notify.botTokenHelp') })}
          {field(s, set, { k: 'telegram_chat_id', label: t('admin.notify.chatId'), placeholder: t('admin.notify.chatIdPlaceholder'), help: t('admin.notify.chatIdHelp') })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="btn-secondary" onClick={test} disabled={testing}>
            <Icon name="send" size={15} /> {testing ? t('admin.notify.sending') : t('admin.notify.sendTest')}
          </button>
          <p className="text-xs text-gray-400">{t('admin.notify.saveFirstNote')}</p>
        </div>

        <div className="mt-5 rounded-xl bg-gray-50 p-4 text-xs leading-relaxed text-gray-600">
          <p className="font-bold text-gray-700">{t('admin.notify.setupTitle')}</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4">
            <li>{t('admin.notify.step1a')} <b>@BotFather</b>{t('admin.notify.step1b')} <code className="rounded bg-gray-200 px-1">/newbot</code> {t('admin.notify.step1c')}</li>
            <li>{t('admin.notify.step2')}</li>
            <li>{t('admin.notify.step3')}</li>
            <li>{t('admin.notify.step4a')} <b>@userinfobot</b> {t('admin.notify.step4b')}</li>
            <li>{t('admin.notify.step5')}</li>
          </ol>
        </div>
      </div>

      {/* Customer bot */}
      <div className="card mt-5 p-5">
        <h2 className="flex items-center gap-2 font-bold">
          <Icon name="users" className="text-brand-600" /> {t('admin.notify.customerBotTitle')}
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          {t('admin.notify.customerBotText')}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(s, set, { k: 'customer_bot_token', label: t('admin.notify.customerBotToken'), type: 'password', placeholder: '123456:ABC-DEF…', help: t('admin.notify.customerBotTokenHelp') })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="btn-primary" onClick={activate} disabled={hookBusy}>
            {hookBusy ? t('admin.notify.registering') : t('admin.notify.registerWebhook')}
          </button>
          {hook === undefined ? (
            <span className="text-xs text-gray-400">{t('admin.notify.checkingStatus')}</span>
          ) : hook?.url ? (
            <span className="badge bg-green-100 text-green-700">{t('admin.notify.activePrefix')} {hook.url}</span>
          ) : (
            <span className="badge bg-gray-100 text-gray-500">{t('admin.notify.notRegistered')}</span>
          )}
        </div>
        {hook?.lastError && (
          <p className="mt-2 text-xs text-red-500">{t('admin.notify.lastError')} {hook.lastError}</p>
        )}
        <p className="mt-3 text-xs text-gray-400">
          {t('admin.notify.webhookNote')}
        </p>
      </div>
    </div>
  );
}
