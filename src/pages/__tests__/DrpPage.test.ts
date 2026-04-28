import { describe, it, expect } from 'vitest';
import { EXCEPTION_SEEDS } from '../DrpPage';

describe('EXCEPTION_SEEDS data invariant', () => {
  it('every entry: allocated === onHand + pipeline + nmAllocation', () => {
    EXCEPTION_SEEDS.forEach((e, i) => {
      const sum = e.onHand + e.pipeline + e.nmAllocation;
      expect(sum, `Entry ${i} (${e.cn}/${e.sku}): allocated=${e.allocated}, sum=${sum}`).toBe(e.allocated);
    });
  });

  it('every entry: allocated + gap === demand', () => {
    EXCEPTION_SEEDS.forEach((e, i) => {
      expect(e.allocated + e.gap, `Entry ${i} (${e.cn}/${e.sku})`).toBe(e.demand);
    });
  });

  it('every entry: ssTarget >= 0 && ssReserved >= 0', () => {
    EXCEPTION_SEEDS.forEach((e, i) => {
      expect(e.ssTarget, `Entry ${i}`).toBeGreaterThanOrEqual(0);
      expect(e.ssReserved, `Entry ${i}`).toBeGreaterThanOrEqual(0);
    });
  });
});
