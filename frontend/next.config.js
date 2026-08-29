/** @type {import('next').NextConfig} */

// BACKEND_URL: set this in Vercel / deployment env vars to your backend server URL.
// e.g. https://your-backend.onrender.com  or  https://your-app.zop.dev
// Falls back to localhost:8081 for local development.
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8081';

const nextConfig = {
  reactStrictMode: true,
  env: {
    // Expose the WS URL to the browser (for real-time events).
    // In production: set NEXT_PUBLIC_WS_URL=wss://your-backend.onrender.com/ws/events
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || '',
    // Expose backend URL to browser so api.ts can call it directly when needed.
    NEXT_PUBLIC_BACKEND_URL: process.env.BACKEND_URL || '',
  },
  async rewrites() {
    return [
      // All /api/* and /health requests are proxied to the backend.
      // In Vercel production: set BACKEND_URL env var to your deployed backend URL.
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: '/health',
        destination: `${BACKEND_URL}/health`,
      },
    ];
  },
};

module.exports = nextConfig;
