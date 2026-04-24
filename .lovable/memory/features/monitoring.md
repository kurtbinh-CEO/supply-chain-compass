---
name: Monitoring
description: /monitoring — 5 hero KPI cards (drill-down Sheet) ABOVE 7 detail tabs covering NM risk, ROI, SS, BPO, FC, activity (M15)
type: feature
---

Giám sát (/monitoring) is structured as **hero cards on top** + **detail tabs below**.

## Hero KPI cards (M15)

`MonitoringHeroCards` renders 5 click-to-drill cards always visible above the tab bar:

1. **Rủi ro NM** — 5 NM scorecard (5 yếu tố: Đáp ứng, Đúng hẹn, Chất lượng, Phản hồi, Giá) + 12-week sparkline per NM. Action: Gap Scenario / open NM Risk tab.
2. **ROI Bánh đà** — chain MAPE → SS → WC with deltas. Action: open Workspace pending SS approvals.
3. **Cảnh báo Tồn kho an toàn** — list pending SS changes with WC impact + reason. Action: Workspace / Tồn kho an toàn tab.
4. **Tiến độ đặt hàng** — BPO burn-down (5-week bars actual/target) + per-NM pace. Action: Hub (nhắc NM) / Tiến độ tab.
5. **Độ chính xác dự báo** — MAPE per CN + per SKU with trend tags. Action: Demand / S&OP / Dự báo tab.

Each card opens a right-side `Sheet` with structured drill-down + cross-screen action buttons. Cards use tone-tinted backgrounds (`bg-{tone}/5 border-{tone}/20`). All Vietnamese labels.

## Detail tabs (renamed)

| key | label |
|---|---|
| overview | Tổng quan |
| inv | Tồn kho an toàn |
| perf | Tiến độ đặt hàng |
| nm-risk | Rủi ro NM |
| roi | ROI |
| fc | Dự báo (uses `FcAccuracyTab`) |
| activity | Activity Log |

The "Chi tiết" label sits above the tab bar to signal these are deeper views complementing the hero cards. Hero cards can navigate the user to the corresponding tab via `onTabChange`.
