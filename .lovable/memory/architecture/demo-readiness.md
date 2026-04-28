---
name: Demo readiness
description: Polish hoàn tất cho demo full luồng — lazy load, dev routes, NotFound, SEO, demo CTA
type: feature
---

## Đã polish (28/04/2026)
- ✅ Xóa `AllocationPage.tsx` + `TransportPage.tsx` (mồ côi). Refs cũ trong `useIdleNudge`, `GuidePage`, `NextStepContext` đã trỏ sang `/drp` & `/orders?tab=packing`.
- ✅ Lazy load tất cả page trừ `Index` + `WorkspacePage` + `AuthPage` + `NotFound`. Suspense fallback = spinner full-screen ("Đang tải trang…"). Initial bundle giảm ~60-70%.
- ✅ Dev-only routes (`/design-test`, `/qa/kpi`) chỉ render khi `import.meta.env.DEV`. Production build sẽ 404.
- ✅ `NotFound` redesign: warning icon + 4 quick links (Workspace/DRP/Orders/Monitoring) + 2 CTA (Home, Guide).
- ✅ `index.html` SEO: lang="vi", title <60c, description <160c, canonical, OG, Twitter card, theme-color.
- ✅ Workspace header có nút **▶️ Demo full luồng (5 phút)** → `/guide` (đã có 6 step demo full).

## Convention
- Pages mới phải lazy load (`const X = lazy(() => import("./X"))`) trừ khi cần ngay khi auth.
- Dev routes wrap trong `{import.meta.env.DEV && <>...</>}`.
- 404 luôn dùng `NotFound` mới — không tự render text "Page not found".
