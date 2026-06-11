import Link from 'next/link';
import { listDoctors } from '@/lib/doctors';

export default function HomePage() {
  const doctors = listDoctors();
  return (
    <div className="patient-wrap" style={{ paddingTop: 120 }}>
      <div className="brand" style={{ marginBottom: 40 }}>
        <div className="logo">M</div>
        <span>Medi</span>
      </div>
      <h1 style={{ marginBottom: 14 }}>Choose a doctor</h1>
      <p style={{ color: 'var(--ink-2)', marginBottom: 28, maxWidth: 520 }}>
        Each doctor has their own clinic page. Patients book directly with a single specialist.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {doctors.map((d) => (
          <Link key={d.slug} href={`/${d.slug}`} className="card" style={{ textDecoration: 'none' }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>/{d.slug}</div>
            <h3 style={{ marginBottom: 6 }}>{d.name}</h3>
            <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: 0 }}>{d.qualifications}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
