import type { PrescriptionDoc } from '@/lib/types';

type PrintDoctor = {
  name: string;
  qualifications?: string;
  registration?: string;
  timezone?: string;
  clinic?: { name?: string; address?: string; phone?: string };
};

const esc = (s: string) =>
  (s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c));

/** Opens a clean, doctor-style prescription in a new window and triggers print/save-as-PDF. */
export function printPrescription(rx: PrescriptionDoc, doctor: PrintDoctor) {
  const date = new Date((rx.issuedAt as number) || Date.now()).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: doctor.timezone || 'Asia/Kolkata',
  });

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
}
