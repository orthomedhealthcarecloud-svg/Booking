'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { PublicDoctor } from '@/lib/doctorsClient';

const DoctorContext = createContext<PublicDoctor | null>(null);

export function DoctorProvider({
  doctor,
  children,
}: {
  doctor: PublicDoctor;
  children: ReactNode;
}) {
  return <DoctorContext.Provider value={doctor}>{children}</DoctorContext.Provider>;
}

export function useDoctor(): PublicDoctor {
  const d = useContext(DoctorContext);
  if (!d) throw new Error('useDoctor must be used inside <DoctorProvider>');
  return d;
}
