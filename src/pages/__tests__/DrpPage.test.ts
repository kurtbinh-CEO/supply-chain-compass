import { describe, it, expect } from 'vitest';
import { EXCEPTION_SEEDS, buildSourcesFromSeed, buildSuggestedFromSeed } from '../DrpPage';

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

describe('ExcSeed → AllocSources mapping', () => {
  it('hubPo === nmAllocation, sum committed === allocated', () => {
    EXCEPTION_SEEDS.forEach((e, i) => {
      const s = buildSourcesFromSeed(e);
      expect(s.hubPo, `Entry ${i} (${e.cn}/${e.sku})`).toBe(e.nmAllocation);
      expect(s.onHand + s.pipeline + s.hubPo + s.lcnbIn + s.internalTransfer,
        `Entry ${i} sum committed`).toBe(e.allocated);
      expect(s.ssReserved, `Entry ${i} ssReserved passthrough`).toBe(e.ssReserved);
    });
  });

  it('buildSuggestedFromSeed length matches options', () => {
    EXCEPTION_SEEDS.forEach((e, i) => {
      const sug = buildSuggestedFromSeed(e);
      expect(sug.length, `Entry ${i}`).toBe(e.options.length);
      sug.forEach((s, j) => {
        expect(s.label).toBe(e.options[j].label);
        expect(s.qty).toBe(e.options[j].qty);
      });
    });
  });
});
