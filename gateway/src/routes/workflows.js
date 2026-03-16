/**
 * /api/workflows  – CRUD for webhook/workflow definitions
 */

import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// GET /api/workflows
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM workflows ORDER BY created_at DESC').all();
  res.json(rows.map(parseJsonFields));
});

// GET /api/workflows/:id
router.get('/:id', (req, res) => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Workflow not found' });
  res.json(parseJsonFields(row));
});

// POST /api/workflows
router.post('/', (req, res) => {
  const { tag_uid, event_type = 'TAG_PLACED', name = '', url, method = 'POST', headers = {}, body = {}, enabled = true } = req.body;

  if (!tag_uid || !url) return res.status(400).json({ error: 'tag_uid and url are required' });

  const db = getDb();
  const info = db.prepare(`
    INSERT INTO workflows (tag_uid, event_type, name, url, method, headers, body, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    tag_uid, event_type, name, url, method,
    JSON.stringify(headers), JSON.stringify(body), enabled ? 1 : 0,
  );

  const wf = db.prepare('SELECT * FROM workflows WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(parseJsonFields(wf));
});

// PATCH /api/workflows/:id
router.patch('/:id', (req, res) => {
  const db = getDb();
  const wf = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });

  const updates = {
    name:       req.body.name       ?? wf.name,
    url:        req.body.url        ?? wf.url,
    method:     req.body.method     ?? wf.method,
    headers:    JSON.stringify(req.body.headers ?? JSON.parse(wf.headers)),
    body:       JSON.stringify(req.body.body    ?? JSON.parse(wf.body)),
    enabled:    req.body.enabled    !== undefined ? (req.body.enabled ? 1 : 0) : wf.enabled,
    event_type: req.body.event_type ?? wf.event_type,
  };

  db.prepare(`
    UPDATE workflows SET name=?, url=?, method=?, headers=?, body=?, enabled=?, event_type=?
    WHERE id=?
  `).run(updates.name, updates.url, updates.method, updates.headers, updates.body,
         updates.enabled, updates.event_type, req.params.id);

  res.json(parseJsonFields(db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id)));
});

// DELETE /api/workflows/:id
router.delete('/:id', (req, res) => {
  const db   = getDb();
  const info = db.prepare('DELETE FROM workflows WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Workflow not found' });
  res.json({ ok: true });
});

function parseJsonFields(row) {
  return {
    ...row,
    headers: JSON.parse(row.headers || '{}'),
    body:    JSON.parse(row.body    || '{}'),
    enabled: Boolean(row.enabled),
  };
}

export default router;
