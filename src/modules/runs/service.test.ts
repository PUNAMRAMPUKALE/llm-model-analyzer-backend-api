// backend/src/modules/runs/service.test.ts
import { describe, it, expect } from 'vitest';
import { mergeGrid, expandGrid } from './service.js';

describe('mergeGrid', () => {
  it('overrides only specified fields, preserves others', () => {
    const base = { temperature: [0.1, 0.2], top_p: [0.8], samples: 1 };
    const override = { temperature: [0.9], samples: 3 };
    const merged = mergeGrid(base, override);
    expect(merged.temperature).toEqual([0.9]);     // overridden
    expect(merged.top_p).toEqual([0.8]);           // preserved
    expect(merged.samples).toBe(3);                // overridden
  });

  it('returns base when override is undefined', () => {
    const base = { temperature: [0.3], top_p: [0.9] };
    expect(mergeGrid(base)).toEqual(base);
  });
});

describe('expandGrid', () => {
  it('produces cartesian product across provided arrays', () => {
    const grid = {
      temperature: [0.1, 0.9], // 2
      top_p: [0.8],            // 1
      top_k: [16, 32],         // 2
      max_tokens: [128],       // 1
      seed: null,              // 1 (null handled as [null])
    };
    const out = expandGrid('llama-3.3-70b-versatile', grid);
    // 2 * 1 * 2 * 1 * 1 = 4
    expect(out.length).toBe(4);

    // every combo should carry model + fields set above
    for (const p of out) {
      expect(p.model).toBe('llama-3.3-70b-versatile');
      expect([0.1, 0.9]).toContain(p.temperature);
      expect(p.top_p).toBe(0.8);
      expect([16, 32]).toContain(p.top_k);
      expect(p.max_tokens).toBe(128);
      // seed is set per combo; null means "defer" (run() sets runtime seed)
    }
  });

  it('defaults top_k dimension to 1 when not provided', () => {
    const grid = { temperature: [0.1, 0.2], top_p: [0.8], max_tokens: [64], seed: null };
    const out = expandGrid('m', grid);
    // 2 * 1 * 1(top_k undefined) * 1 * 1 = 2
    expect(out.length).toBe(2);
    for (const p of out) {
      expect(p.top_k).toBeUndefined(); // key omitted when undefined
    }
  });
});
