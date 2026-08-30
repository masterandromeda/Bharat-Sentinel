'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();

  const [mode, setMode]         = useState<Mode>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email || !password) { setError('Email and password are required.'); return; }
    if (mode === 'register') {
      if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
      if (password !== confirm) { setError('Passwords do not match.'); return; }
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
      router.replace('/dashboard');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(ax?.response?.data?.detail || ax?.message || 'Authentication failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#03050f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background radial glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 70% 50% at 25% 30%, rgba(37,99,235,0.07) 0%, transparent 60%),
          radial-gradient(ellipse 50% 60% at 80% 75%, rgba(124,58,237,0.06) 0%, transparent 60%)
        `,
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

        {/* Logo + brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {/* Shield SVG */}
          <div style={{ display: 'inline-flex', marginBottom: 14 }}>
            <svg width="52" height="52" viewBox="0 0 34 34" fill="none">
              <path d="M17 2.5L4.5 8V17.5C4.5 24.1 10 30 17 31.5C24 30 29.5 24.1 29.5 17.5V8L17 2.5Z"
                fill="url(#login-fill)" stroke="url(#login-stroke)" strokeWidth="0.7"/>
              <circle cx="17" cy="17" r="2.8" fill="white" opacity=".95"/>
              <circle cx="17" cy="10" r="1.7" fill="white" opacity=".6"/>
              <circle cx="11" cy="21" r="1.7" fill="white" opacity=".6"/>
              <circle cx="23" cy="21" r="1.7" fill="white" opacity=".6"/>
              <line x1="17" y1="14.2" x2="17" y2="11.7" stroke="white" strokeWidth="1" strokeLinecap="round" opacity=".4"/>
              <line x1="14.6" y1="18.5" x2="12.5" y2="20.2" stroke="white" strokeWidth="1" strokeLinecap="round" opacity=".4"/>
              <line x1="19.4" y1="18.5" x2="21.5" y2="20.2" stroke="white" strokeWidth="1" strokeLinecap="round" opacity=".4"/>
              <defs>
                <linearGradient id="login-fill" x1="4.5" y1="2.5" x2="29.5" y2="31.5" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#1d4ed8"/><stop offset="100%" stopColor="#6d28d9"/>
                </linearGradient>
                <linearGradient id="login-stroke" x1="4.5" y1="2.5" x2="29.5" y2="31.5" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity=".4"/>
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity=".15"/>
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div style={{ fontSize: 26, fontWeight: 800, color: '#f0f6ff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            BharatSentinel
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 5 }}>
            AI-Native Security Platform
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(12,17,40,0.98) 0%, rgba(8,12,28,0.95) 100%)',
          border: '1px solid rgba(40,60,110,0.7)',
          borderRadius: 16,
          padding: '28px 28px 24px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Top accent line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), rgba(6,182,212,0.3), transparent)',
          }} />

          {/* Mode tabs */}
          <div style={{
            display: 'flex', gap: 0, marginBottom: 24,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(40,60,110,0.4)',
            borderRadius: 8, padding: 3,
          }}>
            {(['login', 'register'] as Mode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, padding: '7px 0',
                  background: mode === m ? 'rgba(37,99,235,0.2)' : 'transparent',
                  border: mode === m ? '1px solid rgba(37,99,235,0.3)' : '1px solid transparent',
                  borderRadius: 6,
                  color: mode === m ? '#93c5fd' : '#4a6080',
                  fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} autoComplete="on">
            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#4a6080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@bharatsentinel.in"
                autoComplete="email"
                required
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(40,60,110,0.6)',
                  borderRadius: 8, color: '#e2e8f0', fontSize: 13,
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(40,60,110,0.6)'}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: mode === 'register' ? 14 : 20 }}>
              <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#4a6080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(40,60,110,0.6)',
                  borderRadius: 8, color: '#e2e8f0', fontSize: 13,
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(40,60,110,0.6)'}
              />
            </div>

            {/* Confirm password (register only) */}
            {mode === 'register' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#4a6080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  style={{
                    width: '100%', padding: '10px 12px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(40,60,110,0.6)',
                    borderRadius: 8, color: '#e2e8f0', fontSize: 13,
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.6)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(40,60,110,0.6)'}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                marginBottom: 14, padding: '8px 12px', borderRadius: 7,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#f87171', fontSize: 12,
              }}>
                ⚠ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%', padding: '11px 0',
                background: submitting
                  ? 'rgba(37,99,235,0.3)'
                  : 'linear-gradient(135deg, #1d4ed8 0%, #6d28d9 100%)',
                border: '1px solid rgba(37,99,235,0.4)',
                borderRadius: 9, color: '#fff',
                fontSize: 13, fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.15s',
                opacity: submitting ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {submitting ? (
                <>
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    display: 'inline-block',
                    animation: 'spin 0.9s linear infinite',
                  }} />
                  {mode === 'login' ? 'Signing In…' : 'Creating Account…'}
                </>
              ) : (
                mode === 'login' ? 'Sign In to Platform' : 'Create Account'
              )}
            </button>
          </form>
        </div>

        {/* Demo credentials hint */}
        <div style={{
          marginTop: 16,
          padding: '10px 14px',
          borderRadius: 9,
          background: 'rgba(37,99,235,0.06)',
          border: '1px solid rgba(37,99,235,0.18)',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 10, color: '#4a6080', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>
            Demo Credentials
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
            <div>
              <span style={{ fontSize: 9.5, color: '#3d5575' }}>Email</span>
              <p style={{ fontSize: 12, color: '#93c5fd', fontWeight: 600, fontFamily: 'monospace', marginTop: 2 }}>
                demo@bharatsentinel.in
              </p>
            </div>
            <div style={{ width: 1, background: 'rgba(40,60,110,0.4)' }} />
            <div>
              <span style={{ fontSize: 9.5, color: '#3d5575' }}>Password</span>
              <p style={{ fontSize: 12, color: '#93c5fd', fontWeight: 600, fontFamily: 'monospace', marginTop: 2 }}>
                Demo@2026
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 10.5, color: '#1e3260', letterSpacing: '0.04em' }}>
          BharatSentinel™ · AI Agents. Human Control. Continuous Security.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #2d4060; }
      `}</style>
    </div>
  );
}
