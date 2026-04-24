---
name: Executive Overview
description: /executive — 4-zone leadership dashboard (6 KPI cards + 4-tab drill-down, allocation tracking, 6-month trend, decision queue) gated by SC_MANAGER role (M16)
type: feature
---

`/executive` (route + sidebar group "Lãnh đạo", icon Crown) is the leadership cockpit. Visible only to `SC_MANAGER` (placeholder for future DIRECTOR/CEO roles); other roles see a Lock card.

## Zones

1. **6 hero KPI cards** — Tỷ lệ lấp đầy, Ngày tồn kho TB, Vốn lưu động, Độ chính xác dự báo, Đúng hẹn giao hàng, NM đáp ứng. Each card: icon + value + 12-week sparkline + target + delta vs prev month + tone border-left (🟢/🟡/🔴). Click → Sheet drill-down (Tier 2) with up to 4 tabs: Theo CN / Theo SKU / Theo NM / Xu hướng (line chart with target line). Tabs render only when data exists. Each Sheet ends with auto root-cause + cross-screen CTA. The "NM đáp ứng" Sheet additionally renders the 5-factor NM scorecard (Mikado…Phú Mỹ).
2. **Allocation tracking SmartTable** (CN level) — columns CN/Nhu cầu/Phân bổ/Tỷ lệ/Đã nhận/Pipeline/Thiếu/Đánh giá. `drillDown` per CN expands per-SKU breakdown. `autoExpandWhen: row.fillRate < 80`. `defaultDensity="compact"`. `rowSeverity` maps tone→shortage/watch.
3. **KPI trend 6-month SmartTable** — 8 KPIs × 6 months (T12/25 → T5/26 dự kiến) + target + sparkline. Each cell is a button → small Sheet popup with month details + link to /reports.
4. **Decision queue** — 2 expandable DecisionCards. Expand reveals context grid + AI suggestion banner + primary/secondary action buttons.

## Implementation notes

- All numerics use `tabular-nums` and `toLocaleString("vi-VN")`.
- Tone helpers (`toneText`, `toneBg`, `toneBorder`, `toneEmoji`) centralize 🟢/🟡/🔴 styling via semantic tokens (`text-success/warning/danger`, `bg-success/warning/danger`).
- Sparkline + TrendChart are pure SVG, colors from `hsl(var(--success|warning|danger|text-3))`.
- Cross-screen navigation: DRP (`/drp?cn=…`), Reports, Gap Scenario, Monitoring, Orders.
- Data is mock inline (`KPIS`, `KPI_DRILL`, `NM_SCORECARD`, `ALLOC_ROWS`, `TREND_ROWS`, `DECISIONS`). Move to `unis-enterprise-dataset` when wiring real data.
