'use client';

import { useState } from 'react';
import Icon from './icons';
import { formatDateTime } from '@/lib/utils';
import { INTL_LOCALE } from '@/i18n';
import { useStore, useT } from '@/components/Providers';

// Storefront callers pass translated `labels`; the admin console omits them
// and keeps these English defaults.
const DEFAULT_LABELS = {
  tooMany: 'Maximum 3 images per message',
  uploading: 'Uploading…',
  attach: 'Attach image',
  attachmentAlt: (i: number) => `Attachment ${i}`,
  remove: 'Remove attachment',
};

export type AttachmentLabels = Partial<typeof DEFAULT_LABELS>;

// Storefront helper — one call instead of repeating the label map per page.
export function useAttachmentLabels(): AttachmentLabels {
  const t = useT();
  return {
    tooMany: t('support.maxImages'),
    uploading: t('support.uploading'),
    attach: t('support.attach'),
    attachmentAlt: (i: number) => t('support.attachmentAlt', { index: i }),
    remove: t('support.removeAttachment'),
  };
}

// ── Attachment picker: uploads to the ticket media endpoint, returns URLs ──
export function AttachmentPicker({ attachments, onChange, toast, labels }: {
  attachments: string[];
  onChange: (urls: string[]) => void;
  toast: (m: string, k?: 'success' | 'error') => void;
  labels?: AttachmentLabels;
}) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (attachments.length >= 3) {
      toast(l.tooMany, 'error');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/support/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onChange([...attachments, data.url]);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {attachments.map((url, i) => (
        <span key={url} className="group relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={l.attachmentAlt(i + 1)} className="h-14 w-14 rounded-lg border border-gray-200 object-cover" />
          <button
            type="button"
            aria-label={l.remove}
            className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-gray-900 text-white opacity-0 transition group-hover:opacity-100"
            onClick={() => onChange(attachments.filter((_, x) => x !== i))}
          >
            <Icon name="x" size={10} />
          </button>
        </span>
      ))}
      <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 hover:border-brand-400 hover:text-brand-600 ${attachments.length >= 3 ? 'pointer-events-none opacity-40' : ''}`}>
        <Icon name="image" size={15} />
        {uploading ? l.uploading : l.attach}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) upload(e.target.files[0]);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}

// ── One chat bubble, with framed text and image attachments ──
export function MessageBubble({ message, mine, authorLabel }: {
  message: { content: string; attachments?: unknown; createdAt: string };
  mine: boolean; // rendered on the right in brand color
  authorLabel: string;
}) {
  const intlLocale = INTL_LOCALE[useStore().locale];
  const attachments = Array.isArray(message.attachments) ? (message.attachments as string[]) : [];
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm ${
        mine ? 'rounded-tr-sm border-brand-700/30 bg-brand-600 text-white' : 'rounded-tl-sm border-gray-200 bg-white'
      }`}>
        <p className={`mb-1 text-[11px] font-bold uppercase tracking-wide ${mine ? 'text-white/70' : 'text-brand-600'}`}>
          {authorLabel}
        </p>
        {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
        {attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {attachments.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="attachment" className="h-28 w-auto max-w-[220px] object-cover transition hover:scale-105" />
              </a>
            ))}
          </div>
        )}
        <p className={`mt-1.5 text-[10px] ${mine ? 'text-white/60' : 'text-gray-400'}`}>
          {formatDateTime(message.createdAt, intlLocale, { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </div>
    </div>
  );
}
