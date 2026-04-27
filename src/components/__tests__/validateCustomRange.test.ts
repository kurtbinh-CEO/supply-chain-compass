/**
 * Unit tests cho validateCustomRange — đảm bảo các quy tắc validation:
 *   1. Cả 2 input rỗng / thiếu 1 trong 2.
 *   2. Từ ≤ Đến.
 *   3. Đến không vượt hôm nay.
 *   4. Từ không vượt retention (24 tháng).
 *   5. Khoảng tối đa 366 ngày (367 ngày inclusive).
 *
 * Dùng vi.useFakeTimers().setSystemTime(...) để cố định "hôm nay"
 * → retention floor và today luôn tính ổn định bất kể chạy CI khi nào.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  validateCustomRange,
  RETENTION_MONTHS,
  MAX_RANGE_DAYS,
  todayIso,
  retentionFloorIso,
  addDaysIso,
  toLocalIso,
} from "../TimeRangeFilter";

// Cố định "hôm nay" = 2026-04-27 (giờ local 12:00).
// → retention floor = 2024-04-27 (24 tháng trước).
const FIXED_TODAY = new Date(2026, 3, 27, 12, 0, 0); // tháng 0-indexed: 3 = tháng 4

describe("validateCustomRange", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TODAY);
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  // ─────────────── Sanity ───────────────
  it("today helper trả về đúng ISO local của hôm nay đã fake", () => {
    expect(todayIso()).toBe("2026-04-27");
  });

  it("retention floor đúng = hôm nay - RETENTION_MONTHS", () => {
    expect(retentionFloorIso()).toBe("2024-04-27");
    expect(RETENTION_MONTHS).toBe(24);
  });

  // ─────────────── Trường hợp thiếu input ───────────────
  describe("thiếu input", () => {
    it("cả 2 rỗng → báo lỗi kèm cả 2 mốc giới hạn", () => {
      const err = validateCustomRange("", "");
      expect(err).not.toBeNull();
      expect(err).toMatch(/27\/04\/2024/);
      expect(err).toMatch(/27\/04\/2026/);
    });

    it("thiếu Từ → báo lỗi kèm ngày sớm nhất", () => {
      const err = validateCustomRange("", "2026-04-20");
      expect(err).toMatch(/Từ/);
      expect(err).toMatch(/27\/04\/2024/);
    });

    it("thiếu Đến → báo lỗi kèm ngày muộn nhất", () => {
      const err = validateCustomRange("2026-04-01", "");
      expect(err).toMatch(/Đến/);
      expect(err).toMatch(/27\/04\/2026/);
    });
  });

  // ─────────────── Quy tắc Từ ≤ Đến ───────────────
  describe("Từ ≤ Đến", () => {
    it("Từ > Đến → lỗi kèm cả 2 ngày cụ thể và gợi ý sửa", () => {
      const err = validateCustomRange("2026-04-20", "2026-04-10");
      expect(err).not.toBeNull();
      expect(err).toMatch(/20\/04\/2026/);
      expect(err).toMatch(/10\/04\/2026/);
    });

    it("Từ = Đến → hợp lệ (range 1 ngày)", () => {
      expect(validateCustomRange("2026-04-15", "2026-04-15")).toBeNull();
    });

    it("Từ < Đến → hợp lệ", () => {
      expect(validateCustomRange("2026-04-01", "2026-04-15")).toBeNull();
    });
  });

  // ─────────────── Đến không vượt hôm nay ───────────────
  describe("vượt hôm nay", () => {
    it("Đến = hôm nay → hợp lệ", () => {
      expect(validateCustomRange("2026-04-01", "2026-04-27")).toBeNull();
    });

    it("Đến = hôm nay + 1 → lỗi kèm 'hôm nay'", () => {
      const tomorrow = addDaysIso(todayIso(), 1);
      const err = validateCustomRange("2026-04-01", tomorrow);
      expect(err).not.toBeNull();
      expect(err).toMatch(/vượt quá hôm nay/);
      expect(err).toMatch(/27\/04\/2026/);
    });

    it("Đến xa trong tương lai → vẫn báo lỗi cùng kiểu", () => {
      const err = validateCustomRange("2026-04-01", "2027-01-01");
      expect(err).toMatch(/Tối đa.*27\/04\/2026/);
    });
  });

  // ─────────────── Vượt retention ───────────────
  describe("vượt retention (24 tháng)", () => {
    it("Từ = floor → hợp lệ", () => {
      expect(validateCustomRange("2024-04-27", "2024-04-28")).toBeNull();
    });

    it("Từ = floor - 1 → lỗi, kèm số tháng và ngày floor", () => {
      const err = validateCustomRange("2024-04-26", "2024-04-30");
      expect(err).not.toBeNull();
      expect(err).toMatch(new RegExp(`${RETENTION_MONTHS} tháng`));
      expect(err).toMatch(/27\/04\/2024/);
    });

    it("Từ rất xa trong quá khứ → vẫn báo lỗi", () => {
      const err = validateCustomRange("2020-01-01", "2020-06-01");
      expect(err).toMatch(/27\/04\/2024/);
    });

    it("Cả 2 ngày trước floor (cùng tuần) → báo lỗi retention (ưu tiên trước rule 366)", () => {
      const err = validateCustomRange("2024-04-25", "2024-04-26");
      expect(err).toMatch(/lưu/);
    });
  });

  // ─────────────── Quy tắc 366 ngày ───────────────
  describe("khoảng tối đa MAX_RANGE_DAYS", () => {
    it("MAX_RANGE_DAYS = 366", () => {
      expect(MAX_RANGE_DAYS).toBe(366);
    });

    it("range = 367 ngày inclusive (diff = 366) → hợp lệ (boundary)", () => {
      const from = "2025-01-01";
      const to = addDaysIso(from, MAX_RANGE_DAYS); // diff = 366
      expect(validateCustomRange(from, to)).toBeNull();
    });

    it("range = 368 ngày inclusive (diff = 367) → lỗi kèm 'Đến muộn nhất'", () => {
      const from = "2025-01-01";
      const to = addDaysIso(from, MAX_RANGE_DAYS + 1); // diff = 367
      const err = validateCustomRange(from, to);
      expect(err).not.toBeNull();
      expect(err).toMatch(/quá dài/);
      expect(err).toMatch(/367/);                    // số ngày tối đa = 366+1 inclusive
      const expectedMaxTo = addDaysIso(from, MAX_RANGE_DAYS);
      // Format vi: dd/mm/yyyy
      const [y, m, d] = expectedMaxTo.split("-");
      expect(err).toContain(`${d}/${m}/${y}`);
    });
  });

  // ─────────────── Thứ tự ưu tiên rule ───────────────
  describe("thứ tự ưu tiên", () => {
    it("Từ > Đến được kiểm tra trước rule 'vượt hôm nay'", () => {
      // Từ = tương lai, Đến = quá khứ → cả 2 sai, nhưng Từ>Đến hiện trước.
      const err = validateCustomRange("2027-01-01", "2025-01-01");
      expect(err).toMatch(/Từ.*phải ≤ Đến|01\/01\/2027/);
    });

    it("Đến tương lai được báo trước rule retention", () => {
      // Từ vượt retention (rất xa), Đến vượt hôm nay → "vượt hôm nay" hiện trước.
      const err = validateCustomRange("2020-01-01", "2099-01-01");
      expect(err).toMatch(/vượt quá hôm nay/);
    });
  });

  // ─────────────── Sanity timezone ───────────────
  it("toLocalIso không lệch ngày dù Date ở 23:30 local", () => {
    const lateNight = new Date(2026, 3, 27, 23, 30, 0); // 27/4 lúc 23:30 local
    expect(toLocalIso(lateNight)).toBe("2026-04-27");
  });
});
