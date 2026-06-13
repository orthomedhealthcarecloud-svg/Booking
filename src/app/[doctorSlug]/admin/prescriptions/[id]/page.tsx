'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useDoctor } from '@/components/DoctorProvider';
import { Icon } from '@/components/ui/Icon';
import { firestore } from '@/lib/firebase/client';
import { fmtDateLong } from '@/lib/format';
import type { PrescriptionDoc } from '@/lib/types';

const esc = (s: string) =>
  (s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c));

export default function PrescriptionView() {
  const doctor = useDoctor();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [rx, setRx] = useState<PrescriptionDoc | null>(null);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(firestore(), 'prescriptions', id)).then((s) => {
      if (s.exists()) setRx({ id: s.id, ...(s.data() as Omit<PrescriptionDoc, 'id'>) });
    });
  }, [id]);

  const print = () => {
    if (!rx) return;
    const date = fmtDateLong((rx.issuedAt as number) || Date.now(), doctor.timezone);
    const medRows = rx.medications
      .map(
        (m, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td class="med"><strong>${esc(m.name)}</strong>${m.strength ? ` <span class="str">${esc(m.strength)}</span>` : ''}</td>
          <td class="ins">${esc(m.instructions || '')}</td>
        </tr>`,
      )
      .join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Prescription</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: Georgia, 'Times New Roman', serif; color: #14223a; margin: 0; padding: 40px; }
      .sheet { max-width: 720px; margin: 0 auto; }
      .head { display: flex; justify-content: space-between; align-items: flex-start;
        border-bottom: 2px solid #1e7fc3; padding-bottom: 14px; }
      .doc-name { font-size: 22px; font-weight: 700; color: #1e7fc3; }
      .doc-sub { font-size: 13px; color: #44546b; margin-top: 2px; }
      .clinic { text-align: right; font-size: 12px; color: #44546b; max-width: 240px; }
      .pt { display: flex; justify-content: space-between; font-size: 14px; margin: 18px 0 6px; }
      .dx { font-size: 14px; margin: 6px 0 16px; }
      .rx { font-size: 40px; color: #1e7fc3; font-weight: 700; line-height: 1; margin: 8px 0 4px; }
      table { width: 100%; border-collapse: collapse; font-size: 14px; }
      td { padding: 8px 6px; border-bottom: 1px solid #e6ebf2; vertical-align: top; }
      td.num { width: 28px; color: #8593a8; }
      td.med { width: 45%; } .str { color: #44546b; font-weight: 400; }
      td.ins { color: #2a3a55; }
      .advice { margin-top: 20px; font-size: 14px; }
      .advice .lbl { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #8593a8; }
      .sign { margin-top: 60px; text-align: right; font-size: 13px; }
      .sign .line { border-top: 1px solid #14223a; width: 200px; display: inline-block; padding-top: 4px; }
      .foot { margin-top: 30px; font-size: 11px; color: #8593a8; text-align: center;
        border-top: 1px solid #e6ebf2; padding-top: 10px; }
      @media print { body { padding: 0; } }
    </style></head>
    <body><div class="sheet">
      <div class="head">
        <div>
          <div class="doc-name">${esc(doctor.name)}</div>
          <div class="doc-sub">${esc(doctor.qualifications || '')}</div>
          ${doctor.registration ? `<div class="doc-sub">Reg. No: ${esc(doctor.registration)}</div>` : ''}
        </div>
        <div class="clinic">
          ${doctor.clinic?.name ? `<div><b>${esc(doctor.clinic.name)}</b></div>` : ''}
          ${doctor.clinic?.address ? `<div>${esc(doctor.clinic.address)}</div>` : ''}
          ${doctor.clinic?.phone ? `<div>${esc(doctor.clinic.phone)}</div>` : ''}
        </div>
      </div>
      <div class="pt">
        <div><b>Patient:</b> ${esc(rx.patientName || '—')}</div>
        <div><b>Date:</b> ${esc(date)}</div>
      </div>
      ${rx.diagnosis ? `<div class="dx"><b>Diagnosis:</b> ${esc(rx.diagnosis)}</div>` : ''}
      <div class="rx">&#8478;</div>
      <table><tbody>${medRows || '<tr><td colspan="3" style="color:#8593a8">No medicines listed.</td></tr>'}</tbody></table>
      ${rx.advice ? `<div class="advice"><div class="lbl">Advice</div>${esc(rx.advice)}</div>` : ''}
      <div class="sign"><span class="line">${esc(doctor.name)}</span></div>
      <div class="foot">This is a digitally generated prescription via Medi.</div>
    </div>
    <script>window.onload = function(){ window.print(); }</script>
    </body></html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  if (!rx) return <div style={{ padding: 40, color: 'var(--ink-3)' }}>Loading…</div>;

  return (
    <div data-screen-label="Prescription">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>
          <Icon name="chevronLeft" size={14} /> Back
        </button>
        <button className="btn btn-primary" onClick={print}>
          <Icon name="file" size={16} /> Print / Save PDF
        </button>
      </div>

      <div className="card" style={{ padding: 28, maxWidth: 720 }}>
        <div
          className="row"
          style={{ justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--primary)', paddingBottom: 14, marginBottom: 18 }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>{doctor.name}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{doctor.qualifications}</div>
            {doctor.registration && (
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Reg. No: {doctor.registration}</div>
            )}
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--ink-3)', maxWidth: 240 }}>
            {doctor.clinic?.name && <div style={{ fontWeight: 600 }}>{doctor.clinic.name}</div>}
            {doctor.clinic?.address && <div>{doctor.clinic.address}</div>}
            {doctor.clinic?.phone && <div>{doctor.clinic.phone}</div>}
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
          <div>
            <strong>Patient:</strong> {rx.patientName || '—'}
          </div>
          <div>
            <strong>Date:</strong> {fmtDateLong((rx.issuedAt as number) || Date.now(), doctor.timezone)}
          </div>
        </div>
        {rx.diagnosis && (
          <div style={{ fontSize: 14, marginBottom: 14 }}>
            <strong>Diagnosis:</strong> {rx.diagnosis}
          </div>
        )}

        <div style={{ fontSize: 32, color: 'var(--primary)', fontWeight: 700, lineHeight: 1 }}>&#8478;</div>
        <table className="tbl" style={{ marginTop: 8 }}>
          <tbody>
            {rx.medications.length === 0 ? (
              <tr>
                <td style={{ color: 'var(--ink-3)' }}>No medicines listed.</td>
              </tr>
            ) : (
              rx.medications.map((m, i) => (
                <tr key={i}>
                  <td style={{ width: 28, color: 'var(--ink-3)' }}>{i + 1}</td>
                  <td style={{ width: '45%' }}>
                    <strong>{m.name}</strong>{' '}
                    {m.strength && <span style={{ color: 'var(--ink-3)' }}>{m.strength}</span>}
                  </td>
                  <td style={{ color: 'var(--ink-2)' }}>{m.instructions}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {rx.advice && (
          <div style={{ marginTop: 18, fontSize: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              Advice
            </div>
            {rx.advice}
          </div>
        )}
      </div>
    </div>
  );
}
