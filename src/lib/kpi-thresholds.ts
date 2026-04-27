/**
 * KPI card layout heuristics — single source of truth.
 *
 * Tune these numbers to match your datasets (vi-VN tends to have longer
 * labels than en-US; large currency strings need lower `value` cutoffs).
 *
 * All thresholds are **character lengths** of the rendered string. They
 * are heuristic — no DOM measurement — so changes here take effect
 * everywhere KpiCard / HeroCard are rendered.
 *
 *  - `lg` = first downshift (font goes 1 step smaller)
 *  - `xl` = second downshift (font goes 2 steps smaller, may clamp 2 lines)
 *
 * Set a value to `Infinity` to disable a tier.
 */
export interface KpiLengthTiers {
  /** ≤ this length = default size */
  lg: number;
  /** > lg and ≤ this = downshift; > xl = max downshift */
  xl: number;
}

export interface KpiThresholds {
  /** KpiCard title (label above value). Long titles clamp to 2 lines at `xl`. */
  title:  KpiLengthTiers;
  /** HeroCard label (header next to icon — typically shorter than `title`). */
  heroLabel: KpiLengthTiers;
  /** Numeric/text value (the hero number). */
  value:  KpiLengthTiers;
  /** Unit suffix (e.g. "tỷ ₫", "vấn đề"). */
  unit:   KpiLengthTiers;
  /** Hint / sub-label under value. Always single-line, truncates. */
  hint:   KpiLengthTiers;
  /** StatusChip / pill labels (header chips, status badges, tenant pills). */
  chip:   KpiLengthTiers;

  /** Max width (CSS) the unit can occupy in the value row. */
  unitMaxWidth: string;
  /** Reserved min-height for the trend/hint row in KpiCard. */
  hintRowMinHeight: string;
  /** Reserved min-height for the trend/sub row in HeroCard (denser). */
  heroSubRowMinHeight: string;
  /** Max width (CSS) for chip/pill labels on mobile (<sm). */
  chipMaxWidthMobile: string;
  /** Max width (CSS) for chip/pill labels on desktop. */
  chipMaxWidthDesktop: string;
}

export const KPI_THRESHOLDS: KpiThresholds = {
  title:     { lg: 22, xl: 32 },
  heroLabel: { lg: 18, xl: 28 },
  value:     { lg: 5,  xl: 7  },
  unit:      { lg: 8,  xl: 14 },
  hint:      { lg: 28, xl: 44 },
  chip:      { lg: 12, xl: 20 },
  unitMaxWidth: "45%",
  hintRowMinHeight: "1.25rem",
  heroSubRowMinHeight: "1.125rem",
  chipMaxWidthMobile: "8rem",
  chipMaxWidthDesktop: "14rem",
};

/** Tier resolver: returns "base" | "lg" | "xl" based on string length. */
export type KpiTier = "base" | "lg" | "xl";
export function resolveTier(len: number, tiers: KpiLengthTiers): KpiTier {
  if (len > tiers.xl) return "xl";
  if (len > tiers.lg) return "lg";
  return "base";
}
