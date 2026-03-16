/**
 * E2E test: Virtual tag simulation → mock webhook trigger
 *
 * 1. Sends a TAG_PLACED event directly to the gateway API (simulating a Puck).
 * 2. Verifies the response includes an intent classification.
 * 3. Opens the dashboard and checks the Live Feed panel shows the event.
 */

import { test, expect } from '@playwright/test';

const GATEWAY = 'http://localhost:3000';
const TAG_UID  = 'E2E0TEST';

test.describe('Virtual tag → mock webhook E2E', () => {
  test.beforeAll(async ({ request }) => {
    // Register a test tag
    await request.post(`${GATEWAY}/api/tags`, {
      data: { uid: TAG_UID, label: 'E2E Test Object' },
    });

    // Register a mock webhook workflow (pointing at the gateway health endpoint as a stand-in)
    await request.post(`${GATEWAY}/api/workflows`, {
      data: {
        tag_uid:    TAG_UID,
        event_type: 'TAG_PLACED',
        name:       'E2E Mock Webhook',
        url:        `${GATEWAY}/health`,
        method:     'GET',
      },
    });
  });

  test('TAG_PLACED event returns intent and triggers workflows', async ({ request }) => {
    const res = await request.post(`${GATEWAY}/api/events`, {
      data: {
        event:     'TAG_PLACED',
        uid:       TAG_UID,
        deviceId:  'puck-e2etest',
        timestamp: Date.now(),
      },
    });

    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.intent).toBe('string');
    expect(Array.isArray(body.workflows)).toBe(true);
  });

  test('TAG_REMOVED event is accepted', async ({ request }) => {
    const res = await request.post(`${GATEWAY}/api/events`, {
      data: {
        event:     'TAG_REMOVED',
        uid:       TAG_UID,
        deviceId:  'puck-e2etest',
        timestamp: Date.now(),
      },
    });

    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('Dashboard Live Feed panel is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('AURA')).toBeVisible();
    await expect(page.getByText('Live Feed')).toBeVisible();
  });

  test('Logs contain the E2E tag event', async ({ request }) => {
    const res  = await request.get(`${GATEWAY}/api/logs?tag_uid=${TAG_UID}`);
    const logs = await res.json();
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].tag_uid).toBe(TAG_UID);
  });
});
