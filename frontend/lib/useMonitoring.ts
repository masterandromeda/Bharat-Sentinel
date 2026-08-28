/**
 * useMonitoring — polls GET /api/monitoring/status every 10 seconds.
 * Returns the live monitoring state from the backend.
 */
'use client';
import { useEffect, useState, useCallback } from 'react';
import { getMonitoringStatus, MonitoringStatus } from './api';

interface UseMonitoringReturn {
  status: MonitoringStatus | null;
  backendOnline: boolean;
  loading: boolean;
}

const POLL_INTERVAL_MS = 10_000;

export function useMonitoring(): UseMonitoringReturn {
  const [status, setStatus] = useState<MonitoringStatus | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  const poll = useCallback(async () => {
    try {
      const res = await getMonitoringStatus();
      setStatus(res.data);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  return { status, backendOnline, loading };
}
