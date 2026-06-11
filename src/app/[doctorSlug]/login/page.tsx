'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { useDoctor } from '@/components/DoctorProvider';
import { useAuth } from '@/components/AuthProvider';
import { Brand } from '@/components/ui/Brand';
import { firebaseAuth } from '@/lib/firebase/client';

declare global {
  interface Window {
    __mediRecaptcha?: RecaptchaVerifier;
  }
}

export default function PatientLogin() {
  const doctor = useDoctor();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [stage, setStage] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('98765 43210');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmRef = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace(`/${doctor.slug}/dashboard`);
  }, [loading, user, router, doctor.slug]);

  const ensureRecaptcha = () => {
    if (typeof window === 'undefined') return null;
    // A reCAPTCHA token can only be used once. Tear down any previous verifier
    // so every send/resend gets a fresh token (avoids auth/invalid-app-credential).
    if (window.__mediRecaptcha) {
      try {
        window.__mediRecaptcha.clear();
      } catch {
        /* widget already removed */
      }
      window.__mediRecaptcha = undefined;
    }
    try {
      const verifier = new RecaptchaVerifier(firebaseAuth(), 'recaptcha-container', {
        size: 'invisible',
      });
      window.__mediRecaptcha = verifier;
      return verifier;
    } catch (e) {
      setError('Could not initialize reCAPTCHA. Check Firebase + reCAPTCHA setup.');
      return null;
    }
  };

  const sendOtp = async () => {
    setError(null);
    setBusy(true);
    try {
      const verifier = ensureRecaptcha();
      if (!verifier) throw new Error('reCAPTCHA unavailable');
      const e164 = '+91' + phone.replace(/\D/g, '');
      const confirmation = await signInWithPhoneNumber(firebaseAuth(), e164, verifier);
      confirmRef.current = confirmation;
      setStage('otp');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not send OTP');
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    setBusy(true);
    try {
      const code = otp.join('');
      if (!confirmRef.current) throw new Error('Session expired. Resend OTP.');
      await confirmRef.current.confirm(code);
      router.replace(`/${doctor.slug}/dashboard`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid code');
    } finally {
      setBusy(false);
    }
  };

  const handleOtp = (i: number, v: string) => {
    const next = [...otp];
    next[i] = v.slice(-1);
    setOtp(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };

  return (
    <div className="patient-wrap" data-screen-label="Login" style={{ maxWidth: 460, padding: '80px 40px' }}>
      <Brand onClick={() => router.push(`/${doctor.slug}`)} />
      <div style={{ marginTop: 40 }}>
        {stage === 'phone' ? (
          <>
            <h1 style={{ fontSize: 28, marginBottom: 10 }}>Sign in to book</h1>
            <p style={{ color: 'var(--ink-2)', marginBottom: 28 }}>
              We&apos;ll send a one-time code to your phone.
            </p>
            <div className="field" style={{ marginBottom: 20 }}>
              <label>Mobile number</label>
              <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 8 }}>
                <input className="input" value="+91" readOnly style={{ textAlign: 'center', color: 'var(--ink-2)' }} />
                <input
                  className="input mono"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98765 43210"
                />
              </div>
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={sendOtp} disabled={busy}>
              {busy ? 'Sending…' : 'Send OTP'}
            </button>
            {error && (
              <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 14, textAlign: 'center' }}>{error}</p>
            )}
            <p style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 18, textAlign: 'center' }}>
              By continuing you agree to our terms and privacy policy.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 28, marginBottom: 10 }}>Enter the code</h1>
            <p style={{ color: 'var(--ink-2)', marginBottom: 28 }}>
              Sent to <span className="mono">+91 {phone}</span> ·{' '}
              <a
                style={{ color: 'var(--primary)', cursor: 'pointer' }}
                onClick={() => {
                  setStage('phone');
                  confirmRef.current = null;
                }}
              >
                change
              </a>
            </p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {otp.map((v, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  className="input mono"
                  style={{ textAlign: 'center', fontSize: 22, padding: 0, height: 56, width: 48 }}
                  value={v}
                  onChange={(e) => handleOtp(i, e.target.value)}
                  maxLength={1}
                  inputMode="numeric"
                />
              ))}
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={verifyOtp} disabled={busy}>
              {busy ? 'Verifying…' : 'Verify and continue'}
            </button>
            {error && (
              <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 14, textAlign: 'center' }}>{error}</p>
            )}
            <p style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 16, textAlign: 'center' }}>
              Didn&apos;t get it?{' '}
              <a style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={sendOtp}>
                Resend
              </a>
            </p>
          </>
        )}
      </div>
      <div id="recaptcha-container" />
    </div>
  );
}
