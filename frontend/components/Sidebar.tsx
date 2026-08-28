'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWebSocket } from '@/lib/useWebSocket';
import { useMonitoring } from '@/lib/useMonitoring';

interface NavItem {
  href: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    sub: 'Real-time Overview',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x=".5" y=".5" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/>
        <rect x="8.5" y=".5" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/>
        <rect x=".5" y="8.5" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/>
        <rect x="8.5" y="8.5" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/>
      </svg>
    ),
  },
  {
    href: '/agents',
    label: 'AI Agents',
    sub: 'Agent Control Center',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
        <circle cx="2.5" cy="11.5" r="1.8" stroke="currentColor" strokeWidth="1.3"/>
        <circle cx="12.5" cy="11.5" r="1.8" stroke="currentColor" strokeWidth="1.3"/>
        <line x1="7.5" y1="7" x2="2.5" y2="9.7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        <line x1="7.5" y1="7" x2="12.5" y2="9.7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/incidents',
    label: 'Incidents',
    sub: 'Investigation Hub',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M7.5 1.5L13.5 12.5H1.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        <line x1="7.5" y1="5.5" x2="7.5" y2="8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="7.5" cy="10.3" r=".7" fill="currentColor"/>
      </svg>
    ),
  },
  {
    href: '/reports',
    label: 'Reports',
    sub: 'Analytics & Reports',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1.5" y="1" width="9" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <line x1="4" y1="4.5" x2="8" y2="4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        <line x1="4" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        <line x1="4" y1="9.5" x2="7" y2="9.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    sub: 'Platform Settings',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M7.5 1.5v1.2M7.5 12.3v1.2M1.5 7.5h1.2M12.3 7.5h1.2M3.1 3.1l.85.85M11.05 11.05l.85.85M3.1 11.9l.85-.85M11.05 4.1l.85-.85"
          stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
];

function ShieldLogo() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-label="BharatSentinel">
      <path
        d="M17 2.5L4.5 8V17.5C4.5 24.1 10 30 17 31.5C24 30 29.5 24.1 29.5 17.5V8L17 2.5Z"
        fill="url(#sl-fill2)" stroke="url(#sl-stroke2)" strokeWidth="0.8"
      />
      <circle cx="17" cy="17" r="2.8" fill="white" opacity=".95"/>
      <circle cx="17" cy="10" r="1.7" fill="white" opacity=".65"/>
      <circle cx="11" cy="21" r="1.7" fill="white" opacity=".65"/>
      <circle cx="23" cy="21" r="1.7" fill="white" opacity=".65"/>
      <line x1="17" y1="14.2" x2="17" y2="11.7" stroke="white" strokeWidth="1" strokeLinecap="round" opacity=".45"/>
      <line x1="14.6" y1="18.5" x2="12.5" y2="20.2" stroke="white" strokeWidth="1" strokeLinecap="round" opacity=".45"/>
      <line x1="19.4" y1="18.5" x2="21.5" y2="20.2" stroke="white" strokeWidth="1" strokeLinecap="round" opacity=".45"/>
      <defs>
        <linearGradient id="sl-fill2" x1="4.5" y1="2.5" x2="29.5" y2="31.5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1d4ed8"/>
          <stop offset="100%" stopColor="#6d28d9"/>
        </linearGradient>
        <linearGradient id="sl-stroke2" x1="4.5" y1="2.5" x2="29.5" y2="31.5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity=".5"/>
          <stop offset="100%" stopColor="#a78bfa" stopOpacity=".2"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// One system status row in the sidebar footer
function SysRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0' }}>
      <span style={{ fontSize: 10.5, color: '#3d5575' }}>{label}</span>
      <span style={{ fontSize: 10.5, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { connected } = useWebSocket();
  const { backendOnline, status } = useMonitoring();

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-50"
      style={{ width: 220, background: 'rgba(5,8,18,0.97)', borderRight: '1px solid rgba(30,50,90,0.9)' }}
    >
      {/* Brand */}
      <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid rgba(30,50,90,0.7)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldLogo />
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#f0f6ff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              BharatSentinel
            </p>
            <p style={{ fontSize: 8.5, fontWeight: 600, color: '#1d4ed8', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
              AI-Native Security Platform
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(71,85,105,0.65)', padding: '14px 16px 5px' }}>
          Main Menu
        </p>

        {navItems.map(({ href, label, sub, icon }) => {
          const active = pathname === href
            || (href !== '/dashboard' && pathname.startsWith(href + '/'))
            || (href === '/dashboard' && (pathname === '/dashboard' || pathname === '/'));
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 14px', margin: '1px 8px', borderRadius: 7,
                fontSize: 12.5, fontWeight: active ? 600 : 500,
                textDecoration: 'none',
                color: active ? '#93c5fd' : '#4a6080',
                background: active ? 'rgba(37,99,235,0.1)' : 'transparent',
                border: `1px solid ${active ? 'rgba(37,99,235,0.18)' : 'transparent'}`,
                position: 'relative',
                transition: 'all 0.12s',
              }}
            >
              {active && (
                <span style={{
                  position: 'absolute', left: 0, top: '20%', bottom: '20%',
                  width: 2, borderRadius: '0 2px 2px 0', background: '#3b82f6',
                }} />
              )}
              <span style={{ color: active ? '#60a5fa' : '#3d5575', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {icon}
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 12.5 }}>{label}</span>
                <span style={{ fontSize: 10, color: active ? '#3b5288' : '#2d3f5a', lineHeight: 1 }}>{sub}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      {/* System Status Panel — matches reference bottom-left */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(30,50,90,0.7)', flexShrink: 0 }}>
        <div style={{ background: 'rgba(0,0,0,0.35)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(30,50,90,0.5)', marginBottom: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4a6080', marginBottom: 7 }}>
            System Status
          </div>
          <SysRow label="Monitoring" value="ACTIVE" color="#10b981" />
          <SysRow label="Backend" value={backendOnline ? 'ONLINE' : 'OFFLINE'} color={backendOnline ? '#10b981' : '#ef4444'} />
          <SysRow label="AI Engine" value={status?.llm_backend ? status.llm_backend.toUpperCase() : 'ONLINE'} color="#10b981" />
          <SysRow label="Event Stream" value={connected ? 'CONNECTED' : 'OFFLINE'} color={connected ? '#10b981' : '#f59e0b'} />
          <SysRow label="Agents" value="3/3 ONLINE" color="#10b981" />
        </div>

        {/* All systems operational */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: backendOnline ? '#10b981' : '#ef4444', flexShrink: 0 }} />
          <span style={{ fontSize: 10.5, color: backendOnline ? '#10b981' : '#f87171', fontWeight: 600 }}>
            {backendOnline ? 'All systems operational' : 'Backend offline'}
          </span>
        </div>
        <p style={{ fontSize: 8.5, color: '#1a2840', textAlign: 'center', marginTop: 6, letterSpacing: '0.04em' }}>
          BharatSentinel™ 2025
        </p>
      </div>
    </aside>
  );
}
