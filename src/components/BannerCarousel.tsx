'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Banner = { id: number; title: string | null; subtitle: string | null; imageUrl: string; linkUrl: string | null };

export default function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (!banners.length) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl">
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
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
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
