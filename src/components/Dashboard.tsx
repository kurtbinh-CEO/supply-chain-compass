/**
 * Dashboard — M13: KPI cards interactive + Exception inline action
 *
 * 4 KPI cards become click-to-drill (Sheet on right). Exception "table" is now
 * a SmartTable; clicking a row expands an inline context block with cause +
 * suggested actions. UI-only — no business logic moves; data is mocked.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, TrendingDown, Clock, ArrowRight, Phone,
  ArrowLeftRight, PackagePlus, Sparkles, ChevronRight,
  DollarSign, AlertOctagon, PackageCheck, Boxes,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/KpiCard";
import { StatusChip } from "@/components/StatusChip";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════════════════════
   KPI drill-down data (mock)
   ═══════════════════════════════════════════════════════════════════════════ */
type KpiKey = "revenue_at_risk" | "open_exceptions" | "fill_rate" | "doh";

const REVENUE_BREAKDOWN = [
  { cause: "Thiếu tồn",  value: 1200, pct: 38, tone: "danger"  },
  { cause: "NM trễ",     value:  950, pct: 30, tone: "warning" },
  { cause: "Dự báo sai", value:  680, pct: 21, tone: "info"    },
  { cause: "Khác",       value:  340, pct: 11, tone: "muted"   },
] as const;

const TOP_RISK_SKUS = [
  { sku: "GA-300 A4", cn: "CN-BD", value: 780, route: "/drp?cn=BD&sku=GA-300" },
  { sku: "GA-600",    cn: "CN-CT", value: 420, route: "/drp?cn=CT&sku=GA-600" },
  { sku: "GA-400",    cn: "CN-HN", value: 280, route: "/drp?cn=HN&sku=GA-400" },
];

const REVENUE_TREND = [3.6, 3.8, 3.4, 3.17];

const EXCEPTION_BUCKETS = [
  { kind: "Thiếu tồn",  count: 5, tone: "danger"  },
  { kind: "NM trễ",     count: 4, tone: "warning" },
  { kind: "Dự báo sai", count: 3, tone: "info"    },
  { kind: "Khác",       count: 2, tone: "muted"   },
] as const;

const FILL_RATE_PER_CN = [
  { cn: "CN-BD",  value: 75, status: "danger"  as const },
  { cn: "CN-NA",  value: 88, status: "warning" as const },
  { cn: "CN-CT",  value: 91, status: "warning" as const },
  { cn: "CN-DN",  value: 95, status: "success" as const },
  { cn: "CN-HCM", value: 96, status: "success" as const },
  { cn: "CN-HN",  value: 99, status: "success" as const },
];

const DOH_PER_CN = [
  { cn: "CN-BMT", value: 1.8, status: "danger"  as const },
  { cn: "CN-BD",  value: 2.6, status: "warning" as const },
  { cn: "CN-CT",  value: 3.4, status: "warning" as const },
  { cn: "CN-HCM", value: 4.1, status: "success" as const },
  { cn: "CN-HN",  value: 5.2, status: "success" as const },
];

