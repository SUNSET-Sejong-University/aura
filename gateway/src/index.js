/**
 * AURA Gateway – Entry point
 */

import http from 'http';
import { openDb } from './db/database.js';
import { createApp } from './app.js';
import { createWsServer } from './wsServer.js';

const PORT = process.env.PORT || 3000;

// Initialise database
openDb();

// Create Express app and HTTP server
const app    = createApp();
const server = http.createServer(app);

// Attach WebSocket server
createWsServer(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[AURA Gateway] Listening on http://0.0.0.0:${PORT}`);
  console.log(`[AURA Gateway] WebSocket endpoint: ws://0.0.0.0:${PORT}/ws`);
});
