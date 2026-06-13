'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import type { PublicDoctor } from '@/lib/doctorsClient';

const DoctorContext = createContext<PublicDoctor | null>(null);

export function DoctorProvider({
  doctor,
  children,
}: {
  doctor: PublicDoctor;
  children: ReactNode;
}) {
  // `doctor` (from env) is the SSR default. Live edits saved to the doctors/{id}
  // Firestore doc override it so changes reflect everywhere (patient + admin).
  const [merged, setMerged] = useState<PublicDoctor>(doctor);

  useEffect(() => {
    const unsub = onSnapshot(doc(firestore(), 'doctors', doctor.id), (snap) => {
      const d = snap.data();
      if (!d) {
        setMerged(doctor);
        return;
      }
      const fee = {
        video: typeof d.fee?.video === 'number' ? d.fee.video : doctor.fee.video,
        text: typeof d.fee?.text === 'number' ? d.fee.text : doctor.fee.text,
      };
      setMerged({
        ...doctor,
        name: d.name ?? doctor.name,
        qualifications: d.qualifications ?? doctor.qualifications,
        specialty: d.specialty ?? doctor.specialty,
        registration: d.registration ?? doctor.registration,
        experienceYears:
          typeof d.experienceYears === 'number' ? d.experienceYears : doctor.experienceYears,
        languages: d.languages ?? doctor.languages,
        timezone: d.timezone ?? doctor.timezone,
        fee,
        clinic: {
          name: d.clinic?.name ?? doctor.clinic.name,
          address: d.clinic?.address ?? doctor.clinic.address,
          phone: d.clinic?.phone ?? doctor.clinic.phone,
        },
        hasVideo: fee.video > 0,
      });
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor.id]);

  return <DoctorContext.Provider value={merged}>{children}</DoctorContext.Provider>;
}

export function useDoctor(): PublicDoctor {
  const d = useContext(DoctorContext);
  if (!d) throw new Error('useDoctor must be used inside <DoctorProvider>');
  return d;
}
