'use client';

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import type { AppointmentDoc } from '@/lib/types';

export function subscribePatientAppointments(
  patientUid: string,
  doctorId: string,
  cb: (rows: AppointmentDoc[]) => void,
): Unsubscribe {
  const q = query(
    collection(firestore(), 'appointments'),
    where('patientId', '==', patientUid),
    where('doctorId', '==', doctorId),
    orderBy('startTime', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    const rows: AppointmentDoc[] = [];
    snap.forEach((doc) => rows.push({ id: doc.id, ...(doc.data() as Omit<AppointmentDoc, 'id'>) }));
    cb(rows);
  });
}

export function subscribeDoctorAppointments(
  doctorId: string,
  cb: (rows: AppointmentDoc[]) => void,
): Unsubscribe {
  const q = query(
    collection(firestore(), 'appointments'),
    where('doctorId', '==', doctorId),
    orderBy('startTime', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    const rows: AppointmentDoc[] = [];
    snap.forEach((doc) => rows.push({ id: doc.id, ...(doc.data() as Omit<AppointmentDoc, 'id'>) }));
    cb(rows);
  });
}

export function subscribeDoctorAppointmentsByDate(
  doctorId: string,
  dateStr: string,
  cb: (rows: AppointmentDoc[]) => void,
): Unsubscribe {
  const startOfDay = new Date(`${dateStr}T00:00:00Z`).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
  const q = query(
    collection(firestore(), 'appointments'),
    where('doctorId', '==', doctorId),
    where('startTime', '>=', startOfDay),
    where('startTime', '<', endOfDay),
    orderBy('startTime', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    const rows: AppointmentDoc[] = [];
    snap.forEach((doc) => rows.push({ id: doc.id, ...(doc.data() as Omit<AppointmentDoc, 'id'>) }));
    cb(rows);
  });
}
