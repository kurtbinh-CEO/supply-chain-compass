/**
 * OrdersPage — M5 lean rewrite
 *
 * 3 tabs:
 *   1. Duyệt PO/TO    — gộp PO_DRAFT (status=draft|submitted) + TO chờ duyệt
 *   2. Vận chuyển      — TRANSPORT_PLANS + TO đã duyệt; gán nhà xe / Hold-or-Ship
 *   3. Theo dõi        — PO + TO status in (confirmed, shipped, received) với timeline
 *
 * XÓA:
 *   - BPO Burn-down (chuyển sang /monitoring)
 *   - Tab Chuyển ngang riêng (gộp vào Duyệt + Vận chuyển)
 *   - Tab Nhà xe riêng (chuyển sang /master-data)
 *
 * Header có flow summary 1 dòng:
 *   DRP→ [5 chờ duyệt] →duyệt→ [2 chờ nhà xe] →ship→ [3 đang giao] → [1 nhận]
 */
import { useState, useMemo, useEffect, Fragment } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTenant } from "@/components/TenantContext";
import { usePurchaseOrders, type PurchaseOrderRow } from "@/hooks/usePurchaseOrders";
import {
  PO_DRAFT, TRANSPORT_PLANS, CARRIERS, CN_REGION,
  type TransportPlan, type Carrier,
} from "@/data/unis-enterprise-dataset";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import {
  ClipboardCheck, Truck, MapPin, ChevronRight, ChevronDown,
  Send, CheckCircle2, AlertTriangle, Phone, ArrowRight, Package,
  Pause, Play,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   §  Helpers / labels
   ═══════════════════════════════════════════════════════════════════════════ */

const tenantScales: Record<string, number> = { "UNIS Group": 1, "TTC Agris": 0.7, "Mondelez": 1.35 };

const STAGE_LABEL: Record<string, string> = {
  draft: "Nháp",
  submitted: "Đã gửi",
  confirmed: "NM xác nhận",
  in_production: "Đang SX",
  shipped: "Đã giao",
  received: "Đã nhận",
  cancelled: "Đã hủy",
};

function fmtVnd(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} tỷ`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} triệu`;
  return v.toLocaleString("vi-VN");
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

/* PO type = RPO | BPO | TO derived from po_number prefix or to_cn */
type PoKind = "RPO" | "BPO" | "TO";
function detectKind(po: PurchaseOrderRow): PoKind {
  const n = po.po_number.toUpperCase();
  if (n.startsWith("BPO")) return "BPO";
  if (n.startsWith("TO")) return "TO";
  return "RPO";
}
const KIND_BADGE: Record<PoKind, string> = {
  RPO: "bg-success-bg text-success border-success/30",
  BPO: "bg-info-bg text-info border-info/30",
  TO:  "bg-warning-bg text-warning border-warning/30",
};

/* ═══════════════════════════════════════════════════════════════════════════
   §  Mock TO (Transfer Order) data — chuyển ngang giữa CN
   ═══════════════════════════════════════════════════════════════════════════ */
type ToRow = {
  id: string;
  fromCn: string;
  toCn: string;
  sku: string;
  qty: number;
  status: "draft" | "submitted" | "confirmed" | "shipped" | "received";
  carrier: string | null;
  driver: string | null;
  driverPhone: string | null;
  vehicle: string | null;
  eta: string;
};
const TO_DRAFT: ToRow[] = [
  { id: "TO-HCM-BD-2605-001", fromCn: "CN-HCM", toCn: "CN-BD",  sku: "GA-600 A4", qty: 200, status: "draft",     carrier: null,         driver: null,             driverPhone: null,       vehicle: null,        eta: "2026-05-15" },
  { id: "TO-QN-NA-2605-001",  fromCn: "CN-QN",  toCn: "CN-NA",  sku: "GA-300 A4", qty: 180, status: "draft",     carrier: null,         driver: null,             driverPhone: null,       vehicle: null,        eta: "2026-05-15" },
  { id: "TO-HN-NA-2605-001",  fromCn: "CN-HN",  toCn: "CN-NA",  sku: "GM-300 A4", qty: 95,  status: "submitted", carrier: "Vinatrans",  driver: null,             driverPhone: null,       vehicle: null,        eta: "2026-05-16" },
  { id: "TO-DN-CT-2605-001",  fromCn: "CN-DN",  toCn: "CN-CT",  sku: "GA-300 B2", qty: 80,  status: "shipped",   carrier: "Tân Cảng",   driver: "Nguyễn Văn Tài", driverPhone: "0902 777 888", vehicle: "51C-65902", eta: "2026-05-14" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   §  Tabs definition
   ═══════════════════════════════════════════════════════════════════════════ */
const TABS = [
  { key: "approval",  label: "Duyệt PO/TO",  icon: ClipboardCheck },
  { key: "transport", label: "Vận chuyển",   icon: Truck },
  { key: "tracking",  label: "Theo dõi",     icon: MapPin },
] as const;
type TabKey = typeof TABS[number]["key"];

/* ═══════════════════════════════════════════════════════════════════════════
   §  MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function OrdersPage() {
  const { tenant } = useTenant();
  const scale = tenantScales[tenant] || 1;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { allOrders } = usePurchaseOrders();

  // Tab init: URL ?tab=… > localStorage > "approval"
  const initialTab: TabKey = (() => {
    const fromUrl = searchParams.get("tab") as TabKey | null;
    if (fromUrl && TABS.some(t => t.key === fromUrl)) return fromUrl;
    if (typeof window !== "undefined") {
      const ls = localStorage.getItem("scp-orders-active-tab") as TabKey | null;
      if (ls && TABS.some(t => t.key === ls)) return ls;
    }
    return "approval";
  })();
  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("scp-orders-active-tab", tab);
    if (searchParams.get("tab") !== tab) {
      const next = new URLSearchParams(searchParams);
      next.set("tab", tab);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  /* ── Status overrides (local approval / send actions) ── */
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [toOverrides, setToOverrides] = useState<Record<string, ToRow["status"]>>({});
  const [carrierAssign, setCarrierAssign] = useState<Record<string, string>>({});
  const effective = (po: PurchaseOrderRow) => overrides[po.po_number] || po.status;
  const effectiveTo = (t: ToRow) => toOverrides[t.id] || t.status;

  /* ── Combined PO + TO list (for header counts) ── */
  const stageCounts = useMemo(() => {
    const counts = { pendingApprove: 0, awaitCarrier: 0, inTransit: 0, received: 0 };
    allOrders.forEach(po => {
      const s = effective(po);
      if (s === "draft" || s === "submitted") counts.pendingApprove++;
      else if (s === "confirmed") counts.awaitCarrier++;
      else if (s === "shipped") counts.inTransit++;
      else if (s === "received") counts.received++;
    });
    TO_DRAFT.forEach(t => {
      const s = effectiveTo(t);
      if (s === "draft" || s === "submitted") counts.pendingApprove++;
      else if (s === "confirmed") counts.awaitCarrier++;
      else if (s === "shipped") counts.inTransit++;
      else if (s === "received") counts.received++;
    });
    // Mock baseline if DB empty
    if (allOrders.length === 0) {
      counts.pendingApprove = Math.max(counts.pendingApprove, 5);
      counts.awaitCarrier   = Math.max(counts.awaitCarrier, 2);
      counts.inTransit      = Math.max(counts.inTransit, 3);
      counts.received       = Math.max(counts.received, 1);
    }
    return counts;
  }, [allOrders, overrides, toOverrides]);

  return (
    <AppLayout>
      {/* ═══ HEADER ═══ */}
      <div className="mb-3">
        <h1 className="text-h2 font-display font-bold text-text-1">Đơn hàng — Tuần 20</h1>

        {/* Flow summary — 1 line */}
        <FlowSummary counts={stageCounts} onJump={(key) => setTab(key)} />
      </div>

      {/* ═══ VERSION ROW ═══ */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-table-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg text-success border border-success/30 px-2.5 py-0.5 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          PO Batch W20 v1 · Active
        </span>
        <span className="text-text-3 text-caption">Tổng {stageCounts.pendingApprove + stageCounts.awaitCarrier + stageCounts.inTransit + stageCounts.received} đơn</span>
      </div>

      {/* ═══ TAB BAR ═══ */}
      <div className="flex gap-1 mb-4 border-b border-surface-3">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 text-table-sm font-medium border-b-2 transition-colors -mb-px",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-text-3 hover:text-text-1"
              )}>
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      {tab === "approval"  && <ApprovalTab orders={allOrders} effective={effective} setOverrides={setOverrides} effectiveTo={effectiveTo} setToOverrides={setToOverrides} scale={scale} />}
      {tab === "transport" && <TransportTab orders={allOrders} effective={effective} setOverrides={setOverrides} effectiveTo={effectiveTo} setToOverrides={setToOverrides} carrierAssign={carrierAssign} setCarrierAssign={setCarrierAssign} scale={scale} />}
      {tab === "tracking"  && <TrackingTab orders={allOrders} effective={effective} effectiveTo={effectiveTo} carrierAssign={carrierAssign} scale={scale} />}
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   §  Flow summary
   ═══════════════════════════════════════════════════════════════════════════ */
function FlowSummary({ counts, onJump }: {
  counts: { pendingApprove: number; awaitCarrier: number; inTransit: number; received: number };
  onJump: (tab: TabKey) => void;
}) {
  const Node = ({ count, label, tab, tone }: { count: number; label: string; tab: TabKey; tone: "warn" | "info" | "primary" | "success" }) => {
    const toneCls = tone === "warn" ? "border-warning/40 bg-warning-bg/40 text-warning hover:bg-warning-bg"
      : tone === "info" ? "border-info/40 bg-info-bg/40 text-info hover:bg-info-bg"
      : tone === "primary" ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
      : "border-success/40 bg-success-bg/40 text-success hover:bg-success-bg";
    return (
      <button onClick={() => onJump(tab)}
        className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-table-sm font-medium transition-colors", toneCls)}>
        <span className="tabular-nums font-bold">{count}</span>
        <span className="text-caption opacity-90">{label}</span>
      </button>
    );
  };
  const Arrow = ({ verb }: { verb: string }) => (
    <span className="inline-flex items-center text-text-3 text-caption">
      <ArrowRight className="h-3 w-3 mx-1" />
      <span className="hidden sm:inline">{verb}</span>
      <ArrowRight className="h-3 w-3 mx-1 sm:ml-1" />
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5 text-table-sm">
      <span className="text-text-3 font-medium">DRP</span>
      <Arrow verb="" />
      <Node count={counts.pendingApprove} label="chờ duyệt" tab="approval" tone="warn" />
      <Arrow verb="duyệt" />
      <Node count={counts.awaitCarrier} label="chờ nhà xe" tab="transport" tone="info" />
      <Arrow verb="ship" />
      <Node count={counts.inTransit} label="đang giao" tab="tracking" tone="primary" />
      <ArrowRight className="h-3 w-3 mx-1 text-text-3" />
      <Node count={counts.received} label="đã nhận" tab="tracking" tone="success" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   §  TAB 1 — Duyệt PO/TO
   ═══════════════════════════════════════════════════════════════════════════ */
type ApprovalRow =
  | { type: "po"; key: string; po: PurchaseOrderRow; stage: string; kind: PoKind; qty: number; route: string; sku: string }
  | { type: "to"; key: string; to: ToRow;            stage: string; kind: PoKind; qty: number; route: string; sku: string };

function ApprovalTab({
  orders, effective, setOverrides, effectiveTo, setToOverrides, scale,
}: {
  orders: PurchaseOrderRow[];
  effective: (po: PurchaseOrderRow) => string;
  setOverrides: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  effectiveTo: (t: ToRow) => ToRow["status"];
  setToOverrides: React.Dispatch<React.SetStateAction<Record<string, ToRow["status"]>>>;
  scale: number;
}) {
  /* Combine PO drafts + TO drafts/submitted into a single typed row list */
  const rows: ApprovalRow[] = useMemo(() => {
    const out: ApprovalRow[] = [];
    orders.forEach(po => {
      const s = effective(po);
      if (s === "draft" || s === "submitted") {
        const kind = detectKind(po);
        const qty = Math.round(Number(po.quantity) * scale);
        const route = kind === "TO"
          ? `${po.notes ?? "—"}`
          : `NM ${po.supplier} → ${po.notes?.match(/CN-[A-Z]+/)?.[0] || "—"}`;
        out.push({ type: "po", key: po.po_number, po, stage: s, kind, qty, route, sku: po.sku });
      }
    });
    TO_DRAFT.forEach(to => {
      const s = effectiveTo(to);
      if (s === "draft" || s === "submitted") {
        out.push({
          type: "to", key: to.id, to, stage: s, kind: "TO",
          qty: Math.round(to.qty * scale),
          route: `${to.fromCn} → ${to.toCn}`,
          sku: to.sku,
        });
      }
    });
    return out;
  }, [orders, effective, effectiveTo, scale]);

  /* Mock fallback if DB empty */
  const showMock = orders.length === 0 && PO_DRAFT.length > 0 && rows.length === 0;
  const mockRows: ApprovalRow[] = useMemo(() => {
    if (!showMock) return [];
    return PO_DRAFT.slice(0, 5).map(po => ({
      type: "po" as const,
      key: po.poNumber,
      po: {
        po_number: po.poNumber,
        supplier: po.nmId,
        sku: po.skuBaseCode,
        quantity: po.qtyM2,
        unit_price: 0,
        currency: "VND",
        status: po.status,
        order_date: "",
        expected_date: null,
        received_date: null,
        notes: po.cnCode,
        tenant: "UNIS",
        id: po.poNumber,
      } as PurchaseOrderRow,
      stage: po.status === "draft" ? "draft" : "submitted",
      kind: "RPO",
      qty: Math.round(po.qtyM2 * scale),
      route: `NM ${po.nmId} → ${po.cnCode}`,
      sku: po.skuBaseCode,
    }));
  }, [showMock, scale]);

  const allRows = rows.length > 0 ? rows : mockRows;

  const sendPo = (po: PurchaseOrderRow) => {
    const next = po.status === "draft" ? "submitted" : "confirmed";
    setOverrides(prev => ({ ...prev, [po.po_number]: next }));
    toast.success(`Đã gửi ${po.po_number} → ${STAGE_LABEL[next]}`);
  };
  const sendTo = (t: ToRow) => {
    const next: ToRow["status"] = t.status === "draft" ? "submitted" : "confirmed";
    setToOverrides(prev => ({ ...prev, [t.id]: next }));
    toast.success(`Đã gửi ${t.id} → ${STAGE_LABEL[next]}`);
  };
  const approveAll = () => {
    const updates: Record<string, string> = {};
    rows.forEach(r => { if (r.type === "po") updates[r.po.po_number] = "confirmed"; });
    setOverrides(prev => ({ ...prev, ...updates }));
    const updatesTo: Record<string, ToRow["status"]> = {};
    rows.forEach(r => { if (r.type === "to") updatesTo[r.to.id] = "confirmed"; });
    setToOverrides(prev => ({ ...prev, ...updatesTo }));
    toast.success(`Đã duyệt ${rows.length} đơn`);
  };

  const columns: SmartTableColumn<ApprovalRow>[] = [
    {
      key: "key", label: "PO/TO #", sortable: true, hideable: false, priority: "high",
      filter: "text", width: 180,
      accessor: (r) => r.key,
      render: (r) => <span className="font-mono text-[11px] text-text-1">{r.key}</span>,
    },
    {
      key: "kind", label: "Loại", sortable: true, hideable: true, priority: "high",
      filter: "enum",
      filterOptions: [
        { value: "RPO", label: "RPO" },
        { value: "BPO", label: "BPO" },
        { value: "TO",  label: "TO"  },
      ],
      width: 80,
      accessor: (r) => r.kind,
      render: (r) => <KindBadge kind={r.kind} />,
    },
    {
      key: "route", label: "Tuyến", sortable: true, hideable: true, priority: "high",
      filter: "text",
      accessor: (r) => r.route,
      render: (r) => <span className="text-table-sm text-text-2">{r.route}</span>,
    },
    {
      key: "sku", label: "Mã hàng", sortable: true, hideable: true, priority: "medium",
      filter: "text",
      accessor: (r) => r.sku,
      render: (r) => <span className="text-table-sm text-text-2">{r.sku}</span>,
    },
    {
      key: "qty", label: "Số lượng", sortable: true, hideable: true, priority: "high",
      numeric: true, align: "right", width: 110,
      accessor: (r) => r.qty,
      render: (r) => <span className="tabular-nums text-text-1">{r.qty.toLocaleString("vi-VN")}</span>,
    },
    {
      key: "container", label: "Container", sortable: false, hideable: true, priority: "low",
      width: 120,
      render: (r) => <span className="text-table-sm text-text-3">{r.kind === "TO" ? `Xe 10T · ${Math.round(r.qty / 10)}%` : "40ft · 89%"}</span>,
    },
    {
      key: "stage", label: "Trạng thái", sortable: true, hideable: true, priority: "high",
      filter: "enum",
      filterOptions: [
        { value: "draft",     label: STAGE_LABEL.draft     },
        { value: "submitted", label: STAGE_LABEL.submitted },
      ],
      width: 130,
      accessor: (r) => r.stage,
      render: (r) => <StageBadge stage={r.stage} />,
    },
    {
      key: "action", label: "Hành động", sortable: false, hideable: false, priority: "high",
      align: "right", width: 110,
      render: (r) => {
        if (r.stage !== "draft" && r.stage !== "submitted") return null;
        if (showMock && allRows === mockRows) return <span className="text-caption text-text-3">Mock</span>;
        return (
          <button
            onClick={(e) => { e.stopPropagation(); r.type === "po" ? sendPo(r.po) : sendTo(r.to); }}
            className="inline-flex items-center gap-1 rounded-button bg-gradient-primary text-primary-foreground px-3 py-1 text-caption font-semibold">
            <Send className="h-3 w-3" /> {r.stage === "draft" ? "Gửi" : "Duyệt"}
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-table-sm text-text-3">
          {rows.length > 0 ? `${rows.length} đơn chờ xử lý` : showMock ? `${mockRows.length} đơn (mock)` : "Không có đơn chờ duyệt"}
        </div>
        {rows.length > 0 && (
          <button onClick={approveAll}
            className="inline-flex items-center gap-1.5 rounded-button bg-gradient-primary text-primary-foreground px-4 py-2 text-table-sm font-semibold shadow-sm hover:shadow-md transition-shadow">
            <CheckCircle2 className="h-4 w-4" /> Duyệt tất cả
          </button>
        )}
      </div>

      <SmartTable<ApprovalRow>
        screenId="orders-approval"
        title="Duyệt PO/TO"
        exportFilename="orders-approval"
        columns={columns}
        data={allRows}
        getRowId={(r) => r.key}
        rowSeverity={(r) => r.stage === "submitted" ? "watch" : undefined}
        emptyState={{
          icon: <ClipboardCheck className="h-8 w-8" />,
          title: "Không có đơn chờ duyệt",
          description: "Quay về Kết quả DRP để chạy đợt mới.",
          action: { label: "Mở DRP", route: "/drp" },
        }}
        drillDown={(r) => r.type === "po"
          ? <PoLineage po={r.po} kind={r.kind} />
          : <ToLineage to={r.to} />
        }
      />
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const tone =
    stage === "received" ? "bg-success-bg text-success border-success/30"
    : stage === "shipped" ? "bg-info-bg text-info border-info/30"
    : stage === "in_production" ? "bg-warning-bg text-warning border-warning/30"
    : stage === "confirmed" ? "bg-primary/10 text-primary border-primary/30"
    : stage === "submitted" ? "bg-warning-bg text-warning border-warning/30"
    : "bg-surface-1 text-text-3 border-surface-3";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", tone)}>
      {STAGE_LABEL[stage] || stage}
    </span>
  );
}

function KindBadge({ kind }: { kind: PoKind }) {
  return (
    <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide", KIND_BADGE[kind])}>
      {kind}
    </span>
  );
}

function ToLineage({ to }: { to: ToRow }) {
  return (
    <div className="text-table-sm text-text-2">
      <div className="text-caption text-text-3 mb-2">Lineage</div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded bg-surface-2 border border-surface-3 px-2 py-0.5">DRP 23:02</span>
        <ChevronRight className="h-3 w-3 text-text-3" />
        <span className="rounded bg-surface-2 border border-surface-3 px-2 py-0.5">LCNB {to.fromCn} → {to.toCn}</span>
        <ChevronRight className="h-3 w-3 text-text-3" />
        <span className="rounded bg-surface-2 border border-surface-3 px-2 py-0.5">Xe 10T</span>
        <ChevronRight className="h-3 w-3 text-text-3" />
        <span className="rounded bg-warning-bg text-warning border border-warning/30 px-2 py-0.5">Duyệt</span>
      </div>
    </div>
  );
}

function PoLineage({ po, kind }: { po: PurchaseOrderRow; kind: PoKind }) {
  return (
    <div className="text-table-sm text-text-2">
      <div className="text-caption text-text-3 mb-2">Lineage — nguồn gốc đơn hàng</div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded bg-surface-2 border border-surface-3 px-2 py-0.5">DRP 23:02</span>
        <ChevronRight className="h-3 w-3 text-text-3" />
        <span className="rounded bg-surface-2 border border-surface-3 px-2 py-0.5">Phân bổ {po.notes?.match(/CN-[A-Z]+/)?.[0] || "CN"}</span>
        <ChevronRight className="h-3 w-3 text-text-3" />
        <span className="rounded bg-surface-2 border border-surface-3 px-2 py-0.5">Container 40ft · 89%</span>
        <ChevronRight className="h-3 w-3 text-text-3" />
        <span className="rounded bg-surface-2 border border-surface-3 px-2 py-0.5">NM {po.supplier}</span>
        <ChevronRight className="h-3 w-3 text-text-3" />
        <span className="rounded bg-warning-bg text-warning border border-warning/30 px-2 py-0.5">Duyệt</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={() => toast.info("Đổi loại container")} className="rounded-button border border-surface-3 px-2.5 py-1 text-caption text-text-2 hover:text-text-1">Đổi loại ▼</button>
        <button onClick={() => toast.info("Tách thành 2 PO")} className="rounded-button border border-surface-3 px-2.5 py-1 text-caption text-text-2 hover:text-text-1">Tách</button>
        <button onClick={() => toast.info("Gộp với PO khác")} className="rounded-button border border-surface-3 px-2.5 py-1 text-caption text-text-2 hover:text-text-1">Gộp</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   §  TAB 2 — Vận chuyển
   ═══════════════════════════════════════════════════════════════════════════ */
type TransportRowT = {
  id: string;
  kind: "PO" | "TO";
  route: string;
  qty: number;
  carrier: string | null;
  eta: string;
  status: "wait" | "ready" | "moving" | "hold";
  fillPct: number;
  containerType: string;
  fromRegion?: string;
};

function TransportTab({
  orders, effective, setOverrides, effectiveTo, setToOverrides, carrierAssign, setCarrierAssign, scale,
}: {
  orders: PurchaseOrderRow[];
  effective: (po: PurchaseOrderRow) => string;
  setOverrides: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  effectiveTo: (t: ToRow) => ToRow["status"];
  setToOverrides: React.Dispatch<React.SetStateAction<Record<string, ToRow["status"]>>>;
  carrierAssign: Record<string, string>;
  setCarrierAssign: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  scale: number;
}) {
  type Filter = "all" | "PO" | "TO" | "wait" | "moving";
  const [filter, setFilter] = useState<Filter>("all");

  const rows: TransportRowT[] = useMemo(() => {
    const list: TransportRowT[] = [];
    TRANSPORT_PLANS.forEach(p => {
      const carrier = carrierAssign[p.id] ?? CARRIERS.find(c => c.id === p.carrierId)?.name ?? null;
      const status: TransportRowT["status"] = p.status === "HOLD" ? "hold"
        : !carrier ? "wait"
        : p.status === "SHIP" ? "moving"
        : "ready";
      list.push({
        id: p.id, kind: "PO",
        route: `${p.fromCode} → ${p.toCnCode}`,
        qty: Math.round(p.loadedM2 * scale),
        carrier, eta: p.scheduledDate,
        status, fillPct: p.fillPct,
        containerType: p.containerType,
        fromRegion: CN_REGION[p.toCnCode],
      });
    });
    TO_DRAFT.filter(t => effectiveTo(t) !== "draft" && effectiveTo(t) !== "submitted").forEach(t => {
      const carrier = carrierAssign[t.id] ?? t.carrier;
      const eff = effectiveTo(t);
      const status: TransportRowT["status"] = eff === "shipped" || eff === "received" ? "moving"
        : carrier ? "ready" : "wait";
      list.push({
        id: t.id, kind: "TO",
        route: `${t.fromCn} → ${t.toCn}`,
        qty: Math.round(t.qty * scale),
        carrier, eta: t.eta,
        status, fillPct: 60,
        containerType: "Xe 10T",
        fromRegion: CN_REGION[t.toCn],
      });
    });
    return list;
  }, [carrierAssign, scale, effectiveTo]);

  const filtered = rows.filter(r => {
    if (filter === "all") return true;
    if (filter === "PO" || filter === "TO") return r.kind === filter;
    if (filter === "wait") return r.status === "wait" || r.status === "hold";
    if (filter === "moving") return r.status === "moving" || r.status === "ready";
    return true;
  });

  const counts = {
    all: rows.length,
    PO: rows.filter(r => r.kind === "PO").length,
    TO: rows.filter(r => r.kind === "TO").length,
    wait: rows.filter(r => r.status === "wait" || r.status === "hold").length,
    moving: rows.filter(r => r.status === "moving" || r.status === "ready").length,
  };

  const filterTabs: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Tất cả", count: counts.all },
    { key: "PO", label: "PO", count: counts.PO },
    { key: "TO", label: "TO", count: counts.TO },
    { key: "wait", label: "Chờ nhà xe", count: counts.wait },
    { key: "moving", label: "Đang chuyển", count: counts.moving },
  ];

  const handleAssign = (id: string, carrierName: string) => {
    setCarrierAssign(prev => ({ ...prev, [id]: carrierName }));
    toast.success(`${id}: gán nhà xe ${carrierName}`);
  };
  const handleShipNow = (r: TransportRowT) => {
    if (r.kind === "TO") setToOverrides(prev => ({ ...prev, [r.id]: "shipped" }));
    toast.success(`${r.id}: override xuất ngay`);
  };
  const handleWaitMore = (r: TransportRowT) => toast.info(`${r.id}: chờ gom thêm hàng`);

  const columns: SmartTableColumn<TransportRowT>[] = [
    {
      key: "id", label: "Chuyến", sortable: true, hideable: false, priority: "high",
      filter: "text", width: 180,
      accessor: (r) => r.id,
      render: (r) => <span className="font-mono text-[11px] text-text-1">{r.id}</span>,
    },
    {
      key: "kind", label: "Loại", sortable: true, hideable: true, priority: "high",
      filter: "enum",
      filterOptions: [
        { value: "PO", label: "PO" },
        { value: "TO", label: "TO" },
      ],
      width: 80,
      accessor: (r) => r.kind,
      render: (r) => <KindBadge kind={r.kind === "PO" ? "RPO" : "TO"} />,
    },
    {
      key: "route", label: "Tuyến", sortable: true, hideable: true, priority: "high",
      filter: "text",
      accessor: (r) => r.route,
      render: (r) => <span className="text-table-sm text-text-2">{r.route}</span>,
    },
    {
      key: "qty", label: "Số lượng", sortable: true, hideable: true, priority: "high",
      numeric: true, align: "right", width: 130,
      accessor: (r) => r.qty,
      render: (r) => (
        <div>
          <div className="tabular-nums text-text-1">{r.qty.toLocaleString("vi-VN")}</div>
          <div className="text-[10px] text-text-3">{r.containerType} · {r.fillPct}%</div>
        </div>
      ),
    },
    {
      key: "carrier", label: "Nhà xe", sortable: true, hideable: true, priority: "medium",
      filter: "text",
      accessor: (r) => r.carrier ?? "",
      render: (r) => r.carrier
        ? <span className="text-text-1">{r.carrier}</span>
        : <span className="text-text-3 italic">Chưa gán</span>,
    },
    {
      key: "eta", label: "Ngày dự kiến", sortable: true, hideable: true, priority: "medium",
      width: 120,
      accessor: (r) => r.eta,
      render: (r) => <span className="text-table-sm text-text-2">{fmtDate(r.eta)}</span>,
    },
    {
      key: "status", label: "Trạng thái", sortable: true, hideable: true, priority: "high",
      filter: "enum",
      filterOptions: [
        { value: "wait",   label: "Chờ nhà xe" },
        { value: "hold",   label: "Giữ lại" },
        { value: "ready",  label: "Sẵn sàng" },
        { value: "moving", label: "Đang chuyển" },
      ],
      width: 130,
      accessor: (r) => r.status,
      render: (r) => {
        const statusLabel =
          r.status === "wait" ? "Chờ nhà xe"
          : r.status === "hold" ? "Giữ lại"
          : r.status === "ready" ? "Sẵn sàng"
          : "Đang chuyển";
        const statusCls =
          r.status === "wait" ? "bg-warning-bg text-warning border-warning/30"
          : r.status === "hold" ? "bg-danger-bg text-danger border-danger/30"
          : r.status === "ready" ? "bg-info-bg text-info border-info/30"
          : "bg-success-bg text-success border-success/30";
        return (
          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", statusCls)}>
            {statusLabel}
          </span>
        );
      },
    },
    {
      key: "action", label: "Hành động", sortable: false, hideable: false, priority: "high",
      align: "right", width: 160,
      render: (r) => (
        <TransportActionCell
          row={r}
          onAssignCarrier={(name) => handleAssign(r.id, name)}
          onShipNow={() => handleShipNow(r)}
          onWaitMore={() => handleWaitMore(r)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {filterTabs.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-table-sm font-medium transition-colors",
              filter === t.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-surface-3 bg-surface-2 text-text-2 hover:border-primary/40")}>
            {t.label}
            <span className="tabular-nums text-caption opacity-80">({t.count})</span>
          </button>
        ))}
      </div>

      <SmartTable<TransportRowT>
        screenId="orders-transport"
        title="Vận chuyển"
        exportFilename="orders-transport"
        columns={columns}
        data={filtered}
        getRowId={(r) => r.id}
        rowSeverity={(r) => r.status === "hold" ? "overdue" : r.status === "wait" ? "watch" : undefined}
        emptyState={{
          icon: <Truck className="h-8 w-8" />,
          title: "Không có chuyến nào",
          description: "Không có chuyến nào khớp bộ lọc hiện tại.",
        }}
      />
    </div>
  );
}

function TransportActionCell({ row, onAssignCarrier, onShipNow, onWaitMore }: {
  row: TransportRowT;
  onAssignCarrier: (name: string) => void;
  onShipNow: () => void;
  onWaitMore: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const eligible = CARRIERS.filter(c => c.available && (!row.fromRegion || c.region.includes(row.fromRegion)));

  if (row.status === "wait") {
    return (
      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setPickerOpen(!pickerOpen)}
          className="inline-flex items-center gap-1 rounded-button bg-gradient-primary text-primary-foreground px-3 py-1 text-caption font-semibold">
          Gán nhà xe <ChevronDown className="h-3 w-3" />
        </button>
        {pickerOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
            <div className="absolute right-0 mt-1 z-50 w-72 rounded-card border border-surface-3 bg-surface-2 shadow-lg p-1.5">
              {eligible.length === 0 && (
                <div className="px-3 py-2 text-caption text-text-3">Không có nhà xe khả dụng cho vùng này.</div>
              )}
              {eligible.map(c => (
                <button key={c.id}
                  onClick={() => { onAssignCarrier(c.name); setPickerOpen(false); }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-surface-1 transition-colors">
                  <div className="text-table-sm text-text-1 font-medium">{c.name}</div>
                  <div className="text-caption text-text-3">
                    {c.rate40ft > 0 ? `${fmtVnd(c.rate40ft)}/40ft · ` : "Miễn phí · "}
                    SLA {c.slaOnTimePct}%
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }
  if (row.status === "hold") {
    return (
      <div className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={onShipNow}
          className="inline-flex items-center gap-1 rounded-button border border-warning/40 bg-warning-bg/40 text-warning px-2 py-1 text-caption font-medium">
          <Play className="h-3 w-3" /> Xuất ngay
        </button>
        <button onClick={onWaitMore}
          className="inline-flex items-center gap-1 rounded-button border border-surface-3 px-2 py-1 text-caption text-text-2 hover:text-text-1">
          <Pause className="h-3 w-3" /> Chờ gom
        </button>
      </div>
    );
  }
  if (row.status === "ready") {
    return (
      <button onClick={(e) => { e.stopPropagation(); onShipNow(); }}
        className="inline-flex items-center gap-1 rounded-button bg-gradient-primary text-primary-foreground px-3 py-1 text-caption font-semibold">
        <Truck className="h-3 w-3" /> Khởi hành
      </button>
    );
  }
  return <span className="text-caption text-text-3">Đang chạy</span>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   §  TAB 3 — Theo dõi
   ═══════════════════════════════════════════════════════════════════════════ */
function TrackingTab({ orders, effective, effectiveTo, carrierAssign, scale }: {
  orders: PurchaseOrderRow[];
  effective: (po: PurchaseOrderRow) => string;
  effectiveTo: (t: ToRow) => ToRow["status"];
  carrierAssign: Record<string, string>;
  scale: number;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setExpanded(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  type Row = {
    id: string; kind: PoKind; route: string; carrier: string | null;
    driver: string | null; phone: string | null; vehicle: string | null;
    eta: string; status: string; orderDate: string;
  };

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    orders.forEach(po => {
      const s = effective(po);
      if (s === "confirmed" || s === "shipped" || s === "received") {
        const plan = TRANSPORT_PLANS.find(p => p.poRefs.includes(po.po_number));
        const carrierName = plan ? (carrierAssign[plan.id] ?? CARRIERS.find(c => c.id === plan.carrierId)?.name ?? null) : null;
        out.push({
          id: po.po_number, kind: detectKind(po),
          route: `${po.supplier} → ${po.notes?.match(/CN-[A-Z]+/)?.[0] || "—"}`,
          carrier: carrierName,
          driver: plan?.driverName ?? null, phone: plan?.driverPhone ?? null, vehicle: plan?.vehiclePlate ?? null,
          eta: po.expected_date ?? "", status: s, orderDate: po.order_date,
        });
      }
    });
    TO_DRAFT.forEach(t => {
      const s = effectiveTo(t);
      if (s === "confirmed" || s === "shipped" || s === "received") {
        out.push({
          id: t.id, kind: "TO",
          route: `${t.fromCn} → ${t.toCn}`,
          carrier: carrierAssign[t.id] ?? t.carrier,
          driver: t.driver, phone: t.driverPhone, vehicle: t.vehicle,
          eta: t.eta, status: s, orderDate: "2026-05-12",
        });
      }
    });
    /* Mock fallback — show 3 example shipments if DB is empty */
    if (out.length === 0) {
      out.push(
        { id: "RPO-MKD-2605-001", kind: "RPO", route: "Mikado → CN-HN",  carrier: "Vận tải Mikado", driver: "Trần Văn Nam", phone: "0903 111 555", vehicle: "29C-18472", eta: "2026-05-14", status: "shipped",  orderDate: "2026-05-10" },
        { id: "RPO-DTM-2605-002", kind: "RPO", route: "Đồng Tâm → CN-HCM", carrier: "Vinatrans",   driver: "Lê Văn Hùng",  phone: "0903 555 222", vehicle: "51C-72184", eta: "2026-05-15", status: "shipped",  orderDate: "2026-05-11" },
        { id: "RPO-VGR-2605-003", kind: "RPO", route: "Vigracera → CN-HN", carrier: null,            driver: null,             phone: null,           vehicle: null,        eta: "2026-05-13", status: "received", orderDate: "2026-05-08" },
      );
    }
    return out;
  }, [orders, effective, effectiveTo, carrierAssign]);

  return (
    <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-1/60 border-b border-surface-3">
              <th className="w-8"></th>
              <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3">PO/TO #</th>
              <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3">Tuyến</th>
              <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3 hidden md:table-cell">Nhà xe</th>
              <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3 hidden lg:table-cell">Tài xế · SĐT</th>
              <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3">ETA</th>
              <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-text-3 text-table-sm">
                Chưa có đơn nào đang giao.
              </td></tr>
            )}
            {rows.map(r => {
              const isOpen = expanded.has(r.id);
              return (
                <Fragment key={r.id}>
                  <tr onClick={() => toggle(r.id)} className="border-b border-surface-3 cursor-pointer hover:bg-surface-1/40 transition-colors">
                    <td className="px-2 py-2.5 text-center">
                      {isOpen ? <ChevronDown className="h-4 w-4 text-text-3 inline" /> : <ChevronRight className="h-4 w-4 text-text-3 inline" />}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[11px] text-text-1">{r.id}</span>
                      <span className="ml-2"><KindBadge kind={r.kind} /></span>
                    </td>
                    <td className="px-3 py-2.5 text-table-sm text-text-2">{r.route}</td>
                    <td className="px-3 py-2.5 text-table-sm hidden md:table-cell">
                      {r.carrier ? <span className="text-text-1">{r.carrier}</span> : <span className="text-text-3 italic">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-table-sm hidden lg:table-cell">
                      {r.driver ? (
                        <div>
                          <div className="text-text-1">{r.driver}</div>
                          <div className="text-caption text-text-3">{r.phone}</div>
                        </div>
                      ) : <span className="text-text-3 italic">Chưa có</span>}
                    </td>
                    <td className="px-3 py-2.5 text-table-sm text-text-2">{fmtDate(r.eta)}</td>
                    <td className="px-3 py-2.5"><StageBadge stage={r.status} /></td>
                  </tr>
                  {isOpen && (
                    <tr><td colSpan={7} className="bg-surface-1/40 px-4 py-3 border-b border-surface-3">
                      <ShipmentTimeline row={r} />
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ShipmentTimeline({ row }: {
  row: { id: string; kind: PoKind; route: string; carrier: string | null; driver: string | null; phone: string | null; vehicle: string | null; eta: string; status: string; orderDate: string };
}) {
  type Stage = { key: string; label: string; date: string; done: boolean; current: boolean };
  const today = Date.now();
  const ord = new Date(row.orderDate).getTime();
  const eta = new Date(row.eta).getTime();
  const has = (s: string[]) => s.includes(row.status);

  const stages: Stage[] = [
    { key: "draft",     label: "Nháp",         date: fmtDate(row.orderDate), done: true, current: false },
    { key: "submitted", label: "Đã gửi",       date: fmtDate(new Date(ord + 1*86400000).toISOString()),  done: true, current: false },
    { key: "confirmed", label: "NM xác nhận",  date: fmtDate(new Date(ord + 2*86400000).toISOString()),  done: has(["confirmed", "shipped", "received"]),                       current: row.status === "confirmed" },
    { key: "in_prod",   label: "Đang SX",      date: fmtDate(new Date(ord + 5*86400000).toISOString()),  done: has(["shipped", "received"]),                                    current: row.status === "in_production" },
    { key: "shipped",   label: "Đã giao",      date: fmtDate(new Date(eta - 1*86400000).toISOString()),  done: has(["shipped", "received"]),                                    current: row.status === "shipped" },
    { key: "received",  label: "Đã nhận",      date: fmtDate(row.eta),                                   done: has(["received"]),                                               current: row.status === "received" },
  ];

  return (
    <div className="space-y-3">
      {/* Carrier / driver bar */}
      {row.driver && row.phone && (
        <div className="rounded border border-success/30 bg-success-bg/30 px-3 py-2 flex items-center gap-3">
          <Truck className="h-4 w-4 text-success" />
          <div className="text-table-sm text-text-1">
            <span className="font-medium">Xe {row.vehicle}</span>
            <span className="text-text-3 mx-2">·</span>
            <span>{row.carrier}</span>
            <span className="text-text-3 mx-2">·</span>
            <span>{row.driver} {row.phone}</span>
          </div>
          <a href={`tel:${row.phone.replace(/\s/g, "")}`}
            className="ml-auto inline-flex items-center gap-1 rounded-button bg-gradient-primary text-primary-foreground px-3 py-1 text-caption font-semibold">
            <Phone className="h-3 w-3" /> Gọi
          </a>
        </div>
      )}
      {!row.driver && row.status === "shipped" && (
        <div className="rounded border border-warning/30 bg-warning-bg/30 px-3 py-2 text-table-sm text-warning flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Chưa có thông tin tài xế — chờ NM cập nhật.
        </div>
      )}

      {/* Timeline */}
      <div className="text-caption text-text-3 mb-1">Tiến trình giao hàng</div>
      <div className="flex items-start gap-1 overflow-x-auto pb-2">
        {stages.map((s, i) => (
          <Fragment key={s.key}>
            <div className="flex flex-col items-center min-w-[80px]">
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                s.done && !s.current && "bg-success text-primary-foreground",
                s.current && "bg-primary text-primary-foreground ring-2 ring-primary/30 animate-pulse",
                !s.done && !s.current && "bg-surface-1 border border-surface-3 text-text-3"
              )}>
                {s.done && !s.current ? "✓" : s.current ? "●" : "○"}
              </div>
              <div className={cn("text-[11px] mt-1 font-medium text-center", s.current ? "text-primary" : s.done ? "text-text-1" : "text-text-3")}>
                {s.label}
              </div>
              <div className="text-[10px] text-text-3 tabular-nums">{s.date}</div>
            </div>
            {i < stages.length - 1 && (
              <div className={cn("flex-1 h-0.5 mt-3 min-w-[20px]", stages[i + 1].done ? "bg-success" : "bg-surface-3")} />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
