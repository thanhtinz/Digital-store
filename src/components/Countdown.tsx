'use client';

import { useEffect, useState } from 'react';

// Live countdown to a deadline (used for flash sales).
// The clock only starts after mount: reading Date.now() during the first
// render would make the server and client HTML differ and break hydration.
export default function Countdown({ until }: { until: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');
  let parts = ['--', '--', '--'];
  if (now !== null) {
    const diff = Math.max(0, new Date(until).getTime() - now);
    parts = [
      pad(Math.floor(diff / 3_600_000)),
      pad(Math.floor((diff % 3_600_000) / 60_000)),
      pad(Math.floor((diff % 60_000) / 1000)),
    ];
  }

  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm font-bold" suppressHydrationWarning>
      <span className="rounded bg-gray-900 px-1.5 py-0.5 text-white">{parts[0]}</span>:
      <span className="rounded bg-gray-900 px-1.5 py-0.5 text-white">{parts[1]}</span>:
      <span className="rounded bg-gray-900 px-1.5 py-0.5 text-white">{parts[2]}</span>
    </span>
  );
}
