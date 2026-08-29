'use client';
import { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, logout, changePassword } = useAuth();
  const router = useRouter();

  // Change-password form
  const [curPw,  setCurPw]  = useState('');
  const [newPw,  setNewPw]  = useState('');
  const [confPw, setConfPw] = useState('');
  const [pwMsg,  setPwMsg]  = useState('');
  const [pwErr,  setPwErr]  = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwErr(''); setPwMsg('');
    if (newPw.length < 8) { setPwErr('New password must be at least 8 characters.'); return; }
    if (newPw !== confPw)  { setPwErr('Passwords do not match.'); return; }
    setPwBusy(true);
    try {
      await changePassword(curPw, newPw);
      setPwMsg('✓ Password changed successfully.');
      setCurPw(''); setNewPw(''); setConfPw('');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } }; message?: string };
      setPwErr(ax?.response?.data?.detail || ax?.message || 'Failed to change password.');
    } finally {
      setPwBusy(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(40,60,110,0.6)',
    borderRadius: 7, color: '#e2e8f0', fontSize: 13, outline: 'none',
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.01em' }}>Settings</h1>
        <p style={{ color: '#4a5f7a', fontSize: 13, marginTop: 4 }}>
          Platform configuration · Account management · Environment
        </p>
      </div>

      {/* ── Account & Security ──────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '20px 22px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Account &amp; Security
          </h2>
          <span style={{
            fontSize: 9.5, fontWeight: 700, color: '#10b981',
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 4, padding: '2px 8px', letterSpacing: '0.06em',
          }}>
            AUTHENTICATED
          </span>
        </div>

        {/* Current user info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
          background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.18)',
          borderRadius: 10, marginBottom: 18,
        }}>
          {/* Avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'linear-gradient(135deg, #1d4ed8, #6d28d9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{user?.email ?? '—'}</div>
            <div style={{ fontSize: 11, color: '#4a6080', marginTop: 2 }}>
              Account created {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN') : '—'}
            </div>
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#3d5575', marginBottom: 2 }}>Session</div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#10b981',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Active
            </div>
          </div>
        </div>

        {/* Change password form */}
        <div style={{ borderTop: '1px solid rgba(30,50,90,0.45)', paddingTop: 18 }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
            Change Password
          </h3>
          <form onSubmit={handleChangePassword}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#4a6080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
                  Current Password
                </label>
                <input
                  type="password" value={curPw} onChange={e => setCurPw(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password" required style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#4a6080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
                  New Password
                </label>
                <input
                  type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                  placeholder="Min 8 chars" autoComplete="new-password" required style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#4a6080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
                  Confirm New Password
                </label>
                <input
                  type="password" value={confPw} onChange={e => setConfPw(e.target.value)}
                  placeholder="••••••••" autoComplete="new-password" required style={inputStyle}
                />
              </div>
            </div>

            {pwErr && (
              <div style={{ marginBottom: 10, fontSize: 11.5, color: '#f87171', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '7px 12px' }}>
                ⚠ {pwErr}
              </div>
            )}
            {pwMsg && (
              <div style={{ marginBottom: 10, fontSize: 11.5, color: '#34d399', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, padding: '7px 12px' }}>
                {pwMsg}
              </div>
            )}

            <button type="submit" disabled={pwBusy} style={{
              padding: '9px 20px', borderRadius: 7,
              background: pwBusy ? 'rgba(37,99,235,0.25)' : 'rgba(37,99,235,0.15)',
              border: '1px solid rgba(37,99,235,0.3)',
              color: pwBusy ? '#4a6080' : '#93c5fd',
              fontSize: 12, fontWeight: 700, cursor: pwBusy ? 'not-allowed' : 'pointer',
              letterSpacing: '0.04em',
            }}>
              {pwBusy ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Logout */}
        <div style={{ borderTop: '1px solid rgba(30,50,90,0.45)', paddingTop: 16, marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#94a3b8' }}>Sign Out</div>
            <div style={{ fontSize: 11, color: '#3d5575', marginTop: 2 }}>
              Terminate your session and return to login
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '9px 18px', borderRadius: 7,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.04em',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
          >
            ⏻ Sign Out
          </button>
        </div>
      </div>

      {/* ── Environment ──────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '20px 22px', marginBottom: 14 }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
          Environment
        </h2>
        <div style={{ fontSize: 12 }}>
          {[
            { label: 'Backend URL',    value: 'http://localhost:8081', code: true },
            { label: 'WebSocket',      value: 'ws://localhost:8081/ws/events', code: true },
            { label: 'AI Engine',      value: 'AZURE_OPENAI_API_KEY in backend .env', code: false },
            { label: 'Notion',         value: 'NOTION_API_KEY + NOTION_DATABASE_ID in backend .env', code: false },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(30,50,90,0.3)' }}>
              <span style={{ color: '#4a5f7a' }}>{row.label}</span>
              {row.code ? (
                <code style={{ color: '#60a5fa', fontSize: 11.5, background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>{row.value}</code>
              ) : (
                <span style={{ color: '#4a6080', fontSize: 11.5 }}>{row.value}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Configure ────────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '20px 22px' }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          Configure
        </h2>
        <p style={{ color: '#4a5f7a', fontSize: 12.5, lineHeight: 1.65 }}>
          All credentials are configured via the backend{' '}
          <code style={{ color: '#60a5fa', fontSize: 11.5 }}>.env</code> file.
          Copy <code style={{ color: '#60a5fa', fontSize: 11.5 }}>.env.example</code> to{' '}
          <code style={{ color: '#60a5fa', fontSize: 11.5 }}>.env</code> and fill in your Azure OpenAI and Notion
          credentials. The JWT secret key is set via{' '}
          <code style={{ color: '#60a5fa', fontSize: 11.5 }}>JWT_SECRET_KEY</code>.
          Never commit <code style={{ color: '#60a5fa', fontSize: 11.5 }}>.env</code> to source control.
        </p>
      </div>
    </div>
  );
}
