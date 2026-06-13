'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

const Ctx = createContext<{ alert: boolean; setAlert: (v: boolean) => void }>({
  alert: false,
  setAlert: () => {},
});

export function ConsultAlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState(false);
  return <Ctx.Provider value={{ alert, setAlert }}>{children}</Ctx.Provider>;
}

export const useConsultAlert = () => useContext(Ctx);
