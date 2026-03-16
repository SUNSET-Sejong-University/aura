/**
 * /api/devices  – list and manage paired Pucks
 */

import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// GET /api/devices
router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM devices ORDER BY last_seen DESC').all());
});

// GET /api/devices/:id
router.get('/:id', (req, res) => {
  const db     = getDb();
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json(device);
});

// PATCH /api/devices/:id  – rename / pair
router.patch('/:id', (req, res) => {
  const db     = getDb();
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  const name   = req.body.name   ?? device.name;
  const paired = req.body.paired !== undefined ? (req.body.paired ? 1 : 0) : device.paired;

  db.prepare('UPDATE devices SET name = ?, paired = ? WHERE id = ?').run(name, paired, req.params.id);
  res.json(db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id));
});

// DELETE /api/devices/:id
router.delete('/:id', (req, res) => {
  const db   = getDb();
  const info = db.prepare('DELETE FROM devices WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Device not found' });
  res.json({ ok: true });
});

export default router;
