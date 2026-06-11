'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useDoctor } from '@/components/DoctorProvider';
import { Brand } from '@/components/ui/Brand';
import { firebaseAuth } from '@/lib/firebase/client';

export default function AdminLoginPage() {
  const doctor = useDoctor();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth(), email, password);
      router.replace(`/${doctor.slug}/admin`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="patient-wrap" style={{ maxWidth: 460, padding: '80px 40px' }}>
      <Brand />
      <div style={{ marginTop: 40 }}>
        <h1 style={{ fontSize: 28, marginBottom: 10 }}>Doctor sign-in</h1>
        <p style={{ color: 'var(--ink-2)', marginBottom: 28 }}>
          Sign in with the email registered for {doctor.name}.
        </p>
        <div className="field" style={{ marginBottom: 16 }}>
          <label>Email</label>
          <input
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="username"
          />
        </div>
        <div className="field" style={{ marginBottom: 20 }}>
          <label>Password</label>
          <input
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </div>
        <button className="btn btn-primary btn-full btn-lg" onClick={submit} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {error && (
          <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 14, textAlign: 'center' }}>{error}</p>
        )}
      </div>
    </div>
  );
}
