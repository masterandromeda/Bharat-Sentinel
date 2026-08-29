'use client';
import { useEffect, useState } from 'react';
import { useWebSocket } from '@/lib/useWebSocket';
import { useMonitoring } from '@/lib/useMonitoring';

/** Formats duration string "HH:MM:SS" from backend into "Xd Yh Zm Ws" */
function formatUptime(uptime: string): string {
  // uptime is "HH:MM:SS" from backend
  const parts = uptime.split(':').map(Number);
  if (parts.length !== 3) return uptime;
  const [h, m, s] = parts;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return `${d}d ${rh}h ${m}m ${s}s`;
  }
  return `${h}h ${m}m ${s}s`;
}

function DubeyTechBadge() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'rgba(10,14,30,0.85)',
      border: '1px solid rgba(30,50,90,0.9)',
      borderRadius: 10, padding: '7px 14px 7px 10px',
      backdropFilter: 'blur(8px)',
    }}>
      {/* Shield icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: 'linear-gradient(135deg, #1d4ed8 0%, #6d28d9 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, boxShadow: '0 0 12px rgba(37,99,235,0.4)',
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 1.5L2.5 5v6c0 3.9 3 7.5 7.5 8.5C15 18.5 18 14.9 18 11V5L10 1.5Z"
            fill="url(#dt-grad)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6"/>
          <circle cx="10" cy="10" r="2.2" fill="white" opacity=".9"/>
          <circle cx="10" cy="5.5" r="1.3" fill="white" opacity=".55"/>
          <line x1="10" y1="7.8" x2="10" y2="6.8" stroke="white" strokeWidth=".8" strokeLinecap="round" opacity=".4"/>
          <defs>
            <linearGradient id="dt-grad" x1="2.5" y1="1.5" x2="18" y2="19" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2563eb"/>
              <stop offset="1" stopColor="#7c3aed"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#f0f6ff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          Dubey Tech
        </div>
        <div style={{ fontSize: 9, fontWeight: 600, color: '#3b82f6', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 1 }}>
          Cybersecurity Solutions
        </div>
      </div>
    </div>
  );
}

export default function LiveHeader() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const { connected } = useWebSocket();
  const { backendOnline, status } = useMonitoring();

  // Tick every second — real clock
  useEffect(() => {
    function tick() {
      const now = new Date();
      // Format directly in IST timezone — works in all browsers
      const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const hh = String(istDate.getHours()).padStart(2, '0');
      const mm = String(istDate.getMinutes()).padStart(2, '0');
      const ss = String(istDate.getSeconds()).padStart(2, '0');
      setTime(`${hh}:${mm}:${ss}`);
      setDate(istDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }));
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const uptime = status?.uptime ? formatUptime(status.uptime) : '—';

  return (
    <div style={{
      height: 64,
      background: 'rgba(4,7,18,0.96)',
      borderBottom: '1px solid rgba(30,50,90,0.9)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 0,
      backdropFilter: 'blur(16px)',
      position: 'relative',
      zIndex: 50,
      flexShrink: 0,
    }}>
      {/* ── LEFT: Live clock + uptime ── */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#06b6d4', letterSpacing: '-0.02em', fontFamily: 'monospace', lineHeight: 1 }}>
            {time || '00:00:00'}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', letterSpacing: '0.06em', textTransform: 'uppercase' }}>IST</span>
        </div>
        <div style={{ fontSize: 10, color: '#3d5575', marginTop: 2, letterSpacing: '0.02em' }}>{date}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span style={{ fontSize: 9, color: '#4a6080', letterSpacing: '0.05em', textTransform: 'uppercase' }}>System Uptime</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#0891b2', fontFamily: 'monospace' }}>{uptime}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: backendOnline ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${backendOnline ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            borderRadius: 3, padding: '0px 5px',
            fontSize: 8, fontWeight: 700,
            color: backendOnline ? '#10b981' : '#ef4444',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
            {backendOnline ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* ── CENTER: BharatSentinel Brand ── */}
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div style={{
          fontSize: 22, fontWeight: 800, color: '#f0f6ff',
          letterSpacing: '-0.01em', lineHeight: 1.1,
        }}>
          BharatSentinel
        </div>
        <div style={{
          fontSize: 9.5, fontWeight: 600, color: '#3b82f6',
          letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 3,
        }}>
          AI-Native Security Platform
        </div>
        {/* Status pills row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 5 }}>
          <span style={{ fontSize: 9, color: '#3d5575', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            BACKEND
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 9, fontWeight: 700,
            color: backendOnline ? '#10b981' : '#ef4444', letterSpacing: '0.06em',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
            {backendOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
          <span style={{ width: 1, height: 10, background: 'rgba(30,50,90,0.8)', margin: '0 2px' }} />
          <span style={{ fontSize: 9, color: '#3d5575', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            WS
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 9, fontWeight: 700,
            color: connected ? '#10b981' : '#f59e0b', letterSpacing: '0.06em',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
            {connected ? 'LIVE' : 'OFF'}
          </span>
        </div>
      </div>

      {/* ── RIGHT: Dubey Tech badge ── */}
      <DubeyTechBadge />
    </div>
  );
}
