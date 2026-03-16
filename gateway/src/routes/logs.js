/**
 * /api/logs  – audit trail & analytics
 */

import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// GET /api/logs?limit=50&tag_uid=…&event_type=…
router.get('/', (req, res) => {
  const db    = getDb();
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);

  let where  = [];
  let params = [];

  if (req.query.tag_uid) {
    where.push('tag_uid = ?');
    params.push(req.query.tag_uid);
  }
  if (req.query.event_type) {
    where.push('event_type = ?');
    params.push(req.query.event_type);
  }

  const sql = `
    SELECT * FROM logs
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY created_at DESC
    LIMIT ?
  `;
  params.push(limit);

  res.json(db.prepare(sql).all(...params));
});

// GET /api/logs/analytics/heatmap
// Returns hourly usage counts per tag (for the last 7 days).
router.get('/analytics/heatmap', (req, res) => {
  const db      = getDb();
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;

  const rows = db.prepare(`
    SELECT
      tag_uid,
      CAST(strftime('%H', datetime(created_at, 'unixepoch')) AS INTEGER) AS hour,
      COUNT(*) AS count
    FROM logs
    WHERE event_type = 'TAG_PLACED'
      AND created_at >= ?
    GROUP BY tag_uid, hour
    ORDER BY tag_uid, hour
  `).all(sevenDaysAgo);

  res.json(rows);
});

export default router;
