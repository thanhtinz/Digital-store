'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from './icons';

type Banner = { id: number; title: string | null; subtitle: string | null; imageUrl: string; linkUrl: string | null };

export default function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (!banners.length) return null;

  const prev = () => setIndex((i) => (i - 1 + banners.length) % banners.length);
  const next = () => setIndex((i) => (i + 1) % banners.length);

  return (
    <div className="group relative overflow-hidden rounded-3xl shadow-[0_24px_48px_-24px_rgba(16,24,40,.35)]">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {banners.map((b) => {
          const slide = (
            <div className="relative aspect-[21/8] w-full shrink-0 bg-gray-200 sm:aspect-[21/6]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imageUrl} alt={b.title || 'Banner'} className="h-full w-full object-cover" />
              {(b.title || b.subtitle) && (
                <div className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-black/60 via-black/20 to-transparent p-6 sm:p-12">
                  {b.title && <h2 className="max-w-lg text-xl font-extrabold text-white drop-shadow sm:text-3xl">{b.title}</h2>}
                  {b.subtitle && <p className="mt-2 max-w-md text-sm text-white/85 sm:text-base">{b.subtitle}</p>}
                </div>
              )}
            </div>
          );
          return b.linkUrl ? (
            <Link key={b.id} href={b.linkUrl} className="w-full shrink-0">{slide}</Link>
          ) : (
            <div key={b.id} className="w-full shrink-0">{slide}</div>
          );
        })}
      </div>
      {banners.length > 1 && (
        <>
          <button
            aria-label="Previous slide"
            onClick={prev}
            className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-gray-700 opacity-0 shadow-md backdrop-blur transition hover:bg-white group-hover:opacity-100"
          >
            <Icon name="chevron-right" size={18} className="rotate-180" />
          </button>
          <button
            aria-label="Next slide"
            onClick={next}
            className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-gray-700 opacity-0 shadow-md backdrop-blur transition hover:bg-white group-hover:opacity-100"
          >
            <Icon name="chevron-right" size={18} />
          </button>
        </>
      )}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/20 px-2 py-1.5 backdrop-blur">
          {banners.map((_, i) => (
            <button
              key={i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
