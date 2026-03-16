/**
 * AURA Gateway – WebSocket server for real-time dashboard communication.
 *
 * Clients connecting here will receive live TAG_EVENT and DEVICE_ONLINE messages.
 */

import { WebSocketServer } from 'ws';

let _wss = null;

export function createWsServer(server) {
  _wss = new WebSocketServer({ server, path: '/ws' });

  _wss.on('connection', (ws, req) => {
    console.log('[WS] Client connected from', req.socket.remoteAddress);

    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'AURA Gateway live feed' }));

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
    });

    ws.on('error', err => {
      console.error('[WS] Error:', err.message);
    });
  });

  return _wss;
}

/**
 * Broadcast a message to all connected WebSocket clients.
 */
export function broadcast(payload) {
  if (!_wss) return;
  const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
  _wss.clients.forEach(client => {
    if (client.readyState === 1 /* OPEN */) {
      client.send(msg);
    }
  });
}
