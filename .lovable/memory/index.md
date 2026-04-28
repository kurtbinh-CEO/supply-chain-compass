# Project Memory

## Core
Smartlog SCP/DRP — supply chain planning platform for VN logistics. Light theme default, dark mode supported.
Manrope display, Inter body, JetBrains Mono. Design tokens in design-tokens.css, Tailwind semantic colors.
i18n: VI default, EN supported. All UI text via `t()` hook from I18nContext.

## Memories
- [Color palette](mem://design/color-palette) — White-dominant surfaces, slate text, vivid status colors
- [Theme & i18n](mem://features/theme-i18n) — Dark mode (3 modes) + i18n (vi/en) system
- [CN Portal](mem://features/cn-portal) — 4 tabs: demand adjustment, inventory, chat, audit
- [Management screens](mem://features/management-screens) — System management consolidated into 3 areas
- [PO system hierarchy](mem://features/po-system-hierarchy) — 2-tier PO hierarchy for factory procurement
- [Pivot logic](mem://ux/pivot-logic) — ViewPivotToggle for CN-first/SKU-first views
- [Calculation visuals](mem://design/calculation-visuals) — Bridge/waterfall/formula components
- [State management](mem://architecture/state-management) — SS data sync between monitoring and other modules
- [RBAC masking](mem://security/rbac-masking) — Role-based access control constraints
- [Voice interaction](mem://ux/voice-interaction) — Voice-driven interactions for field/warehouse
- [Logic center](mem://features/logic-center) — /logic documentation hub with 4 tabs
- [DRP allocation](mem://features/drp-allocation) — 3-layer progressive disclosure
- [DRP container](mem://features/drp-container) — DRP Bước 3 "Đóng container" section: 12 mock chuyến, ghép tuyến, hold/ship, farmer chỉnh sửa
- [Monitoring](mem://features/monitoring) — 5 hero KPI cards + 7 detail tabs
- [Executive overview](mem://features/executive) — /executive 4-zone leadership dashboard, SC_MANAGER only (M16)
- [Supplier portal](mem://features/supplier-portal) — Mobile-first interface for factory partners
- [Demand weekly](mem://features/demand-weekly) — Lean branch-level adjustments
- [Navigation shell](mem://features/navigation-shell) — 260px frosted-glass sidebar
- [Orders module](mem://features/orders-module) — 2-tab PO/TO lifecycle
- [Orders side panel](mem://features/orders-side-panel) — Row click opens 480px Sheet; all transitions use TransitionShell with required comment + files
- [Orders multi-drop](mem://features/orders-multidrop) — Ghép tuyến 2-3 CN/xe; table drill 2-level (drops→SKU); panel split shared+per-drop timeline
- [Daily ops](mem://features/daily-ops-module) — NM Supply, Demand Weekly, DRP, Orders
- [Supply sync](mem://features/supply-sync) — NM Supply single-view inventory
- [Hub commitment](mem://features/hub-commitment) — NM orders and reconciliation tabs
- [SOP consensus](mem://features/sop-consensus) — 2-tab meeting workflow
- [Demand review](mem://features/demand-review) — 2 tabs: Demand total + B2B input
- [Workspace](mem://features/workspace) — Priority-ranked action items
- [Workflow system](mem://features/workflow-system) — Daily 3-step and monthly workflows
- [Interaction patterns](mem://ux/interaction-patterns) — 480px slide-in panels, expandable rows
- [Multi-tenancy](mem://architecture/multi-tenancy) — UNIS, TTC, MDLZ tenant switching
- [UX principles](mem://ux/principles) — Exception-first, AI Trust Blocks
- [Components](mem://design/components) — Card/button/table standards
- [Typography](mem://design/typography) — Font hierarchy and sizes
- [Design identity](mem://design/identity) — Digital Curator design language
- [Project context](mem://project/context) — Platform overview and target users
- [Empty states](mem://design/empty-states) — SmartTable rich emptyState pattern (icon + title + description + action)
- [Density rule](mem://design/density-rule) — defaultDensity=compact for long/operational; normal for dashboard summaries
- [Column widths](mem://design/column-widths) — Fixed widths convention for SmartTable cols (mono/SKU/CN/numeric/chip/action)
- [Sticky header](mem://design/sticky-header) — SmartTable sticky thead/tfoot is always-on; no prop. Raw tables replicate the pattern manually.
- [Farmer mode](mem://features/farmer-mode) — Mobile toggle in TopBar bumping KpiCard/HeroCard padding+font for quick scan
- [KPI thresholds](mem://design/kpi-thresholds) — Centralized length cutoffs + max-widths for KpiCard/HeroCard auto-shrink in src/lib/kpi-thresholds.ts
- [ScreenHeader standard](mem://design/screen-header) — Standardized page header: truncate title/subtitle, h-8 actions, no wrap, fragment-based actions
- [Demo readiness](mem://architecture/demo-readiness) — Lazy load, dev-only routes, NotFound redesign, SEO, Workspace demo CTA
- [Gap scenario resolution](mem://features/gap-scenario-resolution) — Chọn kịch bản A/B/C/D → ConfirmDialog → tạo PO/Task/tier impact, banner + cột tracking
- [Transport logic](mem://features/transport-logic) — 4 ma trận route/drop/fill-up/edit + ConfigPage Vận tải tab + wired vào ContainerEditPreview, PoLinesEditor, RoundUpSuggestion
- [Transport audit](mem://features/transport-audit) — Audit log panel ghi nhận mọi quyết định tự động của 4 ma trận transport (timestamp + actorRole), persist localStorage
