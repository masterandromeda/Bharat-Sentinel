'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
        fill="url(#sl-fill)" stroke="url(#sl-stroke)" strokeWidth="0.8"
      />
      <circle cx="17" cy="17" r="2.8" fill="white" opacity=".95"/>
      <circle cx="17" cy="10" r="1.7" fill="white" opacity=".65"/>
      <circle cx="11" cy="21" r="1.7" fill="white" opacity=".65"/>
      <circle cx="23" cy="21" r="1.7" fill="white" opacity=".65"/>
      <line x1="17" y1="14.2" x2="17" y2="11.7" stroke="white" strokeWidth="1" strokeLinecap="round" opacity=".45"/>
      <line x1="14.6" y1="18.5" x2="12.5" y2="20.2" stroke="white" strokeWidth="1" strokeLinecap="round" opacity=".45"/>
      <line x1="19.4" y1="18.5" x2="21.5" y2="20.2" stroke="white" strokeWidth="1" strokeLinecap="round" opacity=".45"/>
      <defs>
        <linearGradient id="sl-fill" x1="4.5" y1="2.5" x2="29.5" y2="31.5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1d4ed8"/>
          <stop offset="100%" stopColor="#6d28d9"/>
        </linearGradient>
        <linearGradient id="sl-stroke" x1="4.5" y1="2.5" x2="29.5" y2="31.5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity=".5"/>
          <stop offset="100%" stopColor="#a78bfa" stopOpacity=".2"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { backendOnline } = useMonitoring();

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-50"
      style={{ width: 220, background: '#070b17', borderRight: '1px solid rgba(30,50,90,0.9)' }}
    >
      {/* Brand */}
      <div style={{ padding: '18px 16px 16px', borderBottom: '1px solid rgba(30,50,90,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldLogo />
          <div>
            <p className="soc-brand-name">BharatSentinel</p>
            <p className="soc-brand-sub">AI-Native Security Platform</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        <p className="soc-nav-section">Main Menu</p>

        {navItems.map(({ href, label, sub, icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
            || (href === '/dashboard' && (pathname === '/dashboard' || pathname === '/'));
          return (
            <Link
              key={href}
              href={href}
              className={`soc-nav-item ${active ? 'soc-nav-item-active' : ''}`}
            >
              <span className="soc-nav-icon" style={{ color: active ? '#60a5fa' : '#3d5575' }}>
                {icon}
              </span>
              <span className="soc-nav-item-label">
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: active ? 600 : 500, color: active ? '#93c5fd' : '#4a6080' }}>
                  {label}
                </span>
                <span className="soc-nav-item-sub">{sub}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(30,50,90,0.7)' }}>
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 7, padding: '10px 12px', border: '1px solid rgba(30,50,90,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: backendOnline ? '#10b981' : '#ef4444',
            }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: backendOnline ? '#10b981' : '#f87171' }}>
              {backendOnline ? 'All Systems Operational' : 'Backend Offline'}
            </span>
          </div>
          <p style={{ fontSize: 9, color: '#2d4060', letterSpacing: '0.02em', lineHeight: 1.5 }}>
            AI Agents · Human Control · Continuous Security
          </p>
        </div>
        <p style={{ fontSize: 9, color: '#1a2840', textAlign: 'center', marginTop: 8, letterSpacing: '0.04em' }}>
          BharatSentinel™ 2025
        </p>
      </div>
    </aside>
  );
}
