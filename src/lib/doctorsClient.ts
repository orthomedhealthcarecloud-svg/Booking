// Public-facing doctor info safe to expose to the browser.
// The full DoctorConfig (with admin email etc.) lives in lib/doctors.ts and is server-only.

export type PublicDoctor = {
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
  hasVideo: boolean;
  clinic: { name: string; address: string; phone: string };
};
