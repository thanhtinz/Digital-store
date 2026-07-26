'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/components/Providers';
import { api } from '@/lib/client';
import Icon from '@/components/icons';
import { useSettings, field, toggle, SettingsHeader } from '../shared';

export default function AdminNotificationSettingsPage() {
  const { s, set, save, busy } = useSettings();
  const { toast } = useStore();
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
      toast(`Webhook registered: ${d.url}`);
      await loadHook();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setHookBusy(false);
    }
  };

  if (!s) return <div className="py-16 text-center text-gray-400">Loading settings…</div>;

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
        title="Notifications"
        subtitle="Get pinged the moment something needs your attention."
        onSave={save}
        busy={busy}
      />

      <div className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="telegram" className="text-sky-500" /> Telegram alerts
          </h2>
          {toggle(s, set, 'telegram_enabled', 'Enabled')}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Instant messages for: new paid orders, low stock, orders needing manual fulfillment, and new support tickets.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(s, set, { k: 'telegram_bot_token', label: 'Bot token', type: 'password', placeholder: '123456:ABC-DEF…', help: 'Create a bot with @BotFather on Telegram and paste its token here.' })}
          {field(s, set, { k: 'telegram_chat_id', label: 'Chat ID', placeholder: 'e.g. 123456789', help: 'Message @userinfobot to get your personal chat ID, or use a group chat ID.' })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="btn-secondary" onClick={test} disabled={testing}>
            <Icon name="send" size={15} /> {testing ? 'Sending…' : 'Send test message'}
          </button>
          <p className="text-xs text-gray-400">Save your settings first, then send a test.</p>
        </div>

        <div className="mt-5 rounded-xl bg-gray-50 p-4 text-xs leading-relaxed text-gray-600">
          <p className="font-bold text-gray-700">Setup in 60 seconds</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4">
            <li>Open Telegram, search for <b>@BotFather</b>, send <code className="rounded bg-gray-200 px-1">/newbot</code> and follow the prompts.</li>
            <li>Copy the bot token it gives you into the field above.</li>
            <li>Send any message to your new bot (bots cannot message you first).</li>
            <li>Get your chat ID from <b>@userinfobot</b> and paste it above.</li>
            <li>Save, then hit &quot;Send test message&quot;.</li>
          </ol>
        </div>
      </div>

      {/* Customer bot */}
      <div className="card mt-5 p-5">
        <h2 className="flex items-center gap-2 font-bold">
          <Icon name="users" className="text-brand-600" /> Customer bot
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          A separate, public-facing bot for your customers: they link it from Account &amp; security, check their
          orders and balance with commands, and can choose to receive order updates on Telegram instead of email.
          Use a different bot from the admin alerts above so your private alerts stay private.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {field(s, set, { k: 'customer_bot_token', label: 'Customer bot token', type: 'password', placeholder: '123456:ABC-DEF…', help: 'Create a second bot with @BotFather just for customers.' })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="btn-primary" onClick={activate} disabled={hookBusy}>
            {hookBusy ? 'Registering…' : 'Register webhook'}
          </button>
          {hook === undefined ? (
            <span className="text-xs text-gray-400">Checking status…</span>
          ) : hook?.url ? (
            <span className="badge bg-green-100 text-green-700">Active: {hook.url}</span>
          ) : (
            <span className="badge bg-gray-100 text-gray-500">Not registered</span>
          )}
        </div>
        {hook?.lastError && (
          <p className="mt-2 text-xs text-red-500">Last delivery error from Telegram: {hook.lastError}</p>
        )}
        <p className="mt-3 text-xs text-gray-400">
          Requires the customer bot token and a public site URL (Site settings → Public site URL). Save settings
          before registering. Customers get: /orders, /order CODE, /balance, /unlink.
        </p>
      </div>
    </div>
  );
}
