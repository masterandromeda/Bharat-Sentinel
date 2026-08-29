import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';

export const metadata: Metadata = {
  title: 'BharatSentinel — AI-Native Cybersecurity',
  description: 'AI Agents. Human Control. Continuous Security.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0e1a] text-[#e2e8f0]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
