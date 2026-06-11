'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useAuth } from '@/components/AuthProvider';
import { useDoctor } from '@/components/DoctorProvider';
import { useBooking } from '@/components/BookingProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Stepper } from '@/components/ui/Stepper';
import { fmtDate, fmtMoney, fmtTime } from '@/lib/format';

type RazorpayResp = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };

declare global {
  interface Window {
    Razorpay?: new (opts: object) => { open: () => void };
  }
}

export default function BookPayPage() {
  const doctor = useDoctor();
  const router = useRouter();
  const { user } = useAuth();
  const { draft, reset } = useBooking();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!draft.slot || !draft.form.complaint) router.replace(`/${doctor.slug}/book/details`);
  }, [draft, router, doctor.slug]);

  const fee = draft.type === 'video' ? doctor.fee.video : doctor.fee.text;
  const gst = Math.round(fee * 0.18);
  const total = fee + gst;

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      // 1. Create Razorpay order on the server.
      const orderRes = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountInPaise: total * 100,
          doctorId: doctor.id,
          type: draft.type,
          startMillis: draft.slot!.startMillis,
          endMillis: draft.slot!.endMillis,
        }),
      });
      if (!orderRes.ok) throw new Error('Could not create order');
      const order = (await orderRes.json()) as { id: string; amount: number; currency: string };

      // 2. Open Razorpay checkout.
      const rzp = new window.Razorpay!({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: doctor.name,
        description: `${draft.type === 'video' ? 'Video' : 'Text'} consultation`,
        order_id: order.id,
        prefill: {
          name: draft.form.name,
          email: draft.form.email,
          contact: draft.form.phone || user?.phoneNumber || '',
        },
        theme: { color: '#1e7fc3' },
        handler: async (resp: RazorpayResp) => {
          try {
            const finalize = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${await user!.getIdToken()}`,
              },
              body: JSON.stringify({
                ...resp,
                doctorId: doctor.id,
                type: draft.type,
                startMillis: draft.slot!.startMillis,
                endMillis: draft.slot!.endMillis,
                chiefComplaint: draft.form.complaint,
                notesForDoctor: draft.form.notes,
                amountPaid: total,
                form: draft.form,
              }),
            });
            if (!finalize.ok) throw new Error((await finalize.json()).error || 'Verification failed');
            const { appointmentId } = (await finalize.json()) as { appointmentId: string };
            reset();
            router.push(`/${doctor.slug}/book/done?id=${appointmentId}`);
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Payment verification failed');
          }
        },
      });
      rzp.open();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not start payment');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="patient-wrap" data-screen-label="Book — Payment" style={{ maxWidth: 760 }}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Stepper current={3} />
      <h1 style={{ marginBottom: 8 }}>Review and pay</h1>
      <p style={{ color: 'var(--ink-2)', marginBottom: 28 }}>You won&apos;t be charged until you confirm.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        <div className="card">
          <h3
            style={{
              marginBottom: 16,
              fontSize: 14,
              color: 'var(--ink-3)',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Consultation
          </h3>
          <div className="row" style={{ gap: 14, marginBottom: 18 }}>
            <Avatar name={doctor.name} />
            <div>
              <div style={{ fontWeight: 500 }}>{doctor.name}</div>
              <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>{doctor.qualifications}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 14 }}>
            <div>
              <div style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 2 }}>Mode</div>
              <div>{draft.type === 'video' ? 'Video' : 'Text'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 2 }}>Duration</div>
              <div>30 minutes</div>
            </div>
            <div>
              <div style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 2 }}>Date</div>
              <div>{draft.slot ? fmtDate(draft.slot.startMillis, doctor.timezone) : '—'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 2 }}>Time</div>
              <div className="mono">
                {draft.slot ? fmtTime(draft.slot.startMillis, doctor.timezone) : '—'}
              </div>
            </div>
          </div>
          <hr className="divider" />
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 6 }}>Chief complaint</div>
          <div>{draft.form.complaint}</div>
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <h3
            style={{
              marginBottom: 16,
              fontSize: 14,
              color: 'var(--ink-3)',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Summary
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-2)' }}>Consultation fee</span>
              <span className="mono">{fmtMoney(fee)}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-2)' }}>GST (18%)</span>
              <span className="mono">{fmtMoney(gst)}</span>
            </div>
            <hr className="divider" style={{ margin: '6px 0' }} />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 500 }}>Total</span>
              <span className="mono" style={{ fontSize: 20, fontWeight: 500 }}>
                {fmtMoney(total)}
              </span>
            </div>
          </div>
          <button
            className="btn btn-primary btn-full btn-lg"
            style={{ marginTop: 18 }}
            onClick={pay}
            disabled={busy}
          >
            {busy ? 'Opening…' : `Pay ${fmtMoney(total)} via Razorpay`}
          </button>
          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10, textAlign: 'center' }}>{error}</p>
          )}
          <div
            className="row"
            style={{ gap: 6, marginTop: 14, justifyContent: 'center', color: 'var(--ink-3)', fontSize: 12 }}
          >
            <Icon name="lock" size={12} /> Secured by Razorpay · 256-bit TLS
          </div>
        </div>
      </div>
    </div>
  );
}
