'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase/client';

type AuthState = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState>({ user: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub = () => {};
    try {
      unsub = onAuthStateChanged(firebaseAuth(), (u) => {
        setUser(u);
        setLoading(false);
      });
    } catch {
      // Firebase env not configured yet — keep loading=false so UI doesn't hang
      setLoading(false);
    }
    return () => unsub();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      signOut: async () => {
        try {
          await fbSignOut(firebaseAuth());
        } catch {
          /* noop */
        }
      },
    }),
    [user, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
