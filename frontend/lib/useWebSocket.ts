/**
 * useWebSocket — connects directly to the backend WebSocket endpoint.
 * Auto-reconnects with exponential back-off on disconnect/error.
 * Next.js rewrites do NOT proxy WebSocket connections, so we connect
 * directly to the backend URL (default ws://localhost:8080/ws/events).
 */
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { getWsUrl } from './api';

export interface WsMessage {
  type: string;
  event_id?: string;
  state?: string;
  timestamp?: string;
  // event_update fields
  event_type?: string;
  source?: string;
  source_ip?: string;
  threat_type?: string;
  severity?: string;
  risk_score?: number;
  risk_level?: string;
  incident_id?: string;
  reason?: string;
  // connected fields
  monitoring_status?: {
    events_received: number;
    events_processed: number;
    threats_detected: number;
    uptime: string;
  };
}

interface UseWebSocketReturn {
  connected: boolean;
  messages: WsMessage[];
  clearMessages: () => void;
}

const MAX_RECONNECT_DELAY_MS = 16000;
const INITIAL_RECONNECT_DELAY_MS = 1500;
// Keep at most this many messages in state to avoid unbounded memory usage
const MAX_MESSAGES = 50;

export function useWebSocket(): UseWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<WsMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(INITIAL_RECONNECT_DELAY_MS);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmounted = useRef(false);

  const clearMessages = useCallback(() => setMessages([]), []);

  const connect = useCallback(() => {
    if (unmounted.current) return;

    const url = getWsUrl();
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      // WebSocket constructor throws synchronously if the URL is invalid
      scheduleReconnect();
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      if (unmounted.current) { ws.close(); return; }
      setConnected(true);
      reconnectDelay.current = INITIAL_RECONNECT_DELAY_MS;
    };

    ws.onmessage = (evt) => {
      if (unmounted.current) return;
      try {
        const msg: WsMessage = JSON.parse(evt.data);
        setMessages(prev => {
          const next = [msg, ...prev];
          return next.length > MAX_MESSAGES ? next.slice(0, MAX_MESSAGES) : next;
        });
      } catch {
        // Ignore malformed frames
      }
    };

    ws.onclose = () => {
      if (unmounted.current) return;
      setConnected(false);
      scheduleReconnect();
    };

    ws.onerror = () => {
      // onerror is always followed by onclose; let onclose handle reconnect
      if (unmounted.current) return;
      setConnected(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function scheduleReconnect() {
    if (unmounted.current) return;
    reconnectTimer.current = setTimeout(() => {
      if (!unmounted.current) connect();
    }, reconnectDelay.current);
    reconnectDelay.current = Math.min(reconnectDelay.current * 2, MAX_RECONNECT_DELAY_MS);
  }

  useEffect(() => {
    unmounted.current = false;
    connect();
    return () => {
      unmounted.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected, messages, clearMessages };
}
