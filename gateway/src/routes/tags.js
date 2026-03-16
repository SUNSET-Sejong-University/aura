/**
 * /api/tags  – CRUD for physical tag objects
 */

import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// GET /api/tags
router.get('/', (req, res) => {
  const db = getDb();
  const tags = db.prepare('SELECT * FROM tags ORDER BY created_at DESC').all();
  res.json(tags);
});

// GET /api/tags/:uid
router.get('/:uid', (req, res) => {
  const db  = getDb();
  const tag = db.prepare('SELECT * FROM tags WHERE uid = ?').get(req.params.uid);
  if (!tag) return res.status(404).json({ error: 'Tag not found' });
  res.json(tag);
});

// POST /api/tags
router.post('/', (req, res) => {
  const { uid, label = '', description = '' } = req.body;
  if (!uid) return res.status(400).json({ error: 'uid is required' });

  const db = getDb();
  try {
    db.prepare('INSERT INTO tags (uid, label, description) VALUES (?, ?, ?)').run(uid, label, description);
    const tag = db.prepare('SELECT * FROM tags WHERE uid = ?').get(uid);
    res.status(201).json(tag);
  } catch {
    res.status(409).json({ error: 'Tag already exists' });
  }
});

// PATCH /api/tags/:uid
router.patch('/:uid', (req, res) => {
  const db  = getDb();
  const tag = db.prepare('SELECT * FROM tags WHERE uid = ?').get(req.params.uid);
  if (!tag) return res.status(404).json({ error: 'Tag not found' });

  const label       = req.body.label       ?? tag.label;
  const description = req.body.description ?? tag.description;

  db.prepare('UPDATE tags SET label = ?, description = ? WHERE uid = ?').run(label, description, req.params.uid);
  res.json(db.prepare('SELECT * FROM tags WHERE uid = ?').get(req.params.uid));
});

// DELETE /api/tags/:uid
router.delete('/:uid', (req, res) => {
  const db = getDb();
  const info = db.prepare('DELETE FROM tags WHERE uid = ?').run(req.params.uid);
  if (info.changes === 0) return res.status(404).json({ error: 'Tag not found' });
  res.json({ ok: true });
});

export default router;
