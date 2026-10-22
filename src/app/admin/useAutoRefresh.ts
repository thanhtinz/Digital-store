'use client';

// Pragmatic "realtime" for the admin console: there is no websocket/SSE
// infrastructure in this codebase, so pages poll their existing JSON APIs
// every ~12s and swap the fresh data in without a manual reload. Polling
// pauses while the tab is hidden (visibilitychange) and resumes — with an
// immediate refresh — when the admin comes back to the tab.
import { useEffect, useRef, useState } from 'react';

export function useAutoRefresh(refresh: () => void | Promise<void>, intervalMs = 12000) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const fn = useRef(refresh);
  fn.current = refresh;

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      await fn.current();
      if (!stopped) setLastUpdated(new Date());
    };
    const id = setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);

  return lastUpdated;
}
