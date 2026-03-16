/**
 * AURA Gateway – Context-Aware Dispatcher (The AI Brain)
 *
 * When a TAG event arrives:
 *   1. Gather context: TimeOfDay, recent tag history.
 *   2. Run a simple Decision Tree to classify "intent".
 *   3. Return the intent label and triggering workflows.
 */

import { getDb } from '../db/database.js';

// ─── Intent labels ────────────────────────────────────────────────────────
export const INTENT = {
  PRODUCTIVE: 'Productive',
  RELAXED:    'Relaxed',
  NEUTRAL:    'Neutral',
};

// ─── Working-hours configuration (configurable via environment) ───────────
const WORK_HOUR_START  = parseInt(process.env.WORK_HOUR_START  ?? '8',  10);
const WORK_HOUR_END    = parseInt(process.env.WORK_HOUR_END    ?? '18', 10);
const BUSY_USE_THRESH  = parseInt(process.env.BUSY_USE_THRESH  ?? '3',  10);

/**
 * Classify the current session intent using a lightweight decision tree.
 *
 * Features:
 *   • hourOfDay  (0-23)
 *   • recentUses (# times this tag was used in the last hour)
 *
 * Tree:
 *   if hourOfDay in [WORK_HOUR_START, WORK_HOUR_END)  → working hours
 *     if recentUses < BUSY_USE_THRESH → Productive
 *     else                            → Neutral   (frequent interruptions)
 *   else                              → off-hours → Relaxed
 */
export function classifyIntent({ hourOfDay, recentUses }) {
  const isWorkingHours = hourOfDay >= WORK_HOUR_START && hourOfDay < WORK_HOUR_END;
  if (isWorkingHours) {
    return recentUses < BUSY_USE_THRESH ? INTENT.PRODUCTIVE : INTENT.NEUTRAL;
  }
  return INTENT.RELAXED;
}

/**
 * Build the context object for a given tag UID.
 */
export function buildContext(uid) {
  const db = getDb();
  const now = Date.now();
  const oneHourAgo = Math.floor(now / 1000) - 3600;

  const recentRow = db
    .prepare(`SELECT COUNT(*) AS cnt FROM logs WHERE tag_uid = ? AND created_at >= ?`)
    .get(uid, oneHourAgo);

  return {
    hourOfDay:  new Date(now).getHours(),
    recentUses: recentRow ? recentRow.cnt : 0,
    timestamp:  now,
  };
}

/**
 * Dispatch a tag event:
 *   1. Classify intent.
 *   2. Fetch matching workflows.
 *   3. Return { intent, workflows }.
 */
export function dispatch(uid, eventType = 'TAG_PLACED') {
  const db = getDb();
  const context = buildContext(uid);
  const intent  = classifyIntent(context);

  const workflows = db
    .prepare(`
      SELECT * FROM workflows
      WHERE tag_uid = ? AND event_type = ? AND enabled = 1
    `)
    .all(uid, eventType);

  return { intent, context, workflows };
}
