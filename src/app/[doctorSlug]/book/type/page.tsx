'use client';

import { useRouter } from 'next/navigation';
import { useDoctor } from '@/components/DoctorProvider';
import { useBooking } from '@/components/BookingProvider';
import { Icon } from '@/components/ui/Icon';
import { Stepper } from '@/components/ui/Stepper';
import { fmtMoney } from '@/lib/format';
import type { ConsultationType } from '@/lib/types';

type Option = {
  id: ConsultationType;
  icon: 'video' | 'chat';
  title: string;
  price: number;
  blurb: string;
  dur: string;
};

export default function BookTypePage() {
  const doctor = useDoctor();
  const router = useRouter();
  const { draft, patch } = useBooking();

  const options: Option[] = [
    {
      id: 'video',
      icon: 'video',
      title: 'Video consultation',
      price: doctor.fee.video,
      blurb: 'Face-to-face on Google Meet. Best for new pain, range-of-motion assessment, post-op review.',
      dur: '30 min',
    },
    {
      id: 'text',
      icon: 'chat',
      title: 'Text consultation',
      price: doctor.fee.text,
      blurb: 'Chat within a 30-minute window. Good for report review, physio progress, prescription refills.',
      dur: '30 min window',
    },
  ];
  const filtered = doctor.hasVideo ? options : options.filter((o) => o.id !== 'video');

  return (
    <div className="patient-wrap" data-screen-label="Book — Type" style={{ maxWidth: 760 }}>
      <Stepper current={0} />
      <h1 style={{ marginBottom: 8 }}>How would you like to consult?</h1>
      <p style={{ color: 'var(--ink-2)', marginBottom: 28 }}>
        Both options give you a digital prescription afterwards.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: filtered.length > 1 ? '1fr 1fr' : '1fr',
          gap: 14,
        }}
      >
        {filtered.map((opt) => (
          <button
            key={opt.id}
            onClick={() => {
              patch({ type: opt.id });
              router.push(`/${doctor.slug}/book/slot`);
            }}
            className="card"
            style={{
              textAlign: 'left',
              cursor: 'pointer',
              padding: 22,
              border: draft.type === opt.id ? '1px solid var(--ink)' : '1px solid var(--line)',
              background: 'var(--surface)',
            }}
          >
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'var(--primary-tint)',
                  color: 'var(--primary)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon name={opt.icon} size={20} />
              </div>
              <span className="mono" style={{ fontSize: 18, fontWeight: 500 }}>
                {fmtMoney(opt.price)}
              </span>
            </div>
            <h3 style={{ marginBottom: 6 }}>{opt.title}</h3>
            <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.5, margin: 0, marginBottom: 14 }}>
              {opt.blurb}
            </p>
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }} className="row">
              <Icon name="clock" size={14} /> {opt.dur}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
