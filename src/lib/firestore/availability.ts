'use client';

import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import type { AvailabilityInstanceDoc, ConsultationType } from '@/lib/types';

export async function fetchAvailability(
  doctorId: string,
  dateStr: string,
): Promise<AvailabilityInstanceDoc[]> {
  const q = query(
    collection(firestore(), 'availability_instances'),
    where('doctorId', '==', doctorId),
    where('date', '==', dateStr),
    orderBy('startTime', 'asc'),
  );
  const snap = await getDocs(q);
  const rows: AvailabilityInstanceDoc[] = [];
  snap.forEach((doc) => rows.push({ id: doc.id, ...(doc.data() as Omit<AvailabilityInstanceDoc, 'id'>) }));
  return rows;
}

export function isSlotAvailableForType(
  s: AvailabilityInstanceDoc,
  type: ConsultationType,
): boolean {
  return !s.isBooked && s.allowedTypes.includes(type);
}
