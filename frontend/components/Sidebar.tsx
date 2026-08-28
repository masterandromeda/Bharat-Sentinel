'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/>
      </svg>
    ),
  },
  {
    href: '/agents',
    label: 'AI Agents',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="3" cy="12" r="1.8" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="13" cy="12" r="1.8" stroke="currentColor" strokeWidth="1.4"/>
        <line x1="8" y1="7.5" x2="3" y2="10.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="8" y1="7.5" x2="13" y2="10.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/incidents',
    label: 'Incidents',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 2L14.5 13H1.5L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <line x1="8" y1="6.5" x2="8" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="8" cy="11.2" r=".7" fill="currentColor"/>
      </svg>
    ),
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="1.5" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <line x1="5" y1="5.5" x2="9" y2="5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="5" y1="8" x2="10" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="5" y1="10.5" x2="8" y2="10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="13" cy="12" r="2.5" fill="#0f1629" stroke="currentColor" strokeWidth="1.2"/>
        <line x1="13" y1="10.8" x2="13" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="13" cy="12.8" r=".4" fill="currentColor"/>
      </svg>
    ),
  },
];

// BharatSentinel brand mark — shield with AI-node motif
function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      aria-label="BharatSentinel"
    >
      {/* Shield base */}
      <path
        d="M18 3L5 8.5V18.5C5 25.4 10.7 31.5 18 33C25.3 31.5 31 25.4 31 18.5V8.5L18 3Z"
        fill="url(#bs-shield-fill)"
        stroke="url(#bs-shield-stroke)"
        strokeWidth="1"
      />
      {/* Central node */}
      <circle cx="18" cy="18" r="3" fill="white" opacity="0.95"/>
      {/* Three orbit nodes */}
      <circle cx="18" cy="10.5" r="1.8" fill="white" opacity="0.7"/>
      <circle cx="11.8" cy="22" r="1.8" fill="white" opacity="0.7"/>
      <circle cx="24.2" cy="22" r="1.8" fill="white" opacity="0.7"/>
      {/* Connection lines */}
      <line x1="18" y1="15" x2="18" y2="12.3" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.5"/>
      <line x1="15.4" y1="19.6" x2="13.4" y2="21.1" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.5"/>
      <line x1="20.6" y1="19.6" x2="22.6" y2="21.1" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.5"/>
      <defs>
        <linearGradient id="bs-shield-fill" x1="5" y1="3" x2="31" y2="33" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563eb"/>
          <stop offset="100%" stopColor="#6d28d9"/>
        </linearGradient>
        <linearGradient id="bs-shield-stroke" x1="5" y1="3" x2="31" y2="33" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.3"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col z-50 bs-sidebar">
      {/* Brand */}
      <div className="px-5 py-5 bs-sidebar-header">
        <div className="flex items-center gap-3">
          <BrandMark size={36} />
          <div className="min-w-0">
            <p className="bs-brand-name">BharatSentinel</p>
            <p className="bs-brand-sub">AI-Native Security Platform</p>
          </div>
        </div>
      </div>

      {/* Nav label */}
      <div className="px-5 pt-5 pb-1">
        <p className="bs-nav-section-label">Navigation</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-4 space-y-0.5">
        {navItems.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={clsx('bs-nav-item', active ? 'bs-nav-item-active' : 'bs-nav-item-inactive')}
            >
              <span className={clsx('bs-nav-icon', active ? 'text-blue-400' : 'text-[#4a5f7a]')}>
                {icon}
              </span>
              <span>{label}</span>
              {active && <span className="bs-nav-active-pip" />}
            </Link>
          );
        })}
      </nav>

      {/* Status panel */}
      <div className="mx-3 mb-3 bs-status-panel">
        <div className="flex items-center gap-2 mb-2">
          <span className="bs-status-dot bs-status-online" />
          <span className="bs-status-label">System Operational</span>
        </div>
        <div className="bs-status-divider" />
        <p className="bs-tagline">AI Agents · Human Control · Continuous Security</p>
      </div>
    </aside>
  );
}
