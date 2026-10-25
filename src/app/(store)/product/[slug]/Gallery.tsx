'use client';

import { useState } from 'react';
import Icon from '@/components/icons';
import { useT } from '@/components/Providers';

export default function Gallery({ images, name }: { images: string[]; name: string }) {
  const t = useT();
  const [active, setActive] = useState(0);
  const list = images.length ? images : [];

  return (
    <div className="min-w-0">
      <div className="aspect-[4/3] overflow-hidden rounded-[var(--img-radius)] border border-black/5">
        {list[active] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={list[active]} alt={t('catalog.imageAlt', { name, index: active + 1 })} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-gray-200"><Icon name="bag" size={72} /></div>
        )}
      </div>
      {list.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {list.map((url, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-[82px] w-[82px] shrink-0 overflow-hidden rounded-[var(--tile-radius)] border-2 transition ${
                i === active ? 'border-brand-600' : 'border-black/5 opacity-80 hover:border-brand-300 hover:opacity-100'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={t('catalog.thumbAlt', { name, index: i + 1 })} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
