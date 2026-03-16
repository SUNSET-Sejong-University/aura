/**
 * AURA Gateway – Express application factory
 */

import express from 'express';
import eventsRouter    from './routes/events.js';
import tagsRouter      from './routes/tags.js';
import workflowsRouter from './routes/workflows.js';
import devicesRouter   from './routes/devices.js';
import logsRouter      from './routes/logs.js';

export function createApp() {
  const app = express();

  app.use(express.json());

  // ── CORS (local-only, allow the dashboard dev server) ─────────────────
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // ── Health check ──────────────────────────────────────────────────────
  app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

  // ── API routes ────────────────────────────────────────────────────────
  app.use('/api/events',    eventsRouter);
  app.use('/api/tags',      tagsRouter);
  app.use('/api/workflows', workflowsRouter);
  app.use('/api/devices',   devicesRouter);
  app.use('/api/logs',      logsRouter);

  // ── 404 handler ───────────────────────────────────────────────────────
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  return app;
}
