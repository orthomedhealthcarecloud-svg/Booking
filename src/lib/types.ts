// Shared domain types matching the Firestore collections defined in
// dr-manoj-telemed-architecture.md §3. Times are ISO strings or millis at
// the boundary; Firestore Timestamps are converted as needed.

export type UserRole = 'patient' | 'admin' | 'assistant';

export interface UserDoc {
  authUid: string;
  phone: string;
  email?: string;
  name?: string;
  age?: number;
  gender?: 'Female' | 'Male' | 'Other';
  city?: string;
  createdAt: number;
  updatedAt: number;
  role: UserRole;
}

export type ConsultationType = 'video' | 'text';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface AppointmentDoc {
  id: string;
  patientId: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  patientAge?: number | null;
  patientGender?: string;
  doctorId: string;
  type: ConsultationType;
  status: AppointmentStatus;
  startTime: number; // UTC millis
  endTime: number;
  meetUrl?: string | null; // populated per booking when Google Calendar is connected
  calendarEventId?: string | null;
  calendarHtmlLink?: string | null;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  amountPaid?: number;
  chiefComplaint: string;
  notesForDoctor?: string;
  doctorNotes?: string;
  documents?: string[]; // document doc IDs
  createdAt: number;
  updatedAt: number;
}

export interface AvailabilityInstanceDoc {
  id: string; // `${doctorId}_${YYYYMMDD}_${HHMM}`
  doctorId: string;
  date: string; // YYYY-MM-DD
  startTime: number;
  endTime: number;
  allowedTypes: ConsultationType[];
  isBooked: boolean;
  appointmentId: string | null;
  source: 'template' | 'manual';
}

export interface AvailabilityTemplateDoc {
  id: string;
  doctorId: string;
  dayOfWeek: number; // 0 = Sun, 6 = Sat
  blocks: Array<{
    startMinute: number; // minutes from midnight, local doctor tz
    endMinute: number;
    allowedTypes: ConsultationType[];
  }>;
  slotDurationMinutes: number;
  isActive: boolean;
}

export interface ChatSessionDoc {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  startTime: number;
  endTime: number;
  status: 'scheduled' | 'active' | 'closed';
  transcriptUrl?: string;
}

export interface ChatMessageDoc {
  id: string;
  senderId: string;
  senderRole: 'patient' | 'doctor';
  text: string;
  attachments?: string[];
  createdAt: number;
}

export interface DocumentDoc {
  id: string;
  patientId: string;
  appointmentId?: string;
  fileType: 'mri' | 'xray' | 'ecg' | 'lab' | 'prescription' | 'other';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: number;
}

export interface PrescriptionDoc {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  medications: Array<{
    name: string;
    dose: string;
    frequency: string;
    duration: string;
    notes?: string;
  }>;
  advice: string;
  followUp?: { in: string; mode: ConsultationType | 'in-person' };
  pdfUrl?: string;
  issuedAt: number;
}

export interface AuditLogDoc {
  id: string;
  actorId: string;
  actorRole: UserRole | 'system' | 'razorpay';
  action: string;
  targetType: string;
  targetId: string;
  meta?: Record<string, unknown>;
  createdAt: number;
}
