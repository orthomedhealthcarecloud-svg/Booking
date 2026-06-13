'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { ConsultationType } from '@/lib/types';

export type BookingFiles = { name: string; size: string; url?: string; docId?: string }[];

export type BookingDraft = {
  type: ConsultationType;
  slot: { startMillis: number; endMillis: number; allowed: ConsultationType[] } | null;
  form: {
    name: string;
    email: string;
    phone: string;
    age: string;
    gender: 'Female' | 'Male' | 'Other';
    complaint: string;
    notes: string;
  };
  files: BookingFiles;
};

const defaultDraft: BookingDraft = {
  type: 'video',
  slot: null,
  form: { name: '', email: '', phone: '', age: '', gender: 'Female', complaint: '', notes: '' },
  files: [],
};

const Ctx = createContext<{
  draft: BookingDraft;
  setDraft: (next: BookingDraft) => void;
  patch: (delta: Partial<BookingDraft>) => void;
  reset: () => void;
}>({ draft: defaultDraft, setDraft: () => {}, patch: () => {}, reset: () => {} });

const storageKey = (doctorSlug: string) => `medi:booking:${doctorSlug}`;

export function BookingProvider({
  doctorSlug,
  children,
}: {
  doctorSlug: string;
  children: ReactNode;
}) {
  const [draft, setDraftState] = useState<BookingDraft>(defaultDraft);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey(doctorSlug));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BookingDraft>;
        // Deep-merge `form` so drafts saved before new fields existed still get defaults.
        setDraftState({
          ...defaultDraft,
          ...parsed,
          form: { ...defaultDraft.form, ...(parsed.form ?? {}) },
        });
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [doctorSlug]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(storageKey(doctorSlug), JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft, doctorSlug, hydrated]);

  const setDraft = (next: BookingDraft) => setDraftState(next);
  const patch = (delta: Partial<BookingDraft>) => setDraftState((d) => ({ ...d, ...delta }));
  const reset = () => {
    setDraftState(defaultDraft);
    try {
      sessionStorage.removeItem(storageKey(doctorSlug));
    } catch {
      /* ignore */
    }
  };

  return <Ctx.Provider value={{ draft, setDraft, patch, reset }}>{children}</Ctx.Provider>;
}

export function useBooking() {
  return useContext(Ctx);
}
