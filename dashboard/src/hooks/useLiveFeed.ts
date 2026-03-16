/**
 * AURA Dashboard – Live device/event hook
 * Connects to the gateway WebSocket and returns live events.
 */
import { useEffect, useRef, useState } from 'react';

export interface LiveEvent {
  type:       string;
  event?:     string;
  uid?:       string;
  deviceId?:  string;
  intent?:    string;
  workflows?: number;
  timestamp?: number;
  message?:   string;
}

export function useLiveFeed(wsUrl = 'ws://localhost:3000/ws') {
  const [events, setEvents]       = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen  = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (e) => {
      try {
        const data: LiveEvent = JSON.parse(e.data as string);
        setEvents(prev => [data, ...prev].slice(0, 100));
      } catch {/* ignore */}
    };

    return () => ws.close();
  }, [wsUrl]);

  return { events, connected };
}
