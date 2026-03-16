/**
 * API integration tests for all gateway endpoints.
 * Uses an in-memory SQLite database so no files are created on disk.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { openDb, closeDb } from '../../src/db/database.js';
import { createApp } from '../../src/app.js';

let app;

beforeAll(() => {
  // Use an in-memory DB for tests
  openDb(':memory:');
  app = createApp();
});

afterAll(() => {
  closeDb();
});

// ─────────────────────────────────────────────────────────────────────────────
//  Health
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Tags
// ─────────────────────────────────────────────────────────────────────────────
describe('Tags API', () => {
  it('POST /api/tags  creates a tag', async () => {
    const res = await request(app)
      .post('/api/tags')
      .send({ uid: 'AABBCC', label: 'Coffee Mug', description: 'Test mug' });
    expect(res.status).toBe(201);
    expect(res.body.uid).toBe('AABBCC');
    expect(res.body.label).toBe('Coffee Mug');
  });

  it('POST /api/tags  rejects missing uid', async () => {
    const res = await request(app).post('/api/tags').send({ label: 'No UID' });
    expect(res.status).toBe(400);
  });

  it('POST /api/tags  rejects duplicate uid', async () => {
    const res = await request(app)
      .post('/api/tags')
      .send({ uid: 'AABBCC', label: 'Duplicate' });
    expect(res.status).toBe(409);
  });

  it('GET /api/tags  lists tags', async () => {
    const res = await request(app).get('/api/tags');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/tags/:uid  retrieves a single tag', async () => {
    const res = await request(app).get('/api/tags/AABBCC');
    expect(res.status).toBe(200);
    expect(res.body.uid).toBe('AABBCC');
  });

  it('GET /api/tags/:uid  returns 404 for unknown uid', async () => {
    const res = await request(app).get('/api/tags/UNKNOWN');
    expect(res.status).toBe(404);
  });

  it('PATCH /api/tags/:uid  updates label', async () => {
    const res = await request(app)
      .patch('/api/tags/AABBCC')
      .send({ label: 'Updated Mug' });
    expect(res.status).toBe(200);
    expect(res.body.label).toBe('Updated Mug');
  });

  it('DELETE /api/tags/:uid  removes the tag', async () => {
    await request(app).post('/api/tags').send({ uid: 'DELETE_ME' });
    const del = await request(app).delete('/api/tags/DELETE_ME');
    expect(del.status).toBe(200);
    const get = await request(app).get('/api/tags/DELETE_ME');
    expect(get.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Workflows
// ─────────────────────────────────────────────────────────────────────────────
describe('Workflows API', () => {
  it('POST /api/workflows  creates a workflow', async () => {
    const res = await request(app).post('/api/workflows').send({
      tag_uid:    'AABBCC',
      event_type: 'TAG_PLACED',
      name:       'Slack Status',
      url:        'http://localhost:9999/mock-webhook',
      method:     'POST',
      headers:    { 'X-Test': '1' },
      body:       { text: 'Working on {{uid}}' },
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Slack Status');
    expect(res.body.headers['X-Test']).toBe('1');
  });

  it('POST /api/workflows  rejects missing fields', async () => {
    const res = await request(app).post('/api/workflows').send({ tag_uid: 'AABBCC' });
    expect(res.status).toBe(400);
  });

  it('GET /api/workflows  lists workflows', async () => {
    const res = await request(app).get('/api/workflows');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  let workflowId;
  it('GET /api/workflows/:id  retrieves single workflow', async () => {
    const list = await request(app).get('/api/workflows');
    workflowId = list.body[0].id;
    const res  = await request(app).get(`/api/workflows/${workflowId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(workflowId);
  });

  it('PATCH /api/workflows/:id  updates name', async () => {
    const res = await request(app)
      .patch(`/api/workflows/${workflowId}`)
      .send({ name: 'Updated Workflow', enabled: false });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Workflow');
    expect(res.body.enabled).toBe(false);
  });

  it('DELETE /api/workflows/:id  removes the workflow', async () => {
    const res = await request(app).delete(`/api/workflows/${workflowId}`);
    expect(res.status).toBe(200);
    const get = await request(app).get(`/api/workflows/${workflowId}`);
    expect(get.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Events
// ─────────────────────────────────────────────────────────────────────────────
describe('Events API', () => {
  it('POST /api/events  accepts a TAG_PLACED event', async () => {
    const res = await request(app).post('/api/events').send({
      event:    'TAG_PLACED',
      uid:      'AABBCC',
      deviceId: 'puck-test',
      timestamp: Date.now(),
    });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.intent).toBe('string');
  });

  it('POST /api/events  rejects missing event field', async () => {
    const res = await request(app).post('/api/events').send({ uid: 'AABBCC' });
    expect(res.status).toBe(400);
  });

  it('POST /api/events  rejects missing uid field', async () => {
    const res = await request(app).post('/api/events').send({ event: 'TAG_PLACED' });
    expect(res.status).toBe(400);
  });

  it('POST /api/events  auto-registers unknown tag', async () => {
    await request(app).post('/api/events').send({
      event: 'TAG_PLACED',
      uid:   'NEW_TAG_UID',
    });
    const tag = await request(app).get('/api/tags/NEW_TAG_UID');
    expect(tag.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Devices
// ─────────────────────────────────────────────────────────────────────────────
describe('Devices API', () => {
  beforeAll(async () => {
    // Seed a device via an event
    await request(app).post('/api/events').send({
      event:    'TAG_PLACED',
      uid:      'AABBCC',
      deviceId: 'puck-test',
    });
  });

  it('GET /api/devices  lists devices', async () => {
    const res = await request(app).get('/api/devices');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/devices/:id  returns a device', async () => {
    const res = await request(app).get('/api/devices/puck-test');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('puck-test');
  });

  it('PATCH /api/devices/:id  renames a device', async () => {
    const res = await request(app)
      .patch('/api/devices/puck-test')
      .send({ name: 'Office Puck' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Office Puck');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Logs
// ─────────────────────────────────────────────────────────────────────────────
describe('Logs API', () => {
  it('GET /api/logs  returns log entries', async () => {
    const res = await request(app).get('/api/logs');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/logs?tag_uid=  filters by tag', async () => {
    const res = await request(app).get('/api/logs?tag_uid=AABBCC');
    expect(res.status).toBe(200);
    res.body.forEach(row => expect(row.tag_uid).toBe('AABBCC'));
  });

  it('GET /api/logs/analytics/heatmap  returns heatmap data', async () => {
    const res = await request(app).get('/api/logs/analytics/heatmap');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
