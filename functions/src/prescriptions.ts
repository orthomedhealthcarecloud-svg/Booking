import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import PDFDocument from 'pdfkit';

type Prescription = {
  doctorId: string;
  patientId: string;
  appointmentId: string;
  diagnosis: string;
  medications: Array<{
    name: string;
    dose: string;
    frequency: string;
    duration: string;
    notes?: string;
  }>;
  advice?: string;
  followUp?: { in: string; mode: string };
  issuedAt: number;
};

export const onPrescriptionWritten = onDocumentWritten('prescriptions/{rxId}', async (event) => {
  const after = event.data?.after.data() as Prescription | undefined;
  if (!after) return;
  if (!after.medications?.length) return;

  const db = getFirestore();
  const bucket = getStorage().bucket();
  const filePath = `prescriptions/${after.doctorId}/${event.params.rxId}.pdf`;
  const file = bucket.file(filePath);

  // Build PDF
  const chunks: Buffer[] = [];
  const pdf = new PDFDocument({ size: 'A4', margin: 48 });
  pdf.on('data', (c) => chunks.push(c));
  const finished = new Promise<Buffer>((resolve) => pdf.on('end', () => resolve(Buffer.concat(chunks))));

  pdf.fontSize(18).text('Prescription', { align: 'left' });
  pdf.moveDown(0.5);
  pdf.fontSize(10).fillColor('#888').text(`Patient ${after.patientId} · Appointment ${after.appointmentId}`);
  pdf.fillColor('#000');
  pdf.moveDown(1.5);

  pdf.fontSize(12).text(`Diagnosis: ${after.diagnosis || '—'}`);
  pdf.moveDown(1);
  pdf.fontSize(13).text('Medications', { underline: true });
  pdf.moveDown(0.5);
  after.medications.forEach((m, i) => {
    pdf.fontSize(11).fillColor('#000').text(`${i + 1}. ${m.name}`, { continued: false });
    pdf.fontSize(10).fillColor('#555').text(`   ${m.dose} · ${m.frequency} · ${m.duration}`);
    if (m.notes) pdf.fontSize(9).fillColor('#888').text(`   ${m.notes}`);
    pdf.moveDown(0.4);
  });
  pdf.fillColor('#000');
  pdf.moveDown(1);
  if (after.advice) {
    pdf.fontSize(13).text('General advice', { underline: true });
    pdf.moveDown(0.4);
    pdf.fontSize(10).fillColor('#333').text(after.advice);
    pdf.fillColor('#000');
  }
  if (after.followUp) {
    pdf.moveDown(0.8);
    pdf.fontSize(11).text(`Follow-up: ${after.followUp.in} · ${after.followUp.mode}`);
  }
  pdf.moveDown(2);
  pdf.fontSize(9).fillColor('#888').text(`Issued ${new Date(after.issuedAt || Date.now()).toLocaleString('en-IN')}`);
  pdf.end();

  const buf = await finished;
  await file.save(buf, { contentType: 'application/pdf', resumable: false });
  await file.makePublic().catch(() => {});
  const url = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
  await db.collection('prescriptions').doc(event.params.rxId).update({ pdfUrl: url });
});
