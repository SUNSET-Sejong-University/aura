/**
 * Unit tests for the Context-Aware Dispatcher.
 */

import { describe, it, expect } from 'vitest';
import { classifyIntent, INTENT } from '../../src/ai/dispatcher.js';

describe('classifyIntent', () => {
  it('returns Productive during working hours with few recent uses', () => {
    expect(classifyIntent({ hourOfDay: 10, recentUses: 1 })).toBe(INTENT.PRODUCTIVE);
  });

  it('returns Neutral during working hours with many recent uses', () => {
    expect(classifyIntent({ hourOfDay: 14, recentUses: 5 })).toBe(INTENT.NEUTRAL);
  });

  it('returns Relaxed in the evening', () => {
    expect(classifyIntent({ hourOfDay: 20, recentUses: 0 })).toBe(INTENT.RELAXED);
  });

  it('returns Relaxed at midnight', () => {
    expect(classifyIntent({ hourOfDay: 0, recentUses: 2 })).toBe(INTENT.RELAXED);
  });

  it('boundary: 8am with 0 uses → Productive', () => {
    expect(classifyIntent({ hourOfDay: 8, recentUses: 0 })).toBe(INTENT.PRODUCTIVE);
  });

  it('boundary: 18:00 (off-hours) → Relaxed', () => {
    expect(classifyIntent({ hourOfDay: 18, recentUses: 0 })).toBe(INTENT.RELAXED);
  });

  it('boundary: 2 recent uses still Productive', () => {
    expect(classifyIntent({ hourOfDay: 9, recentUses: 2 })).toBe(INTENT.PRODUCTIVE);
  });

  it('boundary: 3 recent uses → Neutral', () => {
    expect(classifyIntent({ hourOfDay: 9, recentUses: 3 })).toBe(INTENT.NEUTRAL);
  });
});
