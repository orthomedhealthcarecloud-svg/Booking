import 'server-only';

export type DoctorConfig = {
  slug: string;
  id: string;
  name: string;
  qualifications: string;
  specialty: string;
  registration: string;
  experienceYears: number;
  languages: string;
  timezone: string;
  fee: { video: number; text: number };
  googleMeetUrl: string;
  adminEmail: string;
  clinic: {
    name: string;
    address: string;
    phone: string;
  };
};

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const DOCTORS: Record<string, DoctorConfig> = {
  manoj: {
    slug: 'manoj',
    id: 'manoj',
    name: process.env.DOCTOR_MANOJ_NAME || 'Dr. Manoj Iyer',
    qualifications: process.env.DOCTOR_MANOJ_QUALIFICATIONS || 'MS Ortho, DNB · Orthopaedic Surgeon',
    specialty: process.env.DOCTOR_MANOJ_SPECIALTY || 'Orthopaedic Surgeon',
    registration: process.env.DOCTOR_MANOJ_REGISTRATION || '',
    experienceYears: num(process.env.DOCTOR_MANOJ_EXPERIENCE_YEARS, 18),
    languages: process.env.DOCTOR_MANOJ_LANGUAGES || 'English, Hindi, Marathi',
    timezone: process.env.DOCTOR_MANOJ_TIMEZONE || 'Asia/Kolkata',
    fee: {
      video: num(process.env.DOCTOR_MANOJ_VIDEO_FEE, 800),
      text: num(process.env.DOCTOR_MANOJ_TEXT_FEE, 500),
    },
    googleMeetUrl: process.env.DOCTOR_MANOJ_GOOGLE_MEET_URL || '',
    adminEmail: process.env.DOCTOR_MANOJ_ADMIN_EMAIL || '',
    clinic: {
      name: process.env.DOCTOR_MANOJ_CLINIC_NAME || '',
      address: process.env.DOCTOR_MANOJ_CLINIC_ADDRESS || '',
      phone: process.env.DOCTOR_MANOJ_CLINIC_PHONE || '',
    },
  },
  manoj2: {
    slug: 'manoj2',
    id: 'manoj2',
    name: process.env.DOCTOR_MANOJ2_NAME || 'Dr. Manoj',
    qualifications: process.env.DOCTOR_MANOJ2_QUALIFICATIONS || '',
    specialty: process.env.DOCTOR_MANOJ2_SPECIALTY || '',
    registration: process.env.DOCTOR_MANOJ2_REGISTRATION || '',
    experienceYears: num(process.env.DOCTOR_MANOJ2_EXPERIENCE_YEARS, 0),
    languages: process.env.DOCTOR_MANOJ2_LANGUAGES || '',
    timezone: process.env.DOCTOR_MANOJ2_TIMEZONE || 'Asia/Kolkata',
    fee: {
      video: num(process.env.DOCTOR_MANOJ2_VIDEO_FEE, 800),
      text: num(process.env.DOCTOR_MANOJ2_TEXT_FEE, 500),
    },
    googleMeetUrl: process.env.DOCTOR_MANOJ2_GOOGLE_MEET_URL || '',
    adminEmail: process.env.DOCTOR_MANOJ2_ADMIN_EMAIL || '',
    clinic: {
      name: process.env.DOCTOR_MANOJ2_CLINIC_NAME || '',
      address: process.env.DOCTOR_MANOJ2_CLINIC_ADDRESS || '',
      phone: process.env.DOCTOR_MANOJ2_CLINIC_PHONE || '',
    },
  },
};

export function getDoctor(slug: string): DoctorConfig | null {
  return DOCTORS[slug] ?? null;
}

export function listDoctors(): DoctorConfig[] {
  return Object.values(DOCTORS);
}

export function doctorSlugs(): string[] {
  return Object.keys(DOCTORS);
}
