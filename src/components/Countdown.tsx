'use client';

import { useEffect, useState } from 'react';

// Live countdown to a deadline (used for flash sales).
export default function Countdown({ until }: { until: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = Math.max(0, new Date(until).getTime() - now);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm font-bold">
      <span className="rounded bg-gray-900 px-1.5 py-0.5 text-white">{pad(h)}</span>:
      <span className="rounded bg-gray-900 px-1.5 py-0.5 text-white">{pad(m)}</span>:
      <span className="rounded bg-gray-900 px-1.5 py-0.5 text-white">{pad(s)}</span>
    </span>
  );
}
