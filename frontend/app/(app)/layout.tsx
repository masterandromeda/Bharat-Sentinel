'use client';
import Sidebar from '@/components/Sidebar';
import LiveHeader from '@/components/LiveHeader';
import CyberBackground from '@/components/CyberBackground';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* Animated cybersecurity background — behind everything */}
      <CyberBackground />

      {/* Sidebar — fixed, above background */}
      <Sidebar />

      {/* Main content area */}
      <div style={{
        flex: 1,
        marginLeft: 220,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Live top header */}
        <LiveHeader />

        {/* Page content */}
        <main style={{ flex: 1, padding: '16px 20px', overflowY: 'auto' }}>
          {children}
        </main>

        {/* SOC footer strip */}
        <div style={{
          height: 32,
          background: 'rgba(4,7,18,0.95)',
          borderTop: '1px solid rgba(30,50,90,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0,
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {['All systems monitored', 'All threats detected', 'All attacks investigated'].map(t => (
              <span key={t} style={{ fontSize: 9.5, color: '#1a2840', letterSpacing: '0.04em' }}>• {t}</span>
            ))}
          </div>
          <span style={{ fontSize: 10, color: '#2d4060', letterSpacing: '0.06em' }}>
            SOC Level 3+ Operations
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ display: 'inline', marginLeft: 5, verticalAlign: 'middle', opacity: 0.4 }}>
              <path d="M7 1L2 3.5v4c0 2.7 2.1 5.2 5 5.9C9.9 12.7 12 10.2 12 7.5v-4L7 1Z" stroke="#06b6d4" strokeWidth="1"/>
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
