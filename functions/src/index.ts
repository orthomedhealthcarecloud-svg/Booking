import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { materializeAvailability } from './availability';
export { onAppointmentCreated, onAppointmentUpdated, closeChatSessions } from './chat';
export { onPrescriptionWritten } from './prescriptions';
export { notifyOnAppointmentCreated } from './notifications';
