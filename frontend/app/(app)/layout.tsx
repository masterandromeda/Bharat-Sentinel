'use client';
import Sidebar from '@/components/Sidebar';
import { usePathname } from 'next/navigation';

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/agents': 'AI Agents',
  '/incidents': 'Incidents',
  '/reports': 'Reports & Audit',
};

function TopBar() {
  const pathname = usePathname();
  // Match /incidents/[id] → Incidents
  const base = '/' + (pathname.split('/')[1] || 'dashboard');
  const pageLabel = PAGE_LABELS[base] ?? 'BharatSentinel';
  const isDetail = pathname.split('/').length > 2;

  return (
    <div className="bs-topbar">
      <span className="bs-topbar-breadcrumb">BharatSentinel</span>
      <span className="bs-topbar-sep">/</span>
      <span className="bs-topbar-page">{pageLabel}</span>
      {isDetail && (
        <>
          <span className="bs-topbar-sep">/</span>
          <span className="bs-topbar-page">Detail</span>
        </>
      )}
      <div className="bs-topbar-badge">
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#10b981',
            display: 'inline-block',
            boxShadow: '0 0 0 2px rgba(16,185,129,0.15)',
            flexShrink: 0,
          }}
        />
        Live
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
