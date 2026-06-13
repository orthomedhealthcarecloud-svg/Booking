'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { useDoctor } from '@/components/DoctorProvider';
import { useConsultAlert } from '@/components/admin/ConsultAlert';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { firestore } from '@/lib/firebase/client';
import { fmtTime } from '@/lib/format';
import type { AppointmentDoc, ChatMessageDoc } from '@/lib/types';

export default function AdminAppointmentDetail() {
  const doctor = useDoctor();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const { setAlert } = useConsultAlert();
  const [appt, setAppt] = useState<AppointmentDoc | null>(null);
  const [messages, setMessages] = useState<ChatMessageDoc[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [extending, setExtending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Tick every second so the countdown + 5-min warning update live.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(firestore(), 'appointments', id), (s) => {
      if (s.exists()) setAppt({ id: s.id, ...(s.data() as Omit<AppointmentDoc, 'id'>) });
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!id || !appt || appt.type !== 'text') return;
    const q = query(
      collection(firestore(), 'chat_sessions', id, 'messages'),
      orderBy('createdAt', 'asc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows: ChatMessageDoc[] = [];
      snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as Omit<ChatMessageDoc, 'id'>) }));
      setMessages(rows);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    return () => unsub();
  }, [id, appt]);

  const status: 'before' | 'active' | 'closed' = useMemo(() => {
    if (!appt) return 'before';
    if (now < appt.startTime) return 'before';
    if (now >= appt.endTime) return 'closed';
    return 'active';
  }, [appt, now]);

  const msLeft = appt && status === 'active' ? appt.endTime - now : 0;
  const endingSoon = status === 'active' && msLeft > 0 && msLeft <= 5 * 60 * 1000;

  // Drive the red sidebar warning when <5 min remain on an active consult.
  useEffect(() => {
    setAlert(endingSoon);
    return () => setAlert(false);
  }, [endingSoon, setAlert]);

  const mmss = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const extend = async () => {
    if (!appt || !user) return;
    setExtending(true);
    try {
      const token = await user.getIdToken();
      await fetch('/api/consult/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ appointmentId: appt.id }),
      });
      // appt.endTime refreshes via the onSnapshot listener.
    } finally {
      setExtending(false);
    }
  };

  const send = async () => {
    if (!appt || !user || !draft.trim()) return;
    const text = draft;
    setDraft('');
    setError(null);
    try {
      await addDoc(collection(firestore(), 'chat_sessions', appt.id, 'messages'), {
        senderId: user.uid,
        senderRole: 'doctor',
        text,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send');
      setDraft(text);
    }
  };

  if (!appt) return <div style={{ padding: 40, color: 'var(--ink-3)' }}>Loading…</div>;
  const joinable = Date.now() >= appt.startTime - 5 * 60 * 1000 && Date.now() < appt.endTime;

  return (
    <div
      data-screen-label="Consultation"
      style={
        appt.type === 'text'
          ? { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }
          : { maxWidth: 820 }
      }
    >
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/${doctor.slug}/admin/appointments`)}>
          <Icon name="chevronLeft" size={14} /> Consultations
        </button>
        <div className="row" style={{ gap: 8 }}>
          <Link href={`/${doctor.slug}/admin/appointments/${appt.id}/prescribe`} className="btn btn-secondary btn-sm">
            <Icon name="pill" size={14} /> Write prescription
          </Link>
          <Link href={`/${doctor.slug}/admin/patients/${appt.patientId}`} className="btn btn-ghost btn-sm">
            Open patient file <Icon name="chevronRight" size={14} />
          </Link>
        </div>
      </div>

      {/* Patient + action */}
      <div className="card" style={{ padding: 22, marginBottom: 18 }}>
        <div className="row" style={{ gap: 16 }}>
          <Avatar name={appt.patientName || 'Patient'} size="lg" />
          <div style={{ flex: 1 }}>
            <div className="row" style={{ gap: 10 }}>
              <h2 style={{ fontSize: 20 }}>{appt.patientName || `Patient #${appt.patientId.slice(0, 6)}`}</h2>
              {status === 'active' && <Chip variant="live" dot>Live</Chip>}
            </div>
            <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>
              {appt.patientAge ? `${appt.patientAge} y · ` : ''}
              {appt.patientGender || ''} ·{' '}
              <span className="mono">{fmtTime(appt.startTime, doctor.timezone)}</span> ·{' '}
              {appt.type === 'video' ? 'Video' : 'Text'} · {appt.chiefComplaint}
            </div>
          </div>
          {appt.type === 'video' &&
            (joinable && appt.meetUrl ? (
              <a href={appt.meetUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                <Icon name="video" size={16} /> Join Google Meet
              </a>
            ) : (
              <button className="btn btn-secondary" disabled>
                {Date.now() >= appt.endTime ? 'Ended' : `Opens ${fmtTime(appt.startTime, doctor.timezone)}`}
              </button>
            ))}
        </div>
      </div>

      {/* Web chat for text consults */}
      {appt.type === 'text' && (
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)' }} className="row">
            <Icon name="chat" size={15} />
            <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 8 }}>Web chat</span>
            <div className="spacer" style={{ flex: 1 }} />
            {status === 'before' && <Chip>Opens {fmtTime(appt.startTime, doctor.timezone)}</Chip>}
            {status === 'active' && (
              <div className="row" style={{ gap: 8 }}>
                <span
                  className="mono"
                  style={{ fontSize: 13, fontWeight: 600, color: endingSoon ? '#e5484d' : 'var(--ink-2)' }}
                >
                  {mmss(msLeft)} left
                </span>
                <button className="btn btn-secondary btn-sm" onClick={extend} disabled={extending}>
                  {extending ? '…' : '+5 min'}
                </button>
              </div>
            )}
            {status === 'closed' && (
              <div className="row" style={{ gap: 8 }}>
                <Chip>Closed</Chip>
                <button className="btn btn-secondary btn-sm" onClick={extend} disabled={extending}>
                  {extending ? '…' : 'Reopen +5 min'}
                </button>
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--surface-2)' }}>
            {messages.length === 0 && (
              <div style={{ alignSelf: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No messages yet.</div>
            )}
            {messages.map((m) => {
              const mine = m.senderRole === 'doctor';
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    maxWidth: '72%',
                    background: mine ? 'var(--primary)' : 'var(--surface)',
                    color: mine ? '#fff' : 'var(--ink)',
                    border: mine ? 'none' : '1px solid var(--line)',
                    borderRadius: 12,
                    padding: '8px 12px',
                    fontSize: 14,
                  }}
                >
                  {m.text}
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <div style={{ padding: 12, borderTop: '1px solid var(--line)' }} className="row">
            <input
              className="input"
              style={{ flex: 1 }}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={status === 'active' ? 'Type a message…' : 'Chat is open only during the consultation window'}
              disabled={status !== 'active'}
            />
            <button className="btn btn-primary" style={{ marginLeft: 8 }} onClick={send} disabled={status !== 'active' || !draft.trim()}>
              Send
            </button>
          </div>
          {error && <div style={{ color: 'var(--danger)', fontSize: 12, padding: '0 14px 12px' }}>{error}</div>}
        </div>
      )}
    </div>
  );
}
