---
name: Workspace
description: /workspace — priority list of approvals + exceptions + notifications, each row expands inline to full context (M14)
type: feature
---

The Workspace (/workspace) is organized into two sections: "Cần làm" and "Bắt đầu".

## "Cần làm" — single unified list

A priority-ranked list combining 3 item types: **approve / exception / notify**. Filters: Tất cả · Cần duyệt · Ngoại lệ · Thông báo (all VN labels). Sort: severity (danger→warning→info) then age then ₫ risk.

### Inline expand (M14)

Every item with a context entry in `src/lib/workspace-context-data.ts` is **clickable** — clicking the row (or the [Xem] button) expands inline below it via the `WorkspaceItemDetail` component. The expanded panel always contains:

- Lead summary + submitter line ("Anh Minh (CN Manager BD) · Trust 65%")
- Reason (why this approval was raised)
- Structured sections: each has `heading` + optional `paragraph` / `rows` (key/value with tone colors) / `bullets`
- Optional **AI gợi ý** banner (info-tinted card with sparkles icon)
- Action buttons that REPLACE the row's collapsed mini buttons (variants: primary / secondary / danger; emoji icons supported)

When expanded, the row's collapsed action buttons hide and the chevron flips to `ChevronDown`. Action click toasts the label and removes approve-type items from the list.

Context entries live in `WORKSPACE_CONTEXTS` keyed by item ID. Approvals get rich evidence (3-week accuracy history for CN Adjust, MAPE-vs-SS contradiction warning for SS Change, capacity check for PO Release, force-release impact analysis). Exceptions get cause + 3 ranked suggestions. Notifications get last-sync + reminder history + a single 1-action button.

### Localized labels

All English raw types are mapped to Vietnamese in both `WorkspacePage.tsx` initial items and `ApprovalTable.tsx` via `localizeType()`:
- "CN Adjust" → "CN điều chỉnh"
- "PO Release" → "Phát hành PO"
- "Force-release" → "Phát hành khẩn"
- "SS Change" → "Thay đổi tồn kho an toàn"
- Time tokens: "15m" → "15 phút", "2h" → "2 giờ", "1d" → "1 ngày"

## "Bắt đầu"

Two big workflow CTAs: **Vận hành ngày** (NM Supply → Demand → DRP & Orders) and **Kế hoạch tháng** (Demand Review → S&OP → Hub).
