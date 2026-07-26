'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/client';

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  avatarUrl: string | null;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  hasPassword: boolean;
};

type Toast = { id: number; message: string; kind: 'success' | 'error' };

type StoreContextValue = {
  user: SessionUser | null | undefined; // undefined = loading
  refreshUser: () => Promise<void>;
  cartCount: number;
  refreshCart: () => Promise<void>;
  toast: (message: string, kind?: 'success' | 'error') => void;
};

const StoreContext = createContext<StoreContextValue>({
  user: undefined,
  refreshUser: async () => {},
  cartCount: 0,
  refreshCart: async () => {},
  toast: () => {},
});

export const useStore = () => useContext(StoreContext);

export default function Providers({ children }: { children: ReactNode }) {
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
  }, [refreshUser, refreshCart]);

  const toast = useCallback((message: string, kind: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <StoreContext.Provider value={{ user, refreshUser, cartCount, refreshCart, toast }}>
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
