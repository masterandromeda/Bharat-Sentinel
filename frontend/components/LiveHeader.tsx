'use client';
import { useEffect, useState } from 'react';
import { useWebSocket } from '@/lib/useWebSocket';
import { useMonitoring } from '@/lib/useMonitoring';

function formatUptime(uptime: string): string {
  const parts = uptime.split(':').map(Number);
  if (parts.length !== 3) return uptime;
  const [h, m, s] = parts;
  if (h >= 24) { const d = Math.floor(h / 24); return `${d}d ${h % 24}h ${m}m`; }
  return `${h}h ${m}m ${s}s`;
}

function DubeyTechBadge() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'linear-gradient(135deg, rgba(10,14,35,0.9) 0%, rgba(6,10,24,0.95) 100%)',
      border: '1px solid rgba(37,99,235,0.25)',
      borderRadius: 12, padding: '8px 16px 8px 10px',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 0 20px rgba(37,99,235,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 9,
        background: 'linear-gradient(135deg, #1d4ed8 0%, #6d28d9 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, boxShadow: '0 0 14px rgba(37,99,235,0.5)',
      }}>
        <svg width="21" height="21" viewBox="0 0 20 20" fill="none">
          <path d="M10 1.5L2.5 5v6c0 3.9 3 7.5 7.5 8.5C15 18.5 18 14.9 18 11V5L10 1.5Z"
            fill="url(#dt-g)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6"/>
          <circle cx="10" cy="10" r="2.2" fill="white" opacity=".9"/>
          <circle cx="10" cy="5.5" r="1.3" fill="white" opacity=".5"/>
          <defs>
            <linearGradient id="dt-g" x1="2.5" y1="1.5" x2="18" y2="19" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2563eb"/><stop offset="1" stopColor="#7c3aed"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#f0f6ff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Dubey Tech</div>
        <div style={{ fontSize: 8.5, fontWeight: 600, color: '#3b82f6', letterSpacing: '0.09em', textTransform: 'uppercase', marginTop: 1 }}>Cybersecurity Solutions</div>
      </div>
    </div>
  );
}

export default function LiveHeader() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [blink, setBlink] = useState(true);
  const { connected } = useWebSocket();
  const { backendOnline, status } = useMonitoring();

  useEffect(() => {
    function tick() {
      const now = new Date();
      const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      setTime(`${String(ist.getHours()).padStart(2,'0')}:${String(ist.getMinutes()).padStart(2,'0')}:${String(ist.getSeconds()).padStart(2,'0')}`);
      setDate(ist.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }));
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 1200);
    return () => clearInterval(t);
  }, []);

  const uptime = status?.uptime ? formatUptime(status.uptime) : '—';

  return (
    <div style={{
      height: 68,
      background: 'linear-gradient(180deg, rgba(3,5,16,0.98) 0%, rgba(4,7,20,0.96) 100%)',
      borderBottom: '1px solid rgba(37,99,235,0.2)',
      display: 'flex', alignItems: 'center',
      padding: '0 20px 0 24px',
      backdropFilter: 'blur(20px)',
      position: 'relative', zIndex: 50, flexShrink: 0,
      boxShadow: '0 1px 0 rgba(37,99,235,0.1), 0 4px 20px rgba(0,0,0,0.3)',
    }}>
      {/* Subtle top accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent 0%, rgba(37,99,235,0.4) 30%, rgba(6,182,212,0.5) 50%, rgba(124,58,237,0.4) 70%, transparent 100%)',
      }} />

      {/* LEFT: Brand title */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Shield mark */}
        <div style={{ flexShrink: 0 }}>
          <svg width="36" height="36" viewBox="0 0 34 34" fill="none">
            <path d="M17 2.5L4.5 8V17.5C4.5 24.1 10 30 17 31.5C24 30 29.5 24.1 29.5 17.5V8L17 2.5Z"
              fill="url(#hdr-fill)" stroke="url(#hdr-stroke)" strokeWidth="0.8"/>
            <circle cx="17" cy="17" r="2.8" fill="white" opacity=".95"/>
            <circle cx="17" cy="10" r="1.7" fill="white" opacity=".6"/>
            <circle cx="11" cy="21" r="1.7" fill="white" opacity=".6"/>
            <circle cx="23" cy="21" r="1.7" fill="white" opacity=".6"/>
            <defs>
              <linearGradient id="hdr-fill" x1="4.5" y1="2.5" x2="29.5" y2="31.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1d4ed8"/><stop offset="1" stopColor="#6d28d9"/>
              </linearGradient>
              <linearGradient id="hdr-stroke" x1="4.5" y1="2.5" x2="29.5" y2="31.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#60a5fa" stopOpacity=".6"/><stop offset="1" stopColor="#a78bfa" stopOpacity=".2"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div>
          {/* Big chrome neon brand name */}
          <div style={{
            fontSize: 20, fontWeight: 900, letterSpacing: '0.08em',
            background: 'linear-gradient(135deg, #e2e8f0 0%, #93c5fd 40%, #06b6d4 60%, #a78bfa 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none', lineHeight: 1,
            filter: 'drop-shadow(0 0 8px rgba(6,182,212,0.3))',
          }}>
            BHARATSENTINEL
          </div>
          <div style={{
            fontSize: 8.5, fontWeight: 700, color: '#3b82f6',
            letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 3,
          }}>
            AI-NATIVE SECURITY PLATFORM
          </div>
        </div>
      </div>

      {/* CENTER: Status pills — compact */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: backendOnline ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${backendOnline ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          borderRadius: 6, padding: '4px 10px',
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: backendOnline ? '#10b981' : '#ef4444',
            display: 'inline-block',
            boxShadow: backendOnline ? '0 0 5px #10b981' : '0 0 5px #ef4444',
            opacity: backendOnline && blink ? 1 : 0.6,
            transition: 'opacity 0.4s',
          }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: backendOnline ? '#10b981' : '#ef4444', letterSpacing: '0.08em' }}>
            {backendOnline ? 'BACKEND ONLINE' : 'BACKEND OFFLINE'}
          </span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: connected ? 'rgba(59,130,246,0.08)' : 'rgba(245,158,11,0.08)',
          border: `1px solid ${connected ? 'rgba(59,130,246,0.2)' : 'rgba(245,158,11,0.2)'}`,
          borderRadius: 6, padding: '4px 10px',
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: connected ? '#60a5fa' : '#f59e0b',
            display: 'inline-block',
            opacity: connected && blink ? 1 : 0.5,
            transition: 'opacity 0.4s',
          }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: connected ? '#60a5fa' : '#f59e0b', letterSpacing: '0.08em' }}>
            {connected ? 'WS LIVE' : 'WS OFF'}
          </span>
        </div>
      </div>

      {/* RIGHT: Clock + Dubey Tech */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 20 }}>
        {/* Clock */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#06b6d4', fontFamily: 'monospace', letterSpacing: '0.04em', lineHeight: 1, textShadow: '0 0 12px rgba(6,182,212,0.4)' }}>
            {time || '00:00:00'}
            <span style={{ fontSize: 10, fontWeight: 700, color: '#0891b2', marginLeft: 4, letterSpacing: '0.06em' }}>IST</span>
          </div>
          <div style={{ fontSize: 9, color: '#3d5575', marginTop: 2 }}>{date}</div>
          <div style={{ fontSize: 8.5, color: '#4a6080', marginTop: 1 }}>Uptime: <span style={{ color: '#0891b2', fontFamily: 'monospace' }}>{uptime}</span></div>
        </div>
        <DubeyTechBadge />
      </div>
    </div>
  );
}
