import { describe, it, expect } from 'vitest';
import { EXCEPTION_SEEDS, buildSourcesFromSeed, buildSuggestedFromSeed } from '../DrpPage';
import { getSsStatus } from '@/components/SafetyStockBadge';

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

  it('buildSourcesFromSeed maps nmAllocation → hubPo (CN-BMT/GA-300)', () => {
    const sample = EXCEPTION_SEEDS.find(e => e.cn === 'CN-BMT' && e.sku === 'GA-300')!;
    const sources = buildSourcesFromSeed(sample);
    expect(sources.hubPo).toBe(sample.nmAllocation);
    expect(sources.hubPo).toBe(49);
    expect(sources.lcnbIn).toBe(0);
    expect(
      sources.onHand + sources.pipeline + sources.hubPo + sources.lcnbIn + sources.internalTransfer
    ).toBe(sample.allocated);
  });

  it('buildSourcesFromSeed: invariant for ALL seeds', () => {
    EXCEPTION_SEEDS.forEach((e, i) => {
      const s = buildSourcesFromSeed(e);
      const sum = s.onHand + s.pipeline + s.hubPo + s.lcnbIn + s.internalTransfer;
      expect(sum, `Seed ${i} ${e.cn}/${e.sku}`).toBe(e.allocated);
    });
  });

  it('buildSuggestedFromSeed: SHORTAGE has options with at least one recommended', () => {
    const sample = EXCEPTION_SEEDS.find(e => e.type === 'SHORTAGE' && e.options.length > 0)!;
    const suggested = buildSuggestedFromSeed(sample);
    expect(suggested.length).toBeGreaterThanOrEqual(2);
    expect(suggested.some(s => s.recommended)).toBe(true);
  });
});

describe('SafetyStockBadge coverage status', () => {
  it('shows correct coverage status for CN-BMT/GA-300 (above_ss)', () => {
    const sample = EXCEPTION_SEEDS.find(e => e.cn === 'CN-BMT' && e.sku === 'GA-300')!;
    expect(sample.ssReserved).toBe(240);
    expect(sample.ssTarget).toBe(240);
    const pct = (sample.ssReserved / sample.ssTarget) * 100;
    expect(pct).toBe(100);
    expect(getSsStatus(sample.ssTarget, sample.ssReserved)).toBe('above_ss');
  });

  it('getSsStatus boundaries', () => {
    expect(getSsStatus(0, 0)).toBe('no_ss');
    expect(getSsStatus(100, 100)).toBe('above_ss');
    expect(getSsStatus(100, 120)).toBe('above_ss');
    expect(getSsStatus(100, 80)).toBe('at_ss');
    expect(getSsStatus(100, 79)).toBe('below_ss');
  });

  it('all SHORTAGE/WATCH seeds have ssTarget > 0 → renderable badge', () => {
    EXCEPTION_SEEDS.forEach((e, i) => {
      expect(e.ssTarget, `Entry ${i}`).toBeGreaterThan(0);
      const status = getSsStatus(e.ssTarget, e.ssReserved);
      expect(status, `Entry ${i}`).not.toBe('no_ss');
    });
  });
});
