'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/lib/client';
import { DEFAULT_MONEY_FORMAT, formatMoneyWith, type MoneyFormat } from '@/lib/utils';

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  avatarUrl: string | null;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  hasPassword: boolean;
  balance: number;
  loyaltyPoints: number;
};

type Toast = { id: number; message: string; kind: 'success' | 'error' };

type StoreContextValue = {
  user: SessionUser | null | undefined; // undefined = loading
  refreshUser: () => Promise<void>;
  cartCount: number;
  refreshCart: () => Promise<void>;
  toast: (message: string, kind?: 'success' | 'error') => void;
  money: MoneyFormat;
};

const StoreContext = createContext<StoreContextValue>({
  user: undefined,
  refreshUser: async () => {},
  cartCount: 0,
  refreshCart: async () => {},
  toast: () => {},
  money: DEFAULT_MONEY_FORMAT,
});

export const useStore = () => useContext(StoreContext);

// Formats an amount in the store's configured currency. Passing an explicit
// code renders that currency instead — historical orders keep the currency
// they were booked in even after the store's base changes.
export function useMoney() {
  const { money } = useContext(StoreContext);
  return useCallback(
    (value: number | string, code?: string) => {
      if (code && code.toUpperCase() !== money.code) {
        return formatMoneyWith(value, { ...money, code: code.toUpperCase(), symbol: code.toUpperCase() });
      }
      return formatMoneyWith(value, money);
    },
    [money]
  );
}

export default function Providers({ children, money = DEFAULT_MONEY_FORMAT }: { children: ReactNode; money?: MoneyFormat }) {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [cartCount, setCartCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api<{ user: SessionUser | null }>('/api/auth/me');
      setUser(data.user);
      return;
    } catch {
      setUser(null);
    }
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      const data = await api<{ items: Array<{ quantity: number }> }>('/api/cart');
      setCartCount(data.items.reduce((sum, i) => sum + i.quantity, 0));
    } catch {
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    refreshUser().then(refreshCart);
    // Affiliate attribution: persist ?ref= for 30 days.
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && /^[a-z0-9]{4,20}$/i.test(ref)) {
      document.cookie = `ds_ref=${ref}; path=/; max-age=${30 * 86400}; samesite=lax`;
    }
  }, [refreshUser, refreshCart]);

  const toast = useCallback((message: string, kind: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const value = useMemo(
    () => ({ user, refreshUser, cartCount, refreshCart, toast, money }),
    [user, refreshUser, cartCount, refreshCart, toast, money]
  );

  return (
    <StoreContext.Provider value={value}>
      {children}
      {/* Toasts */}
      <div className="fixed bottom-4 left-1/2 z-[100] flex w-[92vw] max-w-sm -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-4 sm:translate-x-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
              t.kind === 'success' ? 'bg-gray-900' : 'bg-red-600'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </StoreContext.Provider>
  );
}
