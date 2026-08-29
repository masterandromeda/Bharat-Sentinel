'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWebSocket } from '@/lib/useWebSocket';
import { useMonitoring } from '@/lib/useMonitoring';
import { useAuth } from '@/lib/AuthContext';

interface NavItem { href: string; label: string; sub: string; icon: React.ReactNode; }

const navItems: NavItem[] = [
  {
    href: '/dashboard', label: 'Dashboard', sub: 'Real-time Overview',
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x=".5" y=".5" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/>
      <rect x="8.5" y=".5" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/>
      <rect x=".5" y="8.5" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/>
      <rect x="8.5" y="8.5" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/>
    </svg>,
  },
  {
    href: '/agents', label: 'AI Agents', sub: 'Agent Control Center',
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="2.5" cy="11.5" r="1.8" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="12.5" cy="11.5" r="1.8" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="7.5" y1="7" x2="2.5" y2="9.7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      <line x1="7.5" y1="7" x2="12.5" y2="9.7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>,
  },
  {
    href: '/incidents', label: 'Incidents', sub: 'Investigation Hub',
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1.5L13.5 12.5H1.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <line x1="7.5" y1="5.5" x2="7.5" y2="8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="7.5" cy="10.3" r=".7" fill="currentColor"/>
    </svg>,
  },
  {
    href: '/reports', label: 'Reports', sub: 'Analytics & Reports',
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="1" width="9" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="4" y1="4.5" x2="8" y2="4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      <line x1="4" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      <line x1="4" y1="9.5" x2="7" y2="9.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>,
  },
  {
    href: '/settings', label: 'Settings', sub: 'Platform Settings',
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7.5 1.5v1.2M7.5 12.3v1.2M1.5 7.5h1.2M12.3 7.5h1.2M3.1 3.1l.85.85M11.05 11.05l.85.85M3.1 11.9l.85-.85M11.05 4.1l.85-.85"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>,
  },
];

function SysRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3.5px 0' }}>
      <span style={{ fontSize: 10, color: '#3d5575' }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { connected } = useWebSocket();
  const { backendOnline, status } = useMonitoring();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-full flex flex-col z-50"
      style={{ width: 220, background: 'rgba(3,5,15,0.98)', borderRight: '1px solid rgba(37,99,235,0.15)' }}>

      {/* Top accent line */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.4), transparent)', flexShrink: 0 }} />

      {/* Nav section label only — no logo (logo is in header) */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        <p style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'rgba(71,85,105,0.55)', padding: '16px 16px 6px' }}>
          Navigation
        </p>

        {navItems.map(({ href, label, sub, icon }) => {
          const active = pathname === href
            || (href !== '/dashboard' && pathname.startsWith(href + '/'))
            || (href === '/dashboard' && (pathname === '/dashboard' || pathname === '/'));
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px', margin: '1px 8px', borderRadius: 8,
              fontSize: 12.5, fontWeight: active ? 600 : 500,
              textDecoration: 'none',
              color: active ? '#93c5fd' : '#4a6080',
              background: active ? 'rgba(37,99,235,0.12)' : 'transparent',
              border: `1px solid ${active ? 'rgba(37,99,235,0.22)' : 'transparent'}`,
              position: 'relative', transition: 'all 0.12s',
              boxShadow: active ? '0 0 12px rgba(37,99,235,0.06)' : 'none',
            }}>
              {active && <span style={{
                position: 'absolute', left: 0, top: '18%', bottom: '18%',
                width: 2.5, borderRadius: '0 3px 3px 0',
                background: 'linear-gradient(180deg, #3b82f6, #6366f1)',
                boxShadow: '0 0 6px #3b82f6',
              }} />}
              <span style={{ color: active ? '#60a5fa' : '#3d5575', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {icon}
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 12.5 }}>{label}</span>
                <span style={{ fontSize: 9.5, color: active ? '#3b5288' : '#2d3f5a', lineHeight: 1 }}>{sub}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      {/* System Status */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(37,99,235,0.12)', flexShrink: 0 }}>
        <div style={{
          background: 'rgba(0,0,0,0.4)', borderRadius: 9,
          padding: '10px 12px', border: '1px solid rgba(30,50,90,0.5)', marginBottom: 8,
        }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2d4060', marginBottom: 7 }}>
            System Status
          </div>
          <SysRow label="Monitoring" value="ACTIVE" color="#10b981" />
          <SysRow label="Backend" value={backendOnline ? 'ONLINE' : 'OFFLINE'} color={backendOnline ? '#10b981' : '#ef4444'} />
          <SysRow label="AI Engine" value={(status?.llm_backend || 'rule-based').toUpperCase()} color="#60a5fa" />
          <SysRow label="WebSocket" value={connected ? 'LIVE' : 'OFF'} color={connected ? '#10b981' : '#f59e0b'} />
          <SysRow label="Agents" value="3/3 READY" color="#10b981" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: backendOnline ? '#10b981' : '#ef4444', flexShrink: 0, boxShadow: backendOnline ? '0 0 5px #10b981' : 'none' }} />
          <span style={{ fontSize: 10, color: backendOnline ? '#10b981' : '#f87171', fontWeight: 600 }}>
            {backendOnline ? 'All systems operational' : 'Backend offline'}
          </span>
        </div>

        {user && (
          <div style={{
            marginTop: 8, padding: '7px 10px',
            background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)',
            borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: 'linear-gradient(135deg, #1d4ed8, #6d28d9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: 11, fontWeight: 800, color: '#fff',
              boxShadow: '0 0 8px rgba(37,99,235,0.3)',
            }}>
              {user.email[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              <div style={{ fontSize: 8, color: '#10b981', marginTop: 1 }}>● Authenticated</div>
            </div>
            <button onClick={() => logout()} title="Logout" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#3d5575', fontSize: 12, padding: '2px 4px', flexShrink: 0,
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = '#3d5575')}>
              ⏻
            </button>
          </div>
        )}

        <p style={{ fontSize: 8, color: '#1a2840', textAlign: 'center', marginTop: 7, letterSpacing: '0.04em' }}>
          BharatSentinel™ 2025
        </p>
      </div>
    </aside>
  );
}
