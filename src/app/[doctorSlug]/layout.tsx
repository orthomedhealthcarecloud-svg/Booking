import { notFound } from 'next/navigation';
import { doctorSlugs, getDoctor } from '@/lib/doctors';
import { DoctorProvider } from '@/components/DoctorProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { BookingProvider } from '@/components/BookingProvider';
import type { PublicDoctor } from '@/lib/doctorsClient';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return doctorSlugs().map((slug) => ({ doctorSlug: slug }));
}

export default function DoctorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { doctorSlug: string };
}) {
  const doc = getDoctor(params.doctorSlug);
  if (!doc) notFound();

  const publicDoc: PublicDoctor = {
    slug: doc.slug,
    id: doc.id,
    name: doc.name,
    qualifications: doc.qualifications,
    specialty: doc.specialty,
    registration: doc.registration,
    experienceYears: doc.experienceYears,
    languages: doc.languages,
    timezone: doc.timezone,
    fee: doc.fee,
    // Video is offered whenever the doctor has a video fee configured. The per-booking
    // Meet link is created dynamically via the doctor's connected Google Calendar
    // (doc.googleMeetUrl is only an optional static fallback).
    hasVideo: doc.fee.video > 0,
    clinic: { ...doc.clinic },
  };

  return (
    <AuthProvider>
      <DoctorProvider doctor={publicDoc}>
        <BookingProvider doctorSlug={doc.slug}>{children}</BookingProvider>
      </DoctorProvider>
    </AuthProvider>
  );
}
