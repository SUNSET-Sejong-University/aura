/**
 * POST /api/events
 *
 * Receives TAG_PLACED / TAG_REMOVED events from Pucks.
 * Dispatches intent classification and fires webhooks.
 */

import { Router } from 'express';
import { getDb } from '../db/database.js';
import { dispatch } from '../ai/dispatcher.js';
import { fireWebhooks } from '../ai/webhooks.js';
import { broadcast } from '../wsServer.js';

const router = Router();

router.post('/', async (req, res) => {
  const { event, uid, deviceId, timestamp } = req.body;

  if (!event || !uid) {
    return res.status(400).json({ error: 'event and uid are required' });
  }

  const db = getDb();

  // Upsert device record
  if (deviceId) {
    db.prepare(`
      INSERT INTO devices (id, ip_address, last_seen)
      VALUES (?, ?, unixepoch())
      ON CONFLICT(id) DO UPDATE SET ip_address = excluded.ip_address,
                                    last_seen  = excluded.last_seen
    `).run(deviceId, req.ip || null);
  }

  // Auto-register unknown tags
  const existing = db.prepare('SELECT uid FROM tags WHERE uid = ?').get(uid);
  if (!existing) {
    db.prepare(`INSERT INTO tags (uid) VALUES (?)`).run(uid);
  }

  // Dispatch
  const { intent, context, workflows } = dispatch(uid, event);

  // Fire webhooks (non-blocking for the response)
  const webhookCtx = { uid, eventType: event, intent, deviceId, timestamp };
  const results = await fireWebhooks(workflows, webhookCtx);

  // Audit log for the raw event
  db.prepare(`
    INSERT INTO logs (device_id, tag_uid, event_type, intent, payload, status)
    VALUES (?, ?, ?, ?, ?, 'ok')
  `).run(
    deviceId  || null,
    uid,
    event,
    intent,
    JSON.stringify({ timestamp, workflows: results.length }),
  );

  // Broadcast to dashboard WebSocket clients
  broadcast({
    type:     'TAG_EVENT',
    event,
    uid,
    deviceId,
    intent,
    workflows: results.length,
    timestamp: timestamp || Date.now(),
  });

  return res.json({ ok: true, intent, workflows: results });
});

export default router;
