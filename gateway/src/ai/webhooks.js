/**
 * AURA Gateway – Webhook executor
 *
 * Fires HTTP requests for a list of workflow definitions.
 * Supports POST and GET with custom headers and JSON body templating.
 */

import fetch from 'node-fetch';
import { getDb } from '../db/database.js';

const REQUEST_TIMEOUT_MS = 5000;

/**
 * Execute a single workflow definition.
 *
 * @param {object} workflow  – row from the workflows table
 * @param {object} context   – { uid, eventType, intent, timestamp, deviceId }
 * @returns {Promise<{ workflowId, status, code }>}
 */
export async function executeWorkflow(workflow, context) {
  const headers = {
    'Content-Type': 'application/json',
    ...JSON.parse(workflow.headers || '{}'),
  };

  // Interpolate {{uid}}, {{intent}}, {{event}} placeholders in body template
  const rawBody = workflow.body || '{}';
  const interpolated = rawBody
    .replace(/\{\{uid\}\}/g,       context.uid       || '')
    .replace(/\{\{intent\}\}/g,    context.intent    || '')
    .replace(/\{\{event\}\}/g,     context.eventType || '')
    .replace(/\{\{deviceId\}\}/g,  context.deviceId  || '')
    .replace(/\{\{timestamp\}\}/g, String(context.timestamp || ''));

  const options = {
    method:  workflow.method || 'POST',
    headers,
    signal:  AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  };

  if (options.method !== 'GET') {
    options.body = interpolated;
  }

  let code = 0;
  let status = 'ok';

  try {
    const res = await fetch(workflow.url, options);
    code = res.status;
    if (!res.ok) status = 'error';
  } catch (err) {
    status = 'error';
    code   = 0;
  }

  // Audit log
  const db = getDb();
  db.prepare(`
    INSERT INTO logs (device_id, tag_uid, event_type, intent, payload, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    context.deviceId || null,
    context.uid       || null,
    context.eventType || 'TAG_PLACED',
    context.intent    || null,
    JSON.stringify({ workflowId: workflow.id, url: workflow.url }),
    status,
  );

  return { workflowId: workflow.id, status, code };
}

/**
 * Fire all enabled workflows for a tag event in parallel.
 */
export async function fireWebhooks(workflows, context) {
  return Promise.all(workflows.map(wf => executeWorkflow(wf, context)));
}
