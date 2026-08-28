'use client';
import Sidebar from '@/components/Sidebar';
import { usePathname } from 'next/navigation';
import { useWebSocket } from '@/lib/useWebSocket';
import { useMonitoring } from '@/lib/useMonitoring';

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/agents': 'AI Agents',
  '/incidents': 'Incidents',
  '/reports': 'Reports & Audit',
  '/monitoring': 'Live Monitoring',
  '/settings': 'Settings',
};

function TopBar() {
  const pathname = usePathname();
  const base = '/' + (pathname.split('/')[1] || 'dashboard');
  const pageLabel = PAGE_LABELS[base] ?? 'BharatSentinel';
  const isDetail = pathname.split('/').length > 2;

  const { connected } = useWebSocket();
  const { backendOnline } = useMonitoring();

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

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Backend status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: backendOnline ? '#10b981' : '#ef4444',
            boxShadow: backendOnline ? '0 0 0 2px rgba(16,185,129,0.15)' : '0 0 0 2px rgba(239,68,68,0.15)',
          }} />
          <span style={{ color: backendOnline ? '#34d399' : '#fca5a5' }}>
            {backendOnline ? 'Backend Online' : 'Backend Offline'}
          </span>
        </div>

        {/* WebSocket status */}
        <div className={connected ? 'bs-ws-connected' : 'bs-ws-disconnected'}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: connected ? '#34d399' : '#64748b',
          }} />
          {connected ? 'WS Live' : 'WS Off'}
        </div>
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
