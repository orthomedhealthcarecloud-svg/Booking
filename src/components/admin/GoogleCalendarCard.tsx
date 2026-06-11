'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { useDoctor } from '@/components/DoctorProvider';
import { firestore } from '@/lib/firebase/client';

type GcalState = {
  connectedEmail?: string;
  connectedAt?: { seconds: number } | number;
  calendarId?: string;
};

export function GoogleCalendarCard() {
  const doctor = useDoctor();
  const { user } = useAuth();
  const [gcal, setGcal] = useState<GcalState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(firestore(), 'doctors', doctor.id), (s) => {
      const data = s.data();
      setGcal((data?.googleCalendar as GcalState | undefined) ?? null);
    });
    return () => unsub();
  }, [doctor.id]);

  const connect = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      window.location.href = `/api/google/oauth/start?doctor=${doctor.slug}&token=${encodeURIComponent(token)}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start OAuth');
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!user) return;
    if (!confirm('Disconnect Google Calendar? New bookings will stop creating calendar events.')) return;
    setBusy(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/google/oauth/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ doctorId: doctor.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disconnect failed');
    } finally {
      setBusy(false);
    }
  };

  const connected = Boolean(gcal?.connectedEmail);

  return (
    <div className="card">
      <h3 style={{ fontSize: 15, marginBottom: 6 }}>Google Calendar</h3>
      <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: 0, marginBottom: 14 }}>
        Connect once. Every booking will create an event on your calendar with a unique Google Meet link.
      </p>

      {connected ? (
        <>
          <div
            className="row"
            style={{
              padding: '12px 14px',
              background: 'var(--ok-tint)',
              border: '1px solid transparent',
              borderRadius: 10,
              marginBottom: 12,
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>Connected</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                {gcal?.connectedEmail} · calendar: {gcal?.calendarId || 'primary'}
              </div>
            </div>
            <span className="chip chip-ok">
              <span className="dot" /> Active
            </span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={disconnect} disabled={busy}>
            {busy ? '…' : 'Disconnect'}
          </button>
        </>
      ) : (
        <button className="btn btn-primary" onClick={connect} disabled={busy}>
          {busy ? 'Redirecting…' : 'Connect Google Calendar'}
        </button>
      )}

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 10 }}>{error}</p>
      )}
    </div>
  );
}
