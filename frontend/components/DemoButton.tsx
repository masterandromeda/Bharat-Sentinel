'use client';
import { useState } from 'react';
import { runDemo } from '@/lib/api';

interface DemoButtonProps {
  onSuccess?: (incident: unknown) => void;
}

export default function DemoButton({ onSuccess }: DemoButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClick = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await runDemo();
      if (onSuccess) onSuccess(res.data.incident);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(axiosErr?.response?.data?.detail || axiosErr?.message || 'Demo failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-500 hover:to-purple-600 text-white font-semibold text-sm rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Running Demo...
          </>
        ) : (
          <>
            <span>▶</span>
            Run Demo Incident
          </>
        )}
      </button>
      {error && <p className="mt-2 text-red-400 text-xs">{error}</p>}
    </div>
  );
}
