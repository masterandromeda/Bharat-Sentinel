'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { href: '/agents',    label: 'Agents',    icon: '◈' },
  { href: '/incidents', label: 'Incidents', icon: '⚠' },
  { href: '/reports',   label: 'Reports',   icon: '▦' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#0f1629] border-r border-[#1e2d4a] flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#1e2d4a]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center text-white font-bold text-sm">
            BS
          </div>
          <div>
            <p className="font-semibold text-[#e2e8f0] text-sm leading-tight">BharatSentinel</p>
            <p className="text-[10px] text-[#64748b] leading-tight">AI Security Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                : 'text-[#64748b] hover:text-[#e2e8f0] hover:bg-white/5'
            )}
          >
            <span className="text-base w-5 text-center">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[#1e2d4a]">
        <p className="text-[10px] text-[#64748b] text-center">
          AI Agents. Human Control. Continuous Security.
        </p>
      </div>
    </aside>
  );
}