const DOH_PER_SKU = [
  { sku: "GA-600", value: 2.1, status: "danger"  as const },
  { sku: "PK-001", value: 3.5, status: "warning" as const },
  { sku: "GA-400", value: 4.7, status: "success" as const },
  { sku: "GA-300", value: 6.8, status: "success" as const },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Exception rows — typed for SmartTable + inline drill-down
   ═══════════════════════════════════════════════════════════════════════════ */
interface ExceptionAction {
  icon: typeof ArrowLeftRight;
  label: string;
  meta?: string;
  route?: string;
  primary?: boolean;
}

interface ExceptionRow {
  id: string;
  type: string;
  sku: string;
  description: string;
  revenueAtRisk: string;
  roi: string;
  timeToAct: string;
  status: "danger" | "warning" | "info";
  statusLabel: string;
  /** Inline expand contents */
  detail: string;
  cause: string;
  actions: ExceptionAction[];
  acceptHint?: string;
}

const EXCEPTIONS: ExceptionRow[] = [
  {
    id: "EX-001", type: "Thiếu hụt tồn kho", sku: "GA-300 A4",
    description: "Gạch GA-300 sắp hết tồn — chỉ còn 1,5 ngày bán",
    revenueAtRisk: "1,2 tỷ", roi: "6,7x", timeToAct: "48h",
    status: "danger", statusLabel: "Khẩn cấp",
    detail: "GA-300 A4 CN-BD · Tồn 120m² · HSTK 1,5d · Nhu cầu 1.560m² · Thiếu 1.440m²",
    cause: "NM Toko trễ PO 7 ngày + CN-BD demand +32% (nhà thầu mới)",
    actions: [
      { icon: ArrowLeftRight, label: "Chuyển ngang 200m² từ CN-HCM", meta: "1d · 3,2 triệu", route: "/orders", primary: true },
      { icon: PackagePlus,    label: "PO khẩn NM Mikado 1.000m²",     meta: "14d · 188 triệu", route: "/hub" },
      { icon: Phone,          label: "Gọi NM Toko nhắc PO trễ 7d",     meta: "Liên hệ ngay",    primary: true },
    ],
    acceptHint: "Chấp nhận gợi ý 1+3 ✓",
  },
  {
    id: "EX-002", type: "Chênh lệch dự báo", sku: "GA-300 BG",
    description: "Dự báo tháng 5 vượt 32% so với xu hướng — cần xác nhận",
    revenueAtRisk: "680 tr", roi: "15,1x", timeToAct: "5 ngày",
    status: "warning", statusLabel: "Cần xem xét",
    detail: "Dự báo T5 vượt 32% vs xu hướng 12 tháng",
    cause: "B2B deal mới 50.000m² (xác suất 80%) đẩy demand",
    actions: [
      { icon: Sparkles,    label: "Xem B2B deal chi tiết", route: "/demand" },
      { icon: TrendingDown, label: "Điều chỉnh FC tháng 5", route: "/sop" },
    ],
    acceptHint: "Ghi nhận, theo dõi tiếp",
  },
  {
    id: "EX-003", type: "Trễ giao hàng NCC", sku: "KM-GLAZE-01",
    description: "NCC Minh Phát trễ 7 ngày — ảnh hưởng 12 đơn sản xuất",
    revenueAtRisk: "950 tr", roi: "7,9x", timeToAct: "24h",
    status: "danger", statusLabel: "Khẩn cấp",
    detail: "PO-MP-W18-005 cam kết 13/05, hiện chưa giao · Ảnh hưởng 12 đơn SX downstream",
    cause: "NM Minh Phát thiếu nguyên liệu men (đợt nhập trễ từ China)",
    actions: [
      { icon: Phone,          label: "Gọi NM Minh Phát escalate",     meta: "Liên hệ ngay",     primary: true },
      { icon: PackagePlus,    label: "PO backup NM Đại Việt 800kg",   meta: "10d · 145 triệu", route: "/hub" },
      { icon: ArrowLeftRight, label: "Chuyển men dư từ NM Vigracera", meta: "3d · 22 triệu",   route: "/supply" },
    ],
    acceptHint: "Chấp nhận gợi ý 1+2 ✓",
  },
  {
    id: "EX-004", type: "Tồn kho cao", sku: "GA-450 GR",
    description: "Tồn kho 92 ngày bán — vượt ngưỡng 60 ngày",
    revenueAtRisk: "340 tr", roi: "13,6x", timeToAct: "2 tuần",
    status: "info", statusLabel: "Theo dõi",
    detail: "GA-450 GR CN-BD · Tồn 1.840m² · HSTK 92d · Demand chậm",
    cause: "Demand actual T3-T4 thấp hơn FC 28% · Variant GR ít được chọn",
    actions: [
      { icon: ArrowLeftRight, label: "Chuyển 600m² sang CN-HCM",    meta: "2d · 8 triệu",    route: "/orders" },
      { icon: Sparkles,       label: "Đánh giá điều chỉnh FC GA-450", route: "/sop" },
    ],
    acceptHint: "Ghi nhận, chờ duyệt SC Manager",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Main Dashboard
   ═══════════════════════════════════════════════════════════════════════════ */
export function Dashboard() {
  const [openKpi, setOpenKpi] = useState<KpiKey | null>(null);
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Screen title */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-screen-title text-text-1">Tổng quan chuỗi cung ứng</h1>
        <span className="text-table-sm text-text-3">Cập nhật: 13/04/2026 08:30</span>
      </div>

      {/* KPI row — clickable */}
      <div className="grid grid-cols-4 gap-4">
        <ClickableKpi onClick={() => setOpenKpi("revenue_at_risk")}>
          <KpiCard title="Doanh thu rủi ro"
            valueNum={3_170_000_000} valueUnit="vnd"
            tone="danger" icon={DollarSign}
            trend={kpiTrend(12, "pct", { higherIsBetter: false, vs: "tuần trước" })} />
        </ClickableKpi>
        <ClickableKpi onClick={() => setOpenKpi("open_exceptions")}>
          <KpiCard title="Ngoại lệ mở"
            valueNum={14} valueUnit="qty" qtyLabel="vấn đề"
            tone="warning" icon={AlertOctagon}
            trend={kpiTrend(3, "qty", { higherIsBetter: false, qtyLabel: "mới hôm nay" })} />
        </ClickableKpi>
        <ClickableKpi onClick={() => setOpenKpi("fill_rate")}>
          <KpiCard title="Tỷ lệ lấp đầy"
            valueNum={94.2} valueUnit="pct"
            tone="success" icon={PackageCheck}
            trend={kpiTrend(1.3, "pct", { higherIsBetter: true, vs: "tháng trước" })} />
        </ClickableKpi>
        <ClickableKpi onClick={() => setOpenKpi("doh")}>
          <KpiCard title="Ngày tồn kho TB"
            valueNum={38} valueUnit="qty" qtyLabel="ngày"
            tone="info" icon={Boxes}
            hint="Trong ngưỡng" />
        </ClickableKpi>
      </div>

      {/* Exception SmartTable */}
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h2 className="font-display text-section-header text-text-1">Ngoại lệ ưu tiên</h2>
            <span className="ml-1 rounded-full bg-danger-bg text-danger text-caption font-medium px-2 py-0.5">
              4 cần xử lý
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/workspace")}>
            Xem tất cả <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        <SmartTable<ExceptionRow>
          data={EXCEPTIONS}
          getRowId={(r) => r.id}
          screenId="dashboard-exceptions"
          defaultDensity="normal"
          rowSeverity={(r) =>
            r.status === "danger" ? "shortage" : r.status === "warning" ? "watch" : undefined
          }
          drillDown={(r) => <ExceptionDrillDown row={r} />}
          columns={[
            {
              key: "id", label: "Mã", width: 100, hideable: false,
              accessor: (r) => r.id,
              render: (r) => <span className="font-mono text-table text-text-2">{r.id}</span>,
            },
            {
              key: "type", label: "Loại", width: 180,
              accessor: (r) => r.type,
              render: (r) => <span className="text-table font-medium text-text-1">{r.type}</span>,
            },
            {
              key: "description", label: "Mô tả", width: 320,
              accessor: (r) => r.description,
              render: (r) => <span className="text-table text-text-2 line-clamp-1">{r.description}</span>,
            },
            {
              key: "revenueAtRisk", label: "Doanh thu rủi ro", width: 140, align: "right", numeric: true,
              accessor: (r) => parseFloat(r.revenueAtRisk),
              render: (r) => <span className="text-table font-semibold text-text-1 tabular-nums">{r.revenueAtRisk}</span>,
            },
            {
              key: "roi", label: "ROI", width: 80, align: "right", numeric: true,
              accessor: (r) => parseFloat(r.roi),
              render: (r) => <span className="text-table font-semibold text-success tabular-nums">{r.roi}</span>,
            },
            {
              key: "timeToAct", label: "Thời hạn", width: 110, align: "center",
              accessor: (r) => r.timeToAct,
              render: (r) => (
                <span className="inline-flex items-center gap-1 text-table-sm text-text-2">
                  <Clock className="h-3 w-3" /> {r.timeToAct}
                </span>
              ),
            },
            {
              key: "status", label: "Trạng thái", width: 130, align: "center",
              accessor: (r) => r.status,
              render: (r) => <StatusChip status={r.status} label={r.statusLabel} />,
            },
          ] satisfies SmartTableColumn<ExceptionRow>[]}
        />
      </div>

      {/* Quick summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard
          icon={TrendingDown} iconClass="text-warning"
          title="Dự báo nhu cầu"
          body="Tháng 5 dự kiến nhu cầu gạch 60x60 tăng 18%. Nhóm GT-3030 giảm 5%."
          ctaLabel="Xem chi tiết →" onClick={() => navigate("/demand")}
        />
        <SummaryCard
          icon={Clock} iconClass="text-info"
          title="Chờ duyệt"
          body="3 đề xuất mua hàng và 2 điều chỉnh dự báo đang chờ duyệt tại Workspace."
          ctaLabel="Đi đến Workspace →" onClick={() => navigate("/workspace")}
        />
        <SummaryCard
          icon={AlertTriangle} iconClass="text-danger"
          title="NCC cần theo dõi"
          body="2 NCC có fill-rate dưới 85% trong 30 ngày qua. Minh Phát: 72%, Đại Việt: 81%."
          ctaLabel="Xem NCC →" onClick={() => navigate("/hub")}
        />
      </div>

      {/* KPI drill-down sheet */}
      <Sheet open={!!openKpi} onOpenChange={(v) => !v && setOpenKpi(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg overflow-y-auto">
          {openKpi === "revenue_at_risk" && <RevenueAtRiskSheet onNav={(p) => { setOpenKpi(null); navigate(p); }} />}
          {openKpi === "open_exceptions"  && <OpenExceptionsSheet onNav={(p) => { setOpenKpi(null); navigate(p); }} />}
          {openKpi === "fill_rate"        && <FillRateSheet onNav={(p) => { setOpenKpi(null); navigate(p); }} />}
          {openKpi === "doh"              && <DohSheet onNav={(p) => { setOpenKpi(null); navigate(p); }} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */
function ClickableKpi({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-card transition-all hover:ring-2 hover:ring-primary/40 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {children}
    </button>
  );
}

function SummaryCard({
  icon: Icon, iconClass, title, body, ctaLabel, onClick,
}: {
  icon: typeof Clock; iconClass: string; title: string; body: string;
  ctaLabel: string; onClick: () => void;
}) {
  return (
    <div className="rounded-card border border-surface-3 bg-surface-1 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", iconClass)} />
        <h3 className="font-display text-section-header text-text-1">{title}</h3>
      </div>
      <p className="text-table text-text-2">{body}</p>
      <Button variant="ghost" size="sm" className="text-primary" onClick={onClick}>{ctaLabel}</Button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Exception inline drill-down
   ═══════════════════════════════════════════════════════════════════════════ */
function ExceptionDrillDown({ row }: { row: ExceptionRow }) {
  const navigate = useNavigate();
  return (
    <div className="bg-surface-1 border-t border-surface-3 p-4 space-y-3">
      <InfoBlock label="Tình trạng" value={row.detail} />
      <InfoBlock label="Nguyên nhân" value={row.cause} />

      <div>
        <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">
          Gợi ý hành động
        </div>
        <div className="space-y-1.5">
          {row.actions.map((a, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                if (a.route) navigate(a.route);
                else toast.success(a.label);
              }}
              className={cn(
                "w-full flex items-center gap-3 rounded-card border px-3 py-2 text-left transition-colors",
                a.primary
                  ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                  : "border-surface-3 bg-surface-0 hover:bg-surface-2",
              )}
            >
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                a.primary ? "bg-primary/15 text-primary" : "bg-surface-3 text-text-2",
              )}>
                <span className="text-[11px] font-bold">{i + 1}</span>
              </div>
              <a.icon className={cn("h-4 w-4 shrink-0", a.primary ? "text-primary" : "text-text-3")} />
              <div className="flex-1 min-w-0">
                <div className="text-table-sm font-medium text-text-1 truncate">{a.label}</div>
                {a.meta && <div className="text-[11px] text-text-3">{a.meta}</div>}
              </div>
              <ChevronRight className="h-4 w-4 text-text-3 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {row.acceptHint && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); toast.success(`${row.id}: ${row.acceptHint}`); }}
          >
            {row.acceptHint}
          </Button>
          <Button
            size="sm" variant="outline"
            onClick={(e) => { e.stopPropagation(); navigate("/workspace"); }}
          >
            Tùy chỉnh →
          </Button>
        </div>
      )}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-surface-3 bg-surface-0 px-3 py-2">
      <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-0.5">{label}</div>
      <div className="text-table-sm text-text-1">{value}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   KPI sheets
   ═══════════════════════════════════════════════════════════════════════════ */
function RevenueAtRiskSheet({ onNav }: { onNav: (path: string) => void }) {
  const max = Math.max(...REVENUE_BREAKDOWN.map(b => b.value));
  return (
    <>
      <SheetHeader>
        <SheetTitle>Doanh thu rủi ro · 3,17 tỷ VND</SheetTitle>
        <SheetDescription>Phân bổ theo nguyên nhân và xu hướng 4 tuần</SheetDescription>
      </SheetHeader>
      <div className="space-y-5 mt-4">
        {/* Cause breakdown */}
        <section>
          <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">
            Phân bổ theo nguyên nhân
          </div>
          <div className="space-y-2">
            {REVENUE_BREAKDOWN.map(b => (
              <div key={b.cause}>
                <div className="flex items-center justify-between text-table-sm mb-1">
                  <span className="text-text-1">{b.cause}</span>
                  <span className="tabular-nums text-text-2">
                    <strong className="text-text-1">{b.value.toLocaleString()}</strong> triệu ({b.pct}%)
                  </span>
                </div>
                <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      b.tone === "danger" && "bg-danger",
                      b.tone === "warning" && "bg-warning",
                      b.tone === "info" && "bg-info",
                      b.tone === "muted" && "bg-text-3",
                    )}
                    style={{ width: `${(b.value / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Top SKUs */}
        <section>
          <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">
            Top 3 mã hàng rủi ro
          </div>
          <div className="space-y-1.5">
            {TOP_RISK_SKUS.map((s, i) => (
              <button
                key={s.sku + s.cn}
                onClick={() => onNav(s.route)}
                className="w-full flex items-center gap-3 rounded-card border border-surface-3 bg-surface-0 hover:bg-surface-2 px-3 py-2 transition-colors text-left"
              >
                <Badge variant="outline" className="text-[10px] font-bold">{i + 1}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-table-sm font-medium text-text-1">{s.sku} · {s.cn}</div>
                  <div className="text-[11px] text-text-3">Xem chi tiết DRP</div>
                </div>
                <div className="text-right tabular-nums shrink-0">
                  <div className="text-table-sm font-bold text-text-1">{s.value} tr</div>
                </div>
                <ChevronRight className="h-4 w-4 text-text-3" />
              </button>
            ))}
          </div>
        </section>

        {/* Trend */}
        <section>
          <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">
            Xu hướng 4 tuần
          </div>
          <div className="flex items-end gap-2">
            <Sparkline values={REVENUE_TREND} className="flex-1 h-16" />
            <div className="text-right">
              <div className="text-h3 font-display font-bold text-text-1 tabular-nums">3,17</div>
              <div className="text-table-sm text-success font-medium">↓ 12% vs tuần trước</div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function OpenExceptionsSheet({ onNav }: { onNav: (path: string) => void }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle>Ngoại lệ mở · 14 vấn đề</SheetTitle>
        <SheetDescription>Phân loại và filter nhanh</SheetDescription>
      </SheetHeader>
      <div className="space-y-5 mt-4">
        <section>
          <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">
            Phân loại
          </div>
          <div className="grid grid-cols-2 gap-2">
            {EXCEPTION_BUCKETS.map(b => (
              <div key={b.kind} className="rounded-card border border-surface-3 bg-surface-0 p-3">
                <div className="text-table-sm text-text-2 mb-1">{b.kind}</div>
                <div className={cn(
                  "text-h3 font-display font-bold tabular-nums",
                  b.tone === "danger" && "text-danger",
                  b.tone === "warning" && "text-warning",
                  b.tone === "info" && "text-info",
                  b.tone === "muted" && "text-text-2",
                )}>{b.count}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">Chỉ khẩn cấp</Button>
          <Button variant="outline" size="sm">Mới hôm nay</Button>
        </section>

        <Button className="w-full" onClick={() => onNav("/workspace")}>
          Xử lý tất cả khẩn cấp →
        </Button>
      </div>
    </>
  );
}

function FillRateSheet({ onNav }: { onNav: (path: string) => void }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle>Tỷ lệ lấp đầy · 94,2%</SheetTitle>
        <SheetDescription>Phân bổ theo CN — click để xem DRP</SheetDescription>
      </SheetHeader>
      <div className="space-y-2 mt-4">
        {FILL_RATE_PER_CN.map(c => (
          <button
            key={c.cn}
            onClick={() => onNav(`/drp?cn=${c.cn.replace("CN-", "")}`)}
            className="w-full grid grid-cols-[80px_1fr_60px_24px] items-center gap-3 px-2 py-2 rounded-card hover:bg-surface-2 text-left"
          >
            <span className="font-mono text-table-sm font-semibold text-text-1">{c.cn}</span>
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  c.status === "danger" && "bg-danger",
                  c.status === "warning" && "bg-warning",
                  c.status === "success" && "bg-success",
                )}
                style={{ width: `${c.value}%` }}
              />
            </div>
            <span className={cn(
              "text-right tabular-nums text-table-sm font-bold",
              c.status === "danger" && "text-danger",
              c.status === "warning" && "text-warning",
              c.status === "success" && "text-success",
            )}>{c.value}%</span>
            <ChevronRight className="h-4 w-4 text-text-3" />
          </button>
        ))}
      </div>
    </>
  );
}

function DohSheet({ onNav }: { onNav: (path: string) => void }) {
  const [view, setView] = useState<"cn" | "sku">("cn");
  return (
    <>
      <SheetHeader>
        <SheetTitle>Ngày tồn kho TB · 38 ngày</SheetTitle>
        <SheetDescription>Phân bổ theo CN hoặc SKU</SheetDescription>
      </SheetHeader>
      <div className="flex gap-1 mt-4 mb-3 rounded-button bg-surface-1 border border-surface-3 p-0.5 w-fit">
        {(["cn", "sku"] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "px-3 py-1 text-table-sm font-medium rounded-button transition-colors",
              view === v ? "bg-primary text-primary-foreground" : "text-text-3 hover:text-text-1",
            )}
          >
            {v === "cn" ? "Theo CN" : "Theo SKU"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {(view === "cn" ? DOH_PER_CN : DOH_PER_SKU).map((row) => {
          const id = "cn" in row ? row.cn : row.sku;
          const route = "cn" in row ? `/drp?cn=${row.cn.replace("CN-", "")}` : `/inventory?sku=${row.sku}`;
          return (
            <button
              key={id}
              onClick={() => onNav(route)}
              className="w-full grid grid-cols-[100px_1fr_70px_24px] items-center gap-3 px-2 py-2 rounded-card hover:bg-surface-2 text-left"
            >
              <span className="font-mono text-table-sm font-semibold text-text-1">{id}</span>
              <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    row.status === "danger" && "bg-danger",
                    row.status === "warning" && "bg-warning",
                    row.status === "success" && "bg-success",
                  )}
                  style={{ width: `${Math.min(100, (row.value / 8) * 100)}%` }}
                />
              </div>
              <span className={cn(
                "text-right tabular-nums text-table-sm font-bold",
                row.status === "danger" && "text-danger",
                row.status === "warning" && "text-warning",
                row.status === "success" && "text-success",
              )}>{row.value}d</span>
              <ChevronRight className="h-4 w-4 text-text-3" />
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sparkline
   ═══════════════════════════════════════════════════════════════════════════ */
function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 200, h = 60;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className}>
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map((v, i) => {
        const x = i * step;
        const y = h - ((v - min) / range) * h;
        return <circle key={i} cx={x} cy={y} r="3" fill="hsl(var(--primary))" />;
      })}
    </svg>
  );
}
