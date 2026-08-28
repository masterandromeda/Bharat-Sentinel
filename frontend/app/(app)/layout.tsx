'use client';
import Sidebar from '@/components/Sidebar';
import { usePathname } from 'next/navigation';
import { useWebSocket } from '@/lib/useWebSocket';
import { useMonitoring } from '@/lib/useMonitoring';

function SOCHeader() {
  const pathname = usePathname();
  const { connected } = useWebSocket();
  const { backendOnline, status } = useMonitoring();

  const isOnDashboard = pathname === '/dashboard' || pathname === '/';

  return (
    <div className="soc-header">
      {/* Left: SOC Title */}
      <div>
        <div className="soc-header-title">Security Operations Center</div>
        <div className="soc-header-sub">AI-Powered · Real-time · 24/7 Monitoring</div>
      </div>

      <div className="soc-header-divider" />

      {/* Status pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={`soc-status-pill ${backendOnline ? 'soc-status-pill-online' : 'soc-status-pill-offline'}`}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
          {backendOnline ? 'API Online' : 'API Offline'}
        </span>
        <span className={`soc-status-pill ${connected ? 'soc-status-pill-live' : 'soc-status-pill-warn'}`}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
          {connected ? 'WS Live' : 'WS Off'}
        </span>
        {status && (
          <span style={{ fontSize: 10, color: '#3d5575', fontFamily: 'monospace' }}>
            Uptime: {status.uptime}
          </span>
        )}
      </div>

      {/* Right: actions */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {isOnDashboard && (
          <span style={{ fontSize: 10, color: '#2d4060', letterSpacing: '0.04em' }}>
            SOC Level 3+ Operations
          </span>
        )}
        {/* Shield icon */}
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ opacity: 0.35 }}>
          <path d="M11 2L3 5.5v6c0 4.4 3.4 8.5 8 9.5c4.6-1 8-5.1 8-9.5v-6L11 2Z"
            stroke="#06b6d4" strokeWidth="1.2" fill="none"/>
        </svg>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: 220, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <SOCHeader />
        <main style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
