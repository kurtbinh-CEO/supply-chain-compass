/**
 * OrdersPage — M5-REVISED
 *
 * One screen, one table, no tabs. UNIS planners click filter pills to scope
 * the list. Every row exposes ONE primary action that advances the PO/TO to
 * the next stage in the 7-step lifecycle.
 *
 *   ĐÃ DUYỆT → ĐẶT NM → ĐẶT XE → LẤY HÀNG → ĐANG CHỞ → GIAO HÀNG → HOÀN TẤT
 *
 * TO (transfer orders) share the same table; their lifecycle skips ĐẶT NM
 * (no factory to confirm).
 *
 * Manual updates only — UNIS calls/Zalos partners offline, then opens a
 * dialog here to log the transition. SLA-based reminders surface as row
 * tone + summary banner; nothing fires automatically.
 */
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useTenant } from "@/components/TenantContext";
import { useNavigate } from "react-router-dom";
import { usePlanningPeriod } from "@/components/PlanningPeriodContext";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  SEED_PO_LIFECYCLE, STAGE_META, STAGE_ORDER, STAGE_SLA_HOURS, REMINDER_CONFIG,
  type PoLifecycleRow, type LifecycleStage, type PoEvidence,
  nextStage, isOverdue, isNearSla, fmtTimeInStage, fmtEta,
} from "@/lib/po-lifecycle-data";
import {
  buildPoGroups, groupOverdue, groupNearSla, leaderSiblingIds, type PoGroup,
} from "@/lib/po-group-builder";
import { CARRIERS, CN_REGION } from "@/data/unis-enterprise-dataset";
import {
  SplitShipmentBanner, PartialDeliveryBanner, DamageClaimPanel, HoldShipCountdown,
} from "@/components/orders/OrdersEdgeBanners";
import { TransitionShell } from "@/components/orders/TransitionShell";
import type { EvidenceFile } from "@/components/orders/EvidenceFilePicker";
import { OrderDetailPanel } from "@/components/orders/OrderDetailPanel";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SummaryCards, type SummaryCard } from "@/components/SummaryCards";
import { TimeRangeFilter, HistoryBanner, useTimeRange, defaultTimeRange } from "@/components/TimeRangeFilter";
import { ordersCompare } from "@/lib/compare-metrics";
import {
  Send, CheckCircle2, Truck, Package, Flag, ClipboardCheck,
  Phone, AlertTriangle,
  Camera, FileText, X, Image, PenLine, ShieldAlert,
} from "lucide-react";

const tenantScales: Record<string, number> = { "UNIS Group": 1, "TTC Agris": 0.7, "Mondelez": 1.35 };

/* ═══════════════════════════════════════════════════════════════════════════
   Filter model — multi-select pills
   ═══════════════════════════════════════════════════════════════════════════ */
const ACTION_STAGES: LifecycleStage[] = ["approved", "sent_nm", "nm_confirmed", "delivering"];

/** Drill-down popup focus, set when a summary card is clicked. */
type DrillFocus = "todo" | "transit" | "overdue" | "done" | null;

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function OrdersPage() {
  const { tenant } = useTenant();
  const scale = tenantScales[tenant] || 1;
  const navigate = useNavigate();
  const { current: planCycle } = usePlanningPeriod();

  // Local mutable copy of seed (so dialogs can advance stages within session).
  const [rows, setRows] = useState<PoLifecycleRow[]>(() =>
    SEED_PO_LIFECYCLE.map(r => ({ ...r, qty: Math.round(r.qty * scale) }))
  );
  // LỚP 2 — multi-select status pills (empty Set = "Tất cả")
  const [statusFilter, setStatusFilter] = useState<Set<LifecycleStage>>(new Set());
  const [kindFilter, setKindFilter] = useState<Set<"RPO" | "TO">>(new Set());
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Drill-down popup từ summary cards
  const [drillFocus, setDrillFocus] = useState<DrillFocus>(null);

  // Time-range filter (weekly mode) — persist per screen
  const [timeRange, setTimeRange] = useTimeRange("orders", "weekly");
  const isHistory = !timeRange.isCurrent;
  // Dialog state — only one dialog open at a time
  const [actionRow, setActionRow] = useState<PoLifecycleRow | null>(null);
  const [cancelRow, setCancelRow] = useState<PoLifecycleRow | null>(null);
  // Side Panel — mở khi click vào 1 PO group row
  const [panelGroup, setPanelGroup] = useState<PoGroup | null>(null);

  /* ── Build PO groups (NM × CN × Tuần) — parent rows ── */
  const groups = useMemo(() => buildPoGroups(rows), [rows]);

  /* ── Stage counts dựa trên GROUPS (không phải lines) ── */
  const counts = useMemo(() => {
    const stage: Record<LifecycleStage, number> = {
      approved: 0, sent_nm: 0, nm_confirmed: 0, pickup: 0,
      in_transit: 0, delivering: 0, completed: 0, cancelled: 0,
    };
    let todo = 0, transit = 0, done = 0, overdue = 0;
    let po = 0, to = 0;
    for (const g of groups) {
      stage[g.stage]++;
      if (g.kind === "RPO") po++; else to++;
      if (ACTION_STAGES.includes(g.stage)) todo++;
      if (g.stage === "pickup" || g.stage === "in_transit") transit++;
      if (g.stage === "completed") done++;
      if (groupOverdue(g)) overdue++;
    }
    return {
      stage, todo, transit, done, overdue,
      total: groups.length, totalLines: rows.length,
      po, to,
    };
  }, [groups, rows.length]);

  /* ── Filtered groups — multi-select pills ── */
  const visibleGroups = useMemo(() => {
    return groups.filter(g => {
      if (kindFilter.size > 0 && !kindFilter.has(g.kind)) return false;
      if (overdueOnly && !groupOverdue(g)) return false;
      if (statusFilter.size > 0 && !statusFilter.has(g.stage)) return false;
      return true;
    });
  }, [groups, statusFilter, kindFilter, overdueOnly]);

  // Toggle helpers
  const toggleStatus = (s: LifecycleStage) =>
    setStatusFilter(prev => {
      const n = new Set(prev);
      if (n.has(s)) n.delete(s); else n.add(s);
      return n;
    });
  const toggleKind = (k: "RPO" | "TO") =>
    setKindFilter(prev => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k); else n.add(k);
      return n;
    });
  const clearAllFilters = () => {
    setStatusFilter(new Set());
    setKindFilter(new Set());
    setOverdueOnly(false);
  };

  /* ── Mutations from dialogs (cascade qua tất cả SKU lines cùng stage trong group) ── */
  const advance = (id: string, patch: Partial<PoLifecycleRow>) => {
    // Tìm group chứa line `id`, lấy các line cùng stage để cascade.
    const group = groups.find(g => g.lines.some(l => l.id === id));
    const idSet = new Set<string>(group ? leaderSiblingIds(group) : [id]);
    setRows(prev => prev.map(r => idSet.has(r.id)
      ? { ...r, ...patch, hoursInStage: 0, overdueFlag: false }
      : r));

    // G4 — ERP posting: khi PO/TO hoàn tất POD → đăng sang ERP (1 lần / group)
    if (patch.stage === "completed") {
      const docNo = group?.poNumber || id;
      const erpDoc = `MIGO-${Date.now().toString().slice(-6)}`;
      const t = toast.loading(`Đang đăng ERP cho ${docNo}...`, { description: "Tạo MIGO/Goods Receipt → SAP/Odoo" });
      setTimeout(() => {
        toast.success(`✅ Đã đăng ERP: ${erpDoc}`, {
          id: t,
          description: `${docNo} → ERP. Tồn kho CN cập nhật. (Coming soon: kết nối thật)`,
          duration: 6000,
        });
      }, 1200);
    }
  };

  const cancelPo = (id: string, reason: string, note: string) => {
    setRows(prev => prev.map(r => r.id === id
      ? {
          ...r, stage: "cancelled" as LifecycleStage, cancelReason: reason,
          timeline: [...r.timeline, { stage: "cancelled", ts: nowTs(), actor: "Planner Linh", note: `${reason}${note ? ` — ${note}` : ""}` }],
        }
      : r));
    toast.success("Đã hủy đơn", { description: reason });
  };

  const noFilters = statusFilter.size === 0 && kindFilter.size === 0 && !overdueOnly;

  return (
    <AppLayout>
      {/* ═══ HEADER ═══ */}
      <div className="mb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-h2 font-display font-bold text-text-1">
            Đơn hàng — {timeRange.isCurrent ? "Tuần 20" : timeRange.label}
          </h1>
          <div className="flex items-center gap-2">
            <TimeRangeFilter
              mode="weekly"
              value={timeRange}
              onChange={setTimeRange}
              screenId="orders"
            />
            <Badge variant="outline" className="font-mono text-caption gap-1.5 border-success/40 text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              PO Batch W20 v1 · Active
            </Badge>
          </div>
        </div>
        <p className="text-table-sm text-text-3 mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span>drp_run:</span>
          <button
            type="button"
            onClick={() => navigate("/drp")}
            className="inline-flex items-center rounded-full bg-surface-2 border border-surface-3 px-2 py-0.5 text-caption font-mono text-text-2 hover:bg-surface-1 hover:text-text-1 transition-colors"
            title="Mở DRP batch nguồn"
          >
            DRP-W20
          </button>
          <span>·</span>
          <span>Kỳ KH:</span>
          <button
            type="button"
            onClick={() => navigate("/demand")}
            className="inline-flex items-center rounded-full bg-info-bg text-info border border-info/30 px-2 py-0.5 text-caption font-medium hover:bg-info/15 transition-colors"
            title="Mở rà soát nhu cầu của kỳ này"
          >
            {planCycle.label}
          </button>
          <span>·</span>
          <span>Tổng <span className="text-text-1 font-semibold tabular-nums">{counts.total}</span> đơn <span className="text-text-3">({counts.totalLines} dòng chi tiết)</span></span>
          {counts.overdue > 0 && (
            <> · <span className="text-danger font-semibold">{counts.overdue} trễ hạn</span></>
          )}
        </p>
      </div>

      <HistoryBanner
        range={timeRange}
        onReset={() => setTimeRange(defaultTimeRange("weekly"))}
        entity="đơn hàng"
        resetLabel="Quay về tuần này"
        currentLabel="Tuần này (W20)"
        compareMetrics={ordersCompare(timeRange)}
      />

      {/* ═══ LỚP 1: SUMMARY CARDS — chỉ để nhìn, click = drill-down popup ═══ */}
      {(() => {
        // Severity rules (M5-UX-PATCH):
        //   CẦN XỬ LÝ: 0 → ok, 1-5 → warn, >5 → critical
        //   ĐANG VẬN CHUYỂN: luôn ok
        //   TRỄ HẠN: 0 → ok, >0 → critical
        //   HOÀN TẤT: luôn ok
        const todoSeverity: SummaryCard["severity"] =
          counts.todo === 0 ? "ok" : counts.todo <= 5 ? "warn" : "critical";
        const overdueSeverity: SummaryCard["severity"] =
          counts.overdue > 0 ? "critical" : "ok";
        const urgentTodo = rows.filter(r => ACTION_STAGES.includes(r.stage) && isOverdue(r)).length;

        const cards: SummaryCard[] = [
          {
            key: "todo", label: "Cần xử lý", value: counts.todo, unit: "đơn",
            severity: todoSeverity,
            trend: urgentTodo > 0
              ? { delta: `${urgentTodo} khẩn`, direction: "up", color: "red" }
              : { delta: "ổn định", direction: "flat", color: "gray" },
            tooltip: "Đơn ở stage Đã duyệt / Đặt NM / Đặt xe / Giao hàng — chờ tác vụ kế. Click để xem phân rã.",
            onClick: () => setDrillFocus("todo"),
          },
          {
            key: "transit", label: "Đang vận chuyển", value: counts.transit, unit: "xe",
            severity: "ok",
            trend: { delta: counts.transit > 0 ? "🚛 trên đường" : "→ rỗng", direction: "flat", color: "gray" },
            tooltip: "Đơn đang lấy hàng hoặc trên đường. Click để xem ETA.",
            onClick: () => setDrillFocus("transit"),
          },
          {
            key: "overdue", label: "Trễ hạn", value: counts.overdue, unit: "đơn",
            severity: overdueSeverity,
            trend: counts.overdue > 0
              ? { delta: "⚠️ cần escalate", direction: "up", color: "red" }
              : { delta: "đúng SLA", direction: "flat", color: "green" },
            tooltip: "Vượt SLA cho stage hiện tại — cần xử lý ngay. Click để xem danh sách.",
            onClick: () => setDrillFocus("overdue"),
          },
          {
            key: "done", label: "Hoàn tất", value: counts.done, unit: "đơn",
            severity: "ok",
            trend: { delta: "↑ 27% vs T4", direction: "up", color: "green" },
            tooltip: "Đã POD xong + đăng ERP. Click để xem chi tiết.",
            onClick: () => setDrillFocus("done"),
          },
        ];
        return <SummaryCards cards={cards} screenId="orders-lifecycle" editable />;
      })()}

      {/* ═══ LỚP 2: FILTER PILLS — gộp status + type + alert ═══ */}
      <div className="flex flex-wrap items-center gap-1.5 mt-4 mb-2">
        {/* "Tất cả" — clear all */}
        <FilterPill
          active={noFilters}
          onClick={clearAllFilters}
          count={counts.total}
          label="Tất cả"
        />

        {/* Nhóm 1: Status pills (multi-select) */}
        {STAGE_ORDER.map(s => (
          <FilterPill
            key={s}
            active={statusFilter.has(s)}
            onClick={() => toggleStatus(s)}
            count={counts.stage[s]}
            label={STAGE_META[s].short}
            disabled={counts.stage[s] === 0}
          />
        ))}

        <Separator />

        {/* Nhóm 2: Type pills */}
        <FilterPill
          active={kindFilter.has("RPO")}
          onClick={() => toggleKind("RPO")}
          count={counts.po}
          label="PO"
          disabled={counts.po === 0}
        />
        <FilterPill
          active={kindFilter.has("TO")}
          onClick={() => toggleKind("TO")}
          count={counts.to}
          label="TO"
          disabled={counts.to === 0}
        />

        <Separator />

        {/* Nhóm 3: Alert pill (cross-cutting) */}
        <FilterPill
          active={overdueOnly}
          onClick={() => setOverdueOnly(v => !v)}
          count={counts.overdue}
          label="Trễ"
          icon="⚠️"
          tone="danger"
          disabled={counts.overdue === 0}
        />
      </div>

      {/* ═══ MAIN TABLE — PO GROUPS (NM × CN × Tuần) ═══ */}
      <SmartTable<PoGroup>
        data={visibleGroups}
        getRowId={(g) => g.groupId}
        screenId="orders-lifecycle"
        defaultDensity="compact"
        rowSeverity={(g) => groupOverdue(g) ? "shortage" : groupNearSla(g) ? "watch" : undefined}
        emptyState={{
          icon: overdueOnly ? <CheckCircle2 /> : <ClipboardCheck />,
          title: overdueOnly ? "Không có đơn trễ hạn" : "Không có đơn nào",
          description: noFilters
            ? "Chưa có đơn trong tuần. Tải đơn mới từ DRP batch."
            : "Thử bỏ bớt bộ lọc hoặc bấm \"Tất cả\" để xem toàn bộ.",
        }}
        onRowClick={(g) => setPanelGroup(g)}
        columns={[
          {
            key: "poNumber", label: "Mã đơn", width: 180, sortable: true, hideable: false, priority: "high",
            filter: "text",
            accessor: (g) => g.poNumber,
            render: (g) => (
              <div className="flex flex-col">
                <span className="font-mono text-table-sm font-semibold text-text-1">{g.poNumber}</span>
                {g.lineCount > 1 && (
                  <span className="text-[10px] text-text-3">{g.lineCount} mã hàng</span>
                )}
              </div>
            ),
          },
          {
            key: "kind", label: "Loại", width: 70, align: "center",
            filter: "enum", filterOptions: [{ label: "RPO", value: "RPO" }, { label: "TO", value: "TO" }],
            accessor: (g) => g.kind,
            render: (g) => (
              <Badge variant="outline" className={cn("text-[10px] font-mono",
                g.kind === "TO" ? "border-warning/40 text-warning bg-warning-bg/40" : "border-success/40 text-success bg-success-bg/40"
              )}>{g.kind}</Badge>
            ),
          },
          {
            key: "route", label: "Tuyến", width: 240,
            filter: "text",
            accessor: (g) => `${g.fromName} → ${g.toName}`,
            render: (g) => (
              <div className="flex flex-col text-table-sm">
                <span className="text-text-1 font-medium truncate">{g.fromName}</span>
                <span className="text-text-3 text-[11px]">→ {g.toName}</span>
              </div>
            ),
          },
          {
            key: "qty", label: "Số lượng", width: 150, numeric: true, align: "right", sortable: true,
            accessor: (g) => g.totalQty,
            render: (g) => (
              <div className="text-right tabular-nums text-table-sm">
                <div className="text-text-1 font-medium">{g.totalQty.toLocaleString()} m²</div>
                <div className="text-[10px] text-text-3">
                  {g.lineCount} SKU
                </div>
              </div>
            ),
          },
          {
            key: "container", label: "Container", width: 110, align: "center",
            accessor: (g) => g.containerFill.type,
            render: (g) => (
              <div className="flex flex-col items-center text-table-sm">
                <span className="font-mono text-text-1">{g.containerFill.type}</span>
                <span className={cn(
                  "text-[10px]",
                  g.containerFill.pct >= 85 ? "text-success" : g.containerFill.pct >= 60 ? "text-warning" : "text-text-3",
                )}>{g.containerFill.pct}%</span>
              </div>
            ),
          },
          {
            key: "stage", label: "Trạng thái", width: 140, align: "center",
            filter: "enum",
            filterOptions: STAGE_ORDER.concat(["cancelled"]).map(s => ({ label: STAGE_META[s].short, value: s })),
            accessor: (g) => g.stage,
            render: (g) => (
              <Badge variant="outline" className={cn("text-[10px] font-bold tracking-wide", STAGE_META[g.stage].tone)}>
                {STAGE_META[g.stage].label}
              </Badge>
            ),
          },
          {
            key: "time", label: "Thời gian", width: 130, align: "center",
            sortable: true,
            accessor: (g) => g.leader.hoursInStage,
            render: (g) => {
              const r = g.leader;
              if (r.stage === "completed" || r.stage === "cancelled") {
                return <span className="text-text-3 text-table-sm">{fmtTimeInStage(r.hoursInStage)}</span>;
              }
              const overdue = isOverdue(r);
              const near = isNearSla(r);
              if ((r.stage === "in_transit" || r.stage === "pickup") && r.etaRemainingH !== undefined) {
                const eta = fmtEta(r.etaRemainingH);
                return (
                  <div className="flex flex-col items-center text-table-sm">
                    <span className={cn("font-medium",
                      eta.tone === "danger" && "text-danger",
                      eta.tone === "warning" && "text-warning",
                      eta.tone === "success" && "text-success",
                    )}>{eta.label}</span>
                    <span className="text-[10px] text-text-3">{fmtTimeInStage(r.hoursInStage)}</span>
                  </div>
                );
              }
              return (
                <div className="flex flex-col items-center text-table-sm">
                  <span className={cn(
                    "font-medium tabular-nums",
                    overdue ? "text-danger" : near ? "text-warning" : "text-text-2",
                  )}>
                    {fmtTimeInStage(r.hoursInStage)} {overdue && "⚠️"}
                  </span>
                  {overdue && (
                    <span className="text-[10px] text-danger">SLA {STAGE_SLA_HOURS[r.stage]}h</span>
                  )}
                </div>
              );
            },
          },
          {
            key: "action", label: "Hành động", width: 200, align: "center", hideable: false,
            render: (g) => <RowActionButton row={g.leader} onClick={() => setActionRow(g.leader)} onCancel={() => setCancelRow(g.leader)} />,
          },
        ] satisfies SmartTableColumn<PoGroup>[]}
      />
      {/* ═══ DIALOG ROUTER ═══ */}
      {actionRow && (
        <ActionDialog
          row={actionRow}
          onClose={() => setActionRow(null)}
          onAdvance={(patch) => {
            advance(actionRow.id, patch);
            const ns = patch.stage ? STAGE_META[patch.stage].label : "—";
            toast.success(`${actionRow.poNumber} → ${ns}`);
            setActionRow(null);
          }}
        />
      )}

      {cancelRow && (
        <CancelDialog
          row={cancelRow}
          onClose={() => setCancelRow(null)}
          onConfirm={(reason, note) => { cancelPo(cancelRow.id, reason, note); setCancelRow(null); }}
        />
      )}

      {drillFocus && (
        <CardDrillDownDialog
          focus={drillFocus}
          rows={rows}
          counts={counts}
          onClose={() => setDrillFocus(null)}
          onApplyFilter={(s) => {
            // map drill action to pill filter
            if (s === "todo") setStatusFilter(new Set(ACTION_STAGES));
            else if (s === "transit") setStatusFilter(new Set<LifecycleStage>(["pickup", "in_transit"]));
            else if (s === "overdue") { setOverdueOnly(true); setStatusFilter(new Set()); }
            else if (s === "done") setStatusFilter(new Set<LifecycleStage>(["completed"]));
            else if (typeof s === "object") setStatusFilter(new Set([s.stage]));
            setDrillFocus(null);
          }}
          onOpenRow={(r) => {
            setDrillFocus(null);
            const g = groups.find(gr => gr.lines.some(l => l.id === r.id));
            if (g) setPanelGroup(g);
          }}
        />
      )}

      {/* ═══ ORDER DETAIL — RIGHT SIDE PANEL (480px) ═══ */}
      <Sheet open={!!panelGroup} onOpenChange={(o) => { if (!o) setPanelGroup(null); }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[480px] sm:w-[480px] p-0 overflow-y-auto [&>button]:hidden"
        >
          {panelGroup && (() => {
            // Re-derive group from latest `groups` (so stage updates after mutations).
            const fresh = groups.find(g => g.groupId === panelGroup.groupId) ?? panelGroup;
            return (
              <OrderDetailPanel
                group={fresh}
                onAction={(line) => setActionRow(line)}
                onCancel={(line) => setCancelRow(line)}
                onClose={() => setPanelGroup(null)}
              />
            );
          })()}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GroupDrillDown — child table cho 1 PO group:
     1. Bảng SKU compact (Mã hàng · SL · Đơn giá · Thành tiền)
     2. Lifecycle inline icons (1 dòng nhỏ, không heading)
     3. Per-line action (cho phép thao tác từng SKU nếu cần)
     4. Vận chuyển + Minh chứng (gộp từ leader)
     5. Lịch sử timeline
   ═══════════════════════════════════════════════════════════════════════════ */
function GroupDrillDown({
  group, onAction, onCancel,
}: {
  group: PoGroup;
  onAction: (line: PoLifecycleRow) => void;
  onCancel: (line: PoLifecycleRow) => void;
}) {
  const navigate = useNavigate();
  // Mock cam kết gốc (commitment): suy ra từ NM/SKU base + tháng plan
  const commitment = useMemo(() => {
    const skuBase = (group.lines[0]?.skuLabel ?? "GA-600").split(" ")[0];
    const nmName = group.kind === "RPO" ? group.fromName : "—";
    const committed = Math.max(group.totalQty * 5, 4200); // mock cam kết tháng
    const releaseNumber = 1;
    const releasedPct = Math.min(100, Math.round((group.totalQty / committed) * 100));
    return { skuBase, nmName, committed, releaseNumber, releasedPct };
  }, [group]);
  // Đơn giá ước tính theo SKU (mock — KHÔNG ảnh hưởng business logic)
  const unitPrice = (skuLabel: string) => {
    if (skuLabel.startsWith("GA-600")) return 185_000;
    if (skuLabel.startsWith("GA-300")) return 145_000;
    return 160_000;
  };
  const totalValue = group.lines.reduce((s, l) => s + l.qty * unitPrice(l.skuLabel), 0);

  // Gộp evidence từ tất cả lines (dedupe theo label)
  const allEvidence = useMemo(() => {
    const seen = new Set<string>();
    const out: PoEvidence[] = [];
    group.lines.forEach(l => l.evidence.forEach(e => {
      if (!seen.has(e.label)) { seen.add(e.label); out.push(e); }
    }));
    return out;
  }, [group]);

  // Timeline: dùng leader (đại diện)
  const leader = group.leader;

  return (
    <div className="bg-surface-1 border-t border-surface-3 p-4 space-y-3">
      {/* ── Edge case banners (P3) ── */}
      <SplitShipmentBanner group={group} />
      <HoldShipCountdown group={group} />
      <PartialDeliveryBanner group={group} />
      {group.stage === "delivering" && group.lines[0] && (
        <DamageClaimPanel row={group.lines[0]} />
      )}

      {/* ── Bảng SKU compact ── */}
      <SmartTable<PoLifecycleRow>
        data={group.lines}
        getRowId={(r) => r.id}
        screenId={`order-${group.groupId}-lines`}
        defaultDensity="compact"
        columns={[
          {
            key: "skuLabel", label: "Mã hàng", width: 140,
            render: (r) => <span className="font-mono text-table-sm text-text-1">{r.skuLabel}</span>,
          },
          {
            key: "qty", label: "Số lượng", numeric: true, align: "right", width: 110,
            render: (r) => <span className="tabular-nums text-table-sm">{r.qty.toLocaleString()} m²</span>,
          },
          {
            key: "unitPrice", label: "Đơn giá", numeric: true, align: "right", width: 130,
            render: (r) => <span className="tabular-nums text-table-sm text-text-2">{unitPrice(r.skuLabel).toLocaleString()} ₫/m²</span>,
          },
          {
            key: "totalPrice", label: "Thành tiền", numeric: true, align: "right", width: 130,
            render: (r) => {
              const v = r.qty * unitPrice(r.skuLabel);
              return <span className="tabular-nums text-table-sm font-medium">{(v / 1e6).toFixed(1)} triệu</span>;
            },
          },
          {
            key: "stage", label: "Trạng thái", align: "center", width: 130,
            render: (r) => (
              <Badge variant="outline" className={cn("text-[10px]", STAGE_META[r.stage].tone)}>
                {STAGE_META[r.stage].short}
              </Badge>
            ),
          },
          {
            key: "lineAction", label: "", width: 90, align: "center",
            render: (r) => {
              if (r.stage === "completed" || r.stage === "cancelled") return null;
              return (
                <Button
                  size="sm" variant="ghost"
                  onClick={(e) => { e.stopPropagation(); onAction(r); }}
                  className="h-6 px-2 text-[10px]"
                >Cập nhật</Button>
              );
            },
          },
        ] satisfies SmartTableColumn<PoLifecycleRow>[]}
      />

      {/* ── Cam kết gốc back-link (chỉ hiện cho RPO — TO không có cam kết NM) ── */}
      {group.kind === "RPO" && commitment.nmName !== "—" && (
        <div className="rounded-card border border-info/30 bg-info-bg/30 px-3 py-2 text-table-sm flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-text-3">Cam kết gốc:</span>
          <button
            type="button"
            onClick={() =>
              navigate(
                `/hub?step=commitment&nm=${encodeURIComponent(commitment.nmName)}&sku=${encodeURIComponent(commitment.skuBase)}`,
              )
            }
            className="text-primary font-medium underline-offset-2 hover:underline"
          >
            {commitment.nmName} · {commitment.skuBase}
            {" — "}
            <span className="tabular-nums">{commitment.committed.toLocaleString()} m²</span>
          </button>
          <span className="text-text-3">·</span>
          <span className="text-text-2">Release #{commitment.releaseNumber}</span>
          <span className="text-text-3">·</span>
          <span className="tabular-nums font-semibold text-text-1">{commitment.releasedPct}% đã release</span>
          <span className="ml-1 inline-flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-24 rounded-full bg-surface-3 overflow-hidden">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${commitment.releasedPct}%` }}
              />
            </span>
          </span>
        </div>
      )}

      {/* ── Tổng + lifecycle inline (KHÔNG heading) ── */}
      <div className="flex items-center justify-between gap-3 px-1 text-table-sm">
        <div className="text-text-3">
          Tổng: <span className="text-text-1 font-semibold tabular-nums">{group.totalQty.toLocaleString()} m²</span>
          <span className="mx-2">·</span>
          <span className="text-text-1 font-semibold tabular-nums">{(totalValue / 1e6).toFixed(1)} triệu ₫</span>
        </div>
        {/* Lifecycle inline dots */}
        <div className="flex items-center gap-1 text-[11px] overflow-x-auto">
          {STAGE_ORDER.map((s, i) => {
            const rank = STAGE_ORDER.indexOf(group.stage);
            const myRank = i;
            const isCurrent = s === group.stage;
            const reached = myRank < rank;
            return (
              <span key={s} className="inline-flex items-center gap-0.5 shrink-0">
                <span className={cn(
                  isCurrent && "text-primary font-semibold",
                  reached && "text-success",
                  !isCurrent && !reached && "text-text-3",
                )}>
                  {reached ? "✅" : isCurrent ? "●" : "○"} {STAGE_META[s].short}
                </span>
                {i < STAGE_ORDER.length - 1 && <span className="text-text-3/50">→</span>}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Vận chuyển + Minh chứng (2 cột) ── */}
      <div className="grid md:grid-cols-2 gap-3">
        {leader.carrierName && (
          <div className="rounded-card border border-surface-3 bg-surface-0 p-3 space-y-1.5">
            <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-1">Vận chuyển</div>
            <div className="text-table-sm"><span className="text-text-3">NVT:</span> <span className="font-medium text-text-1">{leader.carrierName}</span></div>
            {leader.vehiclePlate && <div className="text-table-sm font-mono"><span className="text-text-3 font-sans">Xe:</span> {leader.vehiclePlate}</div>}
            {leader.containerNo && <div className="text-table-sm font-mono"><span className="text-text-3 font-sans">Cont:</span> {leader.containerNo}</div>}
            {leader.driverName && (
              <div className="text-table-sm flex items-center gap-2">
                <span className="text-text-3">Tài xế:</span>
                <span className="text-text-1 font-medium">{leader.driverName}</span>
                {leader.driverPhone && (
                  <a href={`tel:${leader.driverPhone.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline text-[11px]">
                    <Phone className="h-3 w-3" /> {leader.driverPhone}
                  </a>
                )}
              </div>
            )}
            {leader.deliveryEta && (
              <div className="text-table-sm flex items-center gap-2 mt-1.5 pt-1.5 border-t border-surface-3">
                <span className="text-text-3">ETA:</span>
                <span className="font-medium text-text-1">{leader.deliveryEta}</span>
              </div>
            )}
          </div>
        )}

        <div className="rounded-card border border-surface-3 bg-surface-0 p-3">
          <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">Minh chứng</div>
          {allEvidence.length === 0
            ? <div className="text-table-sm text-text-3 italic">Chưa có minh chứng</div>
            : (
              <div className="space-y-1">
                {allEvidence.map((e, i) => <EvidenceBadge key={i} ev={e} />)}
              </div>
            )
          }
        </div>
      </div>

      {/* ── Lịch sử (timeline gộp leader) ── */}
      {leader.timeline.length > 0 && (
        <div className="rounded-card border border-surface-3 bg-surface-0 p-3">
          <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">Lịch sử</div>
          <div className="space-y-1.5">
            {leader.timeline.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-table-sm">
                <div className="text-text-3 tabular-nums w-20 shrink-0">{e.ts}</div>
                <Badge variant="outline" className={cn("text-[10px] shrink-0", STAGE_META[e.stage].tone)}>
                  {STAGE_META[e.stage].short}
                </Badge>
                <div className="flex-1">
                  <div className="text-text-1">{e.actor}</div>
                  {e.note && <div className="text-[11px] text-text-3">{e.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Filter pill + separator
   ═══════════════════════════════════════════════════════════════════════════ */
function FilterPill({ active, onClick, count, label, icon, tone, disabled }: {
  active: boolean; onClick: () => void; count: number; label: string;
  icon?: string; tone?: "warning" | "info" | "success" | "danger"; disabled?: boolean;
}) {
  const toneActive = tone === "danger"
    ? "bg-danger text-primary-foreground border-danger"
    : tone === "warning" ? "bg-warning text-warning-foreground border-warning"
    : tone === "info" ? "bg-info text-info-foreground border-info"
    : tone === "success" ? "bg-success text-success-foreground border-success"
    : "bg-primary text-primary-foreground border-primary";
  // Special: Trễ pill stays danger-tinted even when inactive (if has count)
  const dangerInactive = tone === "danger" && !active && !disabled
    ? "bg-danger-bg text-danger border-danger/40 hover:bg-danger/15"
    : "";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
        active
          ? toneActive
          : dangerInactive || "bg-surface-1 border-surface-3 text-text-2 hover:bg-surface-3",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
      <span className="tabular-nums font-bold">{count}</span>
    </button>
  );
}

function Separator() {
  return <span className="mx-1 h-4 w-px bg-surface-3" aria-hidden />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Card drill-down popup (M5-UX-PATCH — cards CHỈ NHÌN, click → popup)
   ═══════════════════════════════════════════════════════════════════════════ */
function CardDrillDownDialog({
  focus, rows, counts, onClose, onApplyFilter, onOpenRow,
}: {
  focus: NonNullable<DrillFocus>;
  rows: PoLifecycleRow[];
  counts: { stage: Record<LifecycleStage, number>; todo: number; transit: number; overdue: number; done: number };
  onClose: () => void;
  onApplyFilter: (s: "todo" | "transit" | "overdue" | "done" | { stage: LifecycleStage }) => void;
  onOpenRow: (r: PoLifecycleRow) => void;
}) {
  const titleMap = {
    todo: "Cần xử lý — phân rã theo trạng thái",
    transit: "Đang vận chuyển — danh sách xe",
    overdue: "Trễ hạn SLA — cần xử lý ngay",
    done: "Hoàn tất tuần này",
  } as const;

  // Build content per focus
  const renderBody = () => {
    if (focus === "todo") {
      const breakdown: Array<{ s: LifecycleStage; label: string; n: number }> = ACTION_STAGES.map(s => ({
        s, label: STAGE_META[s].label, n: counts.stage[s],
      })).filter(x => x.n > 0);
      return (
        <div className="space-y-2">
          <div className="text-table-sm text-text-3">Tổng <b className="text-text-1">{counts.todo}</b> đơn cần thao tác.</div>
          <div className="grid grid-cols-2 gap-2">
            {breakdown.map(b => (
              <button
                key={b.s}
                onClick={() => onApplyFilter({ stage: b.s })}
                className="flex items-center justify-between rounded-card border border-surface-3 bg-surface-1 hover:bg-surface-2 px-3 py-2 transition-colors text-left"
              >
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-text-3 font-semibold">{STAGE_META[b.s].short}</div>
                  <div className="text-table-sm text-text-1">{b.label}</div>
                </div>
                <div className="text-h3 font-bold tabular-nums text-primary">{b.n}</div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    const list = focus === "transit"
      ? rows.filter(r => r.stage === "pickup" || r.stage === "in_transit")
      : focus === "overdue"
      ? rows.filter(r => isOverdue(r))
      : rows.filter(r => r.stage === "completed");

    return (
      <div className="space-y-2">
        <div className="text-table-sm text-text-3">
          {focus === "overdue" && <>Có <b className="text-danger">{list.length}</b> đơn vượt SLA. Bấm vào dòng để mở chi tiết.</>}
          {focus === "transit" && <>Có <b className="text-text-1">{list.length}</b> xe đang trên đường.</>}
          {focus === "done" && <>Đã hoàn tất <b className="text-success">{list.length}</b> đơn trong kỳ.</>}
        </div>
        <div className="max-h-[50vh] overflow-y-auto divide-y divide-surface-3 rounded-card border border-surface-3">
          {list.length === 0 ? (
            <div className="p-4 text-center text-table-sm text-text-3">Không có đơn nào.</div>
          ) : list.map(r => {
            const overdue = isOverdue(r);
            return (
              <button
                key={r.id}
                onClick={() => onOpenRow(r)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 transition-colors"
              >
                <Badge variant="outline" className={cn("text-[10px] font-mono shrink-0", STAGE_META[r.stage].tone)}>
                  {STAGE_META[r.stage].short}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-table-sm font-mono font-semibold text-text-1 truncate">{r.poNumber}</div>
                  <div className="text-[11px] text-text-3 truncate">{r.fromName} → {r.toName}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={cn("text-table-sm font-medium tabular-nums", overdue ? "text-danger" : "text-text-2")}>
                    {fmtTimeInStage(r.hoursInStage)} {overdue && "⚠️"}
                  </div>
                  {overdue && <div className="text-[10px] text-danger">SLA {STAGE_SLA_HOURS[r.stage]}h</div>}
                  {r.stage === "in_transit" && r.etaRemainingH !== undefined && (
                    <div className="text-[10px] text-text-3">{fmtEta(r.etaRemainingH).label}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titleMap[focus]}</DialogTitle>
          <DialogDescription>
            {focus === "overdue"
              ? "Mỗi đơn đã quá SLA. Bấm để mở dòng tương ứng trong bảng."
              : "Bấm 1 mục để áp filter vào bảng và đóng popup."}
          </DialogDescription>
        </DialogHeader>
        {renderBody()}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          <Button onClick={() => onApplyFilter(focus)}>
            Lọc bảng theo "{titleMap[focus].split(" — ")[0]}"
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Per-row action button (button label depends on current stage)
   ═══════════════════════════════════════════════════════════════════════════ */
function RowActionButton({
  row, onClick, onCancel,
}: { row: PoLifecycleRow; onClick: () => void; onCancel: () => void }) {
  const cfg = ACTION_CONFIG[row.stage];
  if (!cfg) {
    if (row.stage === "completed") {
      return <span className="text-[11px] text-text-3 inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Hoàn tất</span>;
    }
    if (row.stage === "cancelled") {
      return <span className="text-[11px] text-text-3 inline-flex items-center gap-1"><X className="h-3.5 w-3.5 text-danger" /> Đã hủy</span>;
    }
    // pickup / in_transit — has primary advance + cancel
  }
  const overdue = isOverdue(row);
  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        size="sm"
        variant={overdue ? "destructive" : "default"}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="h-7 text-[11px] px-2.5 gap-1"
        title={overdue ? `Quá SLA ${STAGE_SLA_HOURS[row.stage]}h. Cần xử lý ngay.` : undefined}
      >
        {cfg?.icon && <cfg.icon className="h-3.5 w-3.5" />}
        {cfg?.label || ACTION_CONFIG_FALLBACK[row.stage]?.label || "Cập nhật"}
      </Button>
      {row.stage !== "completed" && row.stage !== "cancelled" && row.stage !== "in_transit" && (
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
          className="h-7 w-7 text-text-3 hover:text-danger"
          title="Hủy đơn"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

const ACTION_CONFIG: Partial<Record<LifecycleStage, { label: string; icon: typeof Send }>> = {
  approved:     { label: "Gửi NM",       icon: Send },
  sent_nm:      { label: "NM xác nhận",  icon: CheckCircle2 },
  nm_confirmed: { label: "Đặt xe",       icon: Truck },
  pickup:       { label: "Đã lấy hàng",  icon: Package },
  in_transit:   { label: "Đã đến CN",    icon: Flag },
  delivering:   { label: "Kiểm đếm POD", icon: ClipboardCheck },
};
const ACTION_CONFIG_FALLBACK = ACTION_CONFIG;

/* ═══════════════════════════════════════════════════════════════════════════
   Expanded drill-down
   ═══════════════════════════════════════════════════════════════════════════ */
function ExpandedRow({ row }: { row: PoLifecycleRow }) {
  return (
    <div className="bg-surface-1 border-t border-surface-3 p-4 space-y-4">
      {/* Lifecycle timeline */}
      <div>
        <div className="text-caption uppercase tracking-wide text-text-3 mb-2 font-semibold">Lifecycle</div>
        <div className="flex items-center gap-0 overflow-x-auto pb-1">
          {STAGE_ORDER.map((s, i) => {
            const event = row.timeline.find(e => e.stage === s);
            const reached = !!event;
            const isCurrent = s === row.stage;
            return (
              <div key={s} className="flex items-center min-w-max">
                <div className="flex flex-col items-center px-2">
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                    reached
                      ? isCurrent ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                      : "bg-success text-success-foreground"
                      : "bg-surface-3 text-text-3",
                  )}>
                    {reached ? "✓" : i + 1}
                  </div>
                  <div className={cn("text-[10px] mt-1 font-medium", reached ? "text-text-1" : "text-text-3")}>
                    {STAGE_META[s].short}
                  </div>
                  {event && <div className="text-[10px] text-text-3 tabular-nums">{event.ts}</div>}
                </div>
                {i < STAGE_ORDER.length - 1 && (
                  <div className={cn("h-[2px] w-8 mt-[-26px]", reached ? "bg-success/60" : "bg-surface-3")} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-column info */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Transport info */}
        {row.carrierName && (
          <div className="rounded-card border border-surface-3 bg-surface-0 p-3 space-y-1.5">
            <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-1">Vận chuyển</div>
            <div className="text-table-sm"><span className="text-text-3">NVT:</span> <span className="font-medium text-text-1">{row.carrierName}</span></div>
            {row.vehiclePlate && <div className="text-table-sm font-mono"><span className="text-text-3 font-sans">Xe:</span> {row.vehiclePlate}</div>}
            {row.containerNo && <div className="text-table-sm font-mono"><span className="text-text-3 font-sans">Cont:</span> {row.containerNo}</div>}
            {row.driverName && (
              <div className="text-table-sm flex items-center gap-2">
                <span className="text-text-3">Tài xế:</span>
                <span className="text-text-1 font-medium">{row.driverName}</span>
                {row.driverPhone && (
                  <a href={`tel:${row.driverPhone.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline text-[11px]">
                    <Phone className="h-3 w-3" /> {row.driverPhone}
                  </a>
                )}
              </div>
            )}
            {row.deliveryEta && (
              <div className="text-table-sm flex items-center gap-2 mt-1.5 pt-1.5 border-t border-surface-3">
                <span className="text-text-3">ETA:</span>
                <span className="font-medium text-text-1">{row.deliveryEta}</span>
                {row.etaRemainingH !== undefined && (() => {
                  const e = fmtEta(row.etaRemainingH);
                  return <span className={cn("text-[11px] font-bold",
                    e.tone === "danger" && "text-danger",
                    e.tone === "warning" && "text-warning",
                    e.tone === "success" && "text-success",
                  )}>· {e.label}</span>;
                })()}
              </div>
            )}
          </div>
        )}

        {/* Evidence */}
        <div className="rounded-card border border-surface-3 bg-surface-0 p-3">
          <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">Minh chứng</div>
          {row.evidence.length === 0
            ? <div className="text-table-sm text-text-3 italic">Chưa có minh chứng</div>
            : (
              <div className="space-y-1">
                {row.evidence.map((e, i) => <EvidenceBadge key={i} ev={e} />)}
              </div>
            )
          }
        </div>
      </div>

      {/* Full timeline log */}
      <div className="rounded-card border border-surface-3 bg-surface-0 p-3">
        <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">Lịch sử</div>
        <div className="space-y-1.5">
          {row.timeline.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-table-sm">
              <div className="text-text-3 tabular-nums w-20 shrink-0">{e.ts}</div>
              <Badge variant="outline" className={cn("text-[10px] shrink-0", STAGE_META[e.stage].tone)}>
                {STAGE_META[e.stage].short}
              </Badge>
              <div className="flex-1">
                <div className="text-text-1">{e.actor}</div>
                {e.note && <div className="text-[11px] text-text-3">{e.note}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EvidenceBadge({ ev }: { ev: PoEvidence }) {
  const Icon = ev.kind === "photo" || ev.kind === "screenshot" ? Image
    : ev.kind === "signature" ? PenLine
    : FileText;
  return (
    <div className="flex items-center gap-2 text-table-sm">
      <Icon className="h-3.5 w-3.5 text-text-3" />
      <span className="text-text-2">{ev.label}</span>
      {ev.count && ev.count > 1 && <span className="text-[10px] text-text-3">({ev.count})</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ACTION DIALOG — routes to per-stage form
   ═══════════════════════════════════════════════════════════════════════════ */
function ActionDialog({
  row, onClose, onAdvance,
}: {
  row: PoLifecycleRow;
  onClose: () => void;
  onAdvance: (patch: Partial<PoLifecycleRow>) => void;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto max-sm:w-screen max-sm:h-[100dvh] max-sm:max-w-none max-sm:max-h-none max-sm:rounded-none max-sm:p-4">
        {row.stage === "approved"     && <SendNmForm row={row} onSubmit={onAdvance} />}
        {row.stage === "sent_nm"      && <NmConfirmForm row={row} onSubmit={onAdvance} />}
        {row.stage === "nm_confirmed" && <BookCarrierForm row={row} onSubmit={onAdvance} />}
        {row.stage === "pickup"       && <PickupForm row={row} onSubmit={onAdvance} />}
        {row.stage === "in_transit"   && <ArrivalForm row={row} onSubmit={onAdvance} />}
        {row.stage === "delivering"   && <PodForm row={row} onSubmit={onAdvance} />}
      </DialogContent>
    </Dialog>
  );
}

/* ── BƯỚC 1: Gửi NM ── */
function SendNmForm({ row, onSubmit }: { row: PoLifecycleRow; onSubmit: (p: Partial<PoLifecycleRow>) => void }) {
  const [channel, setChannel] = useState("Zalo");
  return (
    <TransitionShell
      row={row}
      fromStage="approved"
      toStage="sent_nm"
      title={`Gửi đơn hàng cho ${row.fromName}`}
      config={{
        commentRequired: true,
        filesRequired: false,
        filesLabel: "Đính kèm (tuỳ chọn — screenshot Zalo/email)",
        commentPlaceholder: `Gửi qua Zalo cho chị Thúy (0901.xxx.xxx). Đã confirm qty OK qua điện thoại.`,
        submitLabel: "Gửi NM",
        submitTone: "primary",
      }}
      onSubmit={({ comment, files }) =>
        onSubmit({
          stage: "sent_nm",
          evidence: [
            ...row.evidence,
            ...filesToEvidence(files, "screenshot"),
          ],
          timeline: [...row.timeline, {
            stage: "sent_nm", ts: nowTs(), actor: "Planner Linh",
            note: `${channel}${comment ? ` — ${comment}` : ""}`,
            evidence: filesToEvidence(files, "screenshot"),
          }],
        })
      }
    >
      <div>
        <Label className="text-caption">Kênh liên hệ</Label>
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Zalo">Zalo</SelectItem>
            <SelectItem value="Gọi điện">Gọi điện</SelectItem>
            <SelectItem value="Email">Email</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </TransitionShell>
  );
}

/* ── BƯỚC 2: NM xác nhận ── */
function NmConfirmForm({ row, onSubmit }: { row: PoLifecycleRow; onSubmit: (p: Partial<PoLifecycleRow>) => void }) {
  const [qtyConfirmed, setQtyConfirmed] = useState(row.qty);
  const [readyDate, setReadyDate] = useState(todayPlus(2));
  const counter = qtyConfirmed < row.qty;
  return (
    <TransitionShell
      row={row}
      fromStage="sent_nm"
      toStage="nm_confirmed"
      title={`${row.fromName} xác nhận ${row.poNumber}`}
      description="Cập nhật số lượng + ngày sẵn sàng giao theo phản hồi của NM."
      config={{
        commentRequired: true,
        filesRequired: false,
        filesLabel: "Ảnh xác nhận từ NM (Zalo) — tuỳ chọn",
        commentPlaceholder: counter
          ? `NM counter ${qtyConfirmed}/${row.qty}m². Lý do: thiếu nguyên liệu, sẽ bổ sung tuần sau...`
          : "NM xác nhận đủ qty. Sẵn sàng giao đúng hẹn.",
        submitLabel: "NM đã xác nhận",
        submitTone: "success",
      }}
      fieldsValid={qtyConfirmed > 0 && !!readyDate}
      onSubmit={({ comment, files }) =>
        onSubmit({
          stage: "nm_confirmed",
          qtyConfirmed,
          pickupEta: fmtDateShort(readyDate),
          evidence: [
            ...row.evidence,
            ...filesToEvidence(files, "screenshot"),
          ],
          timeline: [...row.timeline, {
            stage: "nm_confirmed",
            ts: nowTs(),
            actor: row.fromName,
            note: `${counter ? `Counter ${qtyConfirmed}/${row.qty}m²` : `Đủ ${qtyConfirmed}m²`}. Sẵn sàng ${readyDate}${comment ? ` — ${comment}` : ""}`,
            evidence: filesToEvidence(files, "screenshot"),
          }],
        })
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-caption">SL xác nhận (m²) *</Label>
          <Input type="number" value={qtyConfirmed} onChange={(e) => setQtyConfirmed(Number(e.target.value))} className="text-base h-11" />
          {counter && <div className="text-[11px] text-warning mt-1">⚠️ NM chỉ xác nhận {qtyConfirmed}/{row.qty}m²</div>}
        </div>
        <div>
          <Label className="text-caption">Ngày NM sẵn sàng *</Label>
          <Input type="date" value={readyDate} onChange={(e) => setReadyDate(e.target.value)} className="text-base h-11" />
        </div>
      </div>
    </TransitionShell>
  );
}

/* ── BƯỚC 3: Đặt xe (Book carrier) ── */
function BookCarrierForm({ row, onSubmit }: { row: PoLifecycleRow; onSubmit: (p: Partial<PoLifecycleRow>) => void }) {
  // Filter carriers by region of destination CN
  const region = CN_REGION[row.toName] || row.region;
  const eligible = useMemo(() => {
    return [...CARRIERS]
      .filter(c => c.region.includes(region))
      .sort((a, b) => Number(b.available) - Number(a.available));
  }, [region]);

  const qty = row.qtyConfirmed ?? row.qty;
  const trips = qty > 900 ? Math.ceil(qty / 1800) : 1;
  const [carrierId, setCarrierId] = useState<string>(eligible.find(c => c.available)?.id || "");
  const [pickupDate, setPickupDate] = useState(todayPlus(1));
  const [containerType, setContainerType] = useState<"20ft" | "40ft" | "10T">(qty > 900 ? "40ft" : "20ft");
  const carrier = CARRIERS.find(c => c.id === carrierId);

  return (
    <TransitionShell
      row={row}
      fromStage="nm_confirmed"
      toStage="pickup"
      title={`Đặt xe — ${row.poNumber}`}
      description={`${row.fromName} → ${row.toName} · ${qty.toLocaleString()}m²`}
      config={{
        commentRequired: true,
        filesRequired: false,
        filesLabel: "Booking sheet / xác nhận NVT (tuỳ chọn)",
        commentPlaceholder: `Đã book ${carrier?.name} qua điện thoại. Tài xế sẽ gọi 1h trước khi đến NM.`,
        submitLabel: "Xác nhận đặt xe",
        submitTone: "warning",
      }}
      fieldsValid={!!carrier?.available && !!pickupDate}
      onSubmit={({ comment, files }) =>
        onSubmit({
          stage: "pickup",
          carrierId, carrierName: carrier?.name,
          pickupEta: fmtDateShort(pickupDate),
          evidence: [...row.evidence, ...filesToEvidence(files, "doc")],
          timeline: [...row.timeline, {
            stage: "pickup", ts: nowTs(), actor: "Planner Linh",
            note: `${carrier?.name} · ${containerType} · ${trips} chuyến · lấy ${pickupDate}${comment ? ` — ${comment}` : ""}`,
            evidence: filesToEvidence(files, "doc"),
          }],
        })
      }
    >
      <div>
        <Label className="text-caption">Nhà xe (vùng {region}) *</Label>
        <Select value={carrierId} onValueChange={setCarrierId}>
          <SelectTrigger className="h-11"><SelectValue placeholder="Chọn nhà xe" /></SelectTrigger>
          <SelectContent>
            {eligible.map(c => (
              <SelectItem key={c.id} value={c.id} disabled={!c.available}>
                {c.name} · {(c.rate40ft / 1e6).toFixed(1)}tr/40ft · SLA {c.slaOnTimePct}%
                {!c.available && " · Tạm ngưng"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {carrier && !carrier.available && (
          <div className="text-[11px] text-danger mt-1 inline-flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> {carrier.name} đang tạm ngưng. Chọn nhà xe khác.
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-caption">Loại xe *</Label>
          <Select value={containerType} onValueChange={(v) => setContainerType(v as "20ft" | "40ft" | "10T")}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="20ft">Container 20ft (900m²)</SelectItem>
              <SelectItem value="40ft">Container 40ft (1.800m²)</SelectItem>
              <SelectItem value="10T">Xe tải 10T (500m²)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-caption">Số chuyến</Label>
          <Input type="number" value={trips} readOnly className="bg-surface-1 h-11 text-base" />
        </div>
      </div>
      <div>
        <Label className="text-caption">Ngày lấy hàng *</Label>
        <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className="h-11 text-base" />
      </div>
      {qty > 900 && containerType === "20ft" && (
        <div className="rounded-card border border-warning/40 bg-warning-bg p-2 text-[11px] text-warning">
          <strong>Split shipment:</strong> {qty.toLocaleString()}m² &gt; 900m²/20ft → cần {Math.ceil(qty / 900)} chuyến.
        </div>
      )}
    </TransitionShell>
  );
}

/* ── BƯỚC 4: Xe đã lấy hàng ── */
function PickupForm({ row, onSubmit }: { row: PoLifecycleRow; onSubmit: (p: Partial<PoLifecycleRow>) => void }) {
  const [vehiclePlate, setVehiclePlate] = useState(row.vehiclePlate || "");
  const [containerNo, setContainerNo] = useState("");
  const [driverName, setDriverName] = useState(row.driverName || "");
  const [driverPhone, setDriverPhone] = useState(row.driverPhone || "");
  const [actualQty, setActualQty] = useState(row.qtyConfirmed ?? row.qty);
  const targetQty = row.qtyConfirmed ?? row.qty;
  const partial = actualQty < targetQty;

  const minPickupPhotos = row.qty > 500 ? 2 : 0;
  return (
    <TransitionShell
      row={row}
      fromStage="pickup"
      toStage="in_transit"
      title={`Xác nhận lấy hàng tại ${row.fromName}`}
      description={`Nhập thông tin xe + tài xế. POD đầu NM bắt buộc nếu > 500m².`}
      config={{
        commentRequired: true,
        filesRequired: row.qty > 500,
        filesMinCount: minPickupPhotos,
        filesLabel: row.qty > 500
          ? `Ảnh bốc hàng tại NM + Phiếu xuất kho (≥ ${minPickupPhotos} file)`
          : "Ảnh bốc hàng tại NM (tuỳ chọn)",
        commentPlaceholder: `Xe ${vehiclePlate || "—"} đã đến NM lúc 09:30. Bốc xong ${actualQty}m². Tài xế ${driverName || "—"} xuất phát.`,
        submitLabel: "Xác nhận đã lấy hàng",
        submitTone: "warning",
      }}
      fieldsValid={!!vehiclePlate && !!driverName && !!driverPhone && actualQty > 0}
      onSubmit={({ comment, files }) =>
        onSubmit({
          stage: "in_transit", vehiclePlate, containerNo: containerNo || undefined,
          driverName, driverPhone, qtyDelivered: actualQty,
          etaRemainingH: 24,
          deliveryEta: `${todayPlus(1).slice(8)}/${todayPlus(1).slice(5,7)} 14:00`,
          evidence: [
            ...row.evidence,
            ...filesToEvidence(files, "photo"),
          ],
          timeline: [...row.timeline, {
            stage: "in_transit", ts: nowTs(), actor: `Tài xế ${driverName}`,
            note: `${vehiclePlate}${containerNo ? ` · ${containerNo}` : ""} · ${actualQty}m²${partial ? ` (thiếu ${targetQty - actualQty})` : ""}${comment ? ` — ${comment}` : ""}`,
            evidence: filesToEvidence(files, "photo"),
          }],
        })
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-caption">Số xe *</Label>
          <Input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} placeholder="51C-72184" className="h-11 text-base font-mono" />
        </div>
        <div>
          <Label className="text-caption">Số container</Label>
          <Input value={containerNo} onChange={(e) => setContainerNo(e.target.value)} placeholder="TCKU2200881" className="h-11 text-base font-mono" />
        </div>
        <div>
          <Label className="text-caption">Tài xế *</Label>
          <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Lê Văn Hùng" className="h-11 text-base" />
        </div>
        <div>
          <Label className="text-caption">SĐT tài xế *</Label>
          <Input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="0903 555 222" inputMode="tel" className="h-11 text-base" />
        </div>
      </div>
      <div>
        <Label className="text-caption">SL thực tế bốc (m²) *</Label>
        <Input type="number" value={actualQty} onChange={(e) => setActualQty(Number(e.target.value))} className="h-11 text-base" />
        {partial && (
          <div className="text-[11px] text-danger mt-1 inline-flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> NM giao thiếu {targetQty - actualQty}m² so với cam kết.
          </div>
        )}
      </div>
    </TransitionShell>
  );
}

/* ── BƯỚC 5: Xe đã đến CN ── */
function ArrivalForm({ row, onSubmit }: { row: PoLifecycleRow; onSubmit: (p: Partial<PoLifecycleRow>) => void }) {
  const [condition, setCondition] = useState<"intact" | "damaged" | "missing">("intact");
  const condLabel = condition === "intact" ? "Nguyên vẹn" : condition === "damaged" ? "Có hư hỏng" : "Thiếu hàng";
  return (
    <TransitionShell
      row={row}
      fromStage="in_transit"
      toStage="delivering"
      title={`Xác nhận xe đến ${row.toName}`}
      description={`Xe ${row.vehiclePlate ?? "—"} · ${row.driverName ?? "—"} đã đến cổng. Kiểm sơ trước khi dỡ hàng.`}
      config={{
        commentRequired: true,
        filesRequired: condition !== "intact",
        filesMinCount: condition !== "intact" ? 2 : 0,
        filesLabel: condition === "intact"
          ? "Ảnh xe tại cổng (tuỳ chọn)"
          : `Ảnh hiện trường ${condLabel} (≥ 2 ảnh)`,
        commentPlaceholder: condition === "intact"
          ? "Xe đến đúng giờ. Niêm phong nguyên vẹn. Bắt đầu dỡ hàng."
          : `Phát hiện ${condLabel.toLowerCase()} khi mở container. Đã chụp ảnh, gọi NVT lập biên bản.`,
        submitLabel: "Xe đã đến CN",
        submitTone: "primary",
      }}
      onSubmit={({ comment, files }) =>
        onSubmit({
          stage: "delivering", etaRemainingH: undefined,
          evidence: [...row.evidence, ...filesToEvidence(files, "photo")],
          timeline: [...row.timeline, {
            stage: "delivering", ts: nowTs(), actor: row.toName,
            note: `Xe đến · ${condLabel}${comment ? ` — ${comment}` : ""}`,
            evidence: filesToEvidence(files, "photo"),
          }],
        })
      }
    >
      <div>
        <Label className="text-caption">Trạng thái hàng *</Label>
        <Select value={condition} onValueChange={(v) => setCondition(v as "intact" | "damaged" | "missing")}>
          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="intact">Nguyên vẹn</SelectItem>
            <SelectItem value="damaged">Hư hỏng</SelectItem>
            <SelectItem value="missing">Thiếu</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </TransitionShell>
  );
}

/* ── BƯỚC 6: POD form (mobile-friendly) ── */
function PodForm({ row, onSubmit }: { row: PoLifecycleRow; onSubmit: (p: Partial<PoLifecycleRow>) => void }) {
  const targetQty = row.qtyConfirmed ?? row.qty;
  const [receivedQty, setReceivedQty] = useState(targetQty);
  const [quality, setQuality] = useState<"intact" | "partial" | "damaged">("intact");
  const [receiverName, setReceiverName] = useState("");
  const [receiverRole, setReceiverRole] = useState("Thủ kho");
  const partial = receivedQty < targetQty;
  const minPodPhotos = quality === "intact"
    ? REMINDER_CONFIG.podMinPhotos
    : REMINDER_CONFIG.podMinPhotos + 3; // damage cần thêm 3 ảnh hư hỏng

  return (
    <TransitionShell
      row={row}
      fromStage="delivering"
      toStage="completed"
      title={`Kiểm đếm & POD — ${row.poNumber}`}
      description={`${row.skuLabel} · cam kết ${targetQty.toLocaleString()}m²`}
      config={{
        commentRequired: true,
        filesRequired: true,
        filesMinCount: minPodPhotos,
        filesLabel: quality === "intact"
          ? `Ảnh hàng nhận + biên nhận (≥ ${minPodPhotos} file)`
          : `Ảnh hàng + biên nhận + ảnh hư hỏng (≥ ${minPodPhotos} file)`,
        commentPlaceholder: quality !== "intact"
          ? `Nhận ${receivedQty}/${targetQty}m². ${quality === "partial" ? "Một số kiện rách bao bì" : "Pallet hư nặng"}. Đã lập biên bản với tài xế.`
          : `Nhận đủ ${receivedQty}m². Hàng nguyên vẹn. ${receiverName || "Người nhận"} ký xác nhận.`,
        submitLabel: "Hoàn tất nhận hàng",
        submitTone: "success",
      }}
      fieldsValid={!!receiverName && receivedQty > 0}
      onSubmit={({ comment, files }) =>
        onSubmit({
          stage: "completed", qtyDelivered: receivedQty,
          evidence: [
            ...row.evidence,
            ...filesToEvidence(files, "photo"),
            { label: `Chữ ký ${receiverName} (${receiverRole})`, kind: "signature" },
          ],
          timeline: [...row.timeline, {
            stage: "completed", ts: nowTs(),
            actor: `${receiverName} (${receiverRole})`,
            note: `${partial ? `Nhận ${receivedQty}/${targetQty}m²` : `Nhận đủ ${receivedQty}m²`}. ${quality === "intact" ? "Nguyên vẹn" : quality === "partial" ? "Hỏng phần" : "Hỏng nặng"}${comment ? ` — ${comment}` : ""}`,
            evidence: filesToEvidence(files, "photo"),
          }],
        })
      }
    >
      {/* QTY */}
      <div className="rounded-card border border-surface-3 bg-surface-1 p-3 space-y-2">
        <div className="text-caption uppercase font-semibold text-text-3">Số lượng nhận *</div>
        <Input type="number" value={receivedQty} onChange={(e) => setReceivedQty(Number(e.target.value))} className="text-base h-11" />
        {partial && (
          <div className="text-[11px] text-warning inline-flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Thiếu {targetQty - receivedQty}m². Sẽ tạo backorder.
          </div>
        )}
      </div>

      {/* QUALITY */}
      <div>
        <Label className="text-caption mb-1.5 block">Chất lượng *</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {([
            { v: "intact",  l: "✅ Nguyên vẹn" },
            { v: "partial", l: "⚠️ Hỏng phần" },
            { v: "damaged", l: "❌ Hỏng nặng" },
          ] as const).map(opt => (
            <button key={opt.v} type="button"
              onClick={() => setQuality(opt.v)}
              className={cn(
                "py-2.5 px-2 text-[11px] font-medium rounded-button border transition-colors min-h-11",
                quality === opt.v
                  ? opt.v === "intact" ? "bg-success-bg border-success text-success"
                    : opt.v === "partial" ? "bg-warning-bg border-warning text-warning"
                    : "bg-danger-bg border-danger text-danger"
                  : "border-surface-3 text-text-3 hover:bg-surface-1",
              )}
            >{opt.l}</button>
          ))}
        </div>
        {quality !== "intact" && (
          <div className="mt-2 rounded-card border border-danger/30 bg-danger-bg/30 p-2 text-[11px] text-danger inline-flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> Damage claim — phần "Đính kèm" cần ≥ {minPodPhotos} file (gồm 3 ảnh hư hỏng).
          </div>
        )}
      </div>

      {/* Receiver */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-caption">Tên người nhận *</Label>
          <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} className="h-11 text-base" />
        </div>
        <div>
          <Label className="text-caption">Chức vụ</Label>
          <Select value={receiverRole} onValueChange={setReceiverRole}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Thủ kho">Thủ kho</SelectItem>
              <SelectItem value="CN Manager">CN Manager</SelectItem>
              <SelectItem value="Khác">Khác</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Signature stub */}
      <div className="rounded-card border-2 border-dashed border-surface-3 bg-surface-1 p-4 text-center text-text-3 text-table-sm min-h-[120px] flex flex-col items-center justify-center">
        <PenLine className="h-5 w-5 mb-1" />
        Ký tên (vẽ tay trên màn hình)
      </div>
    </TransitionShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CANCEL DIALOG
   ═══════════════════════════════════════════════════════════════════════════ */
/**
 * Edge 2 — Cancel rules per lifecycle stage:
 *   approved / sent_nm / nm_confirmed → cho hủy + reason + ghi chú
 *     (sent_nm → cảnh báo notify NM, nm_confirmed → cảnh báo notify NVT)
 *   pickup → cho hủy nhưng cần SC Manager duyệt (xác nhận SC role)
 *   in_transit → KHÔNG hủy, gợi ý "Trả hàng về NM"
 *   delivering / completed → KHÔNG hủy
 *   cancelled → đã hủy rồi
 */
type CancelRule =
  | { kind: "allow"; warn?: string }
  | { kind: "needs_sc"; warn: string }
  | { kind: "block"; reason: string; alt?: string };

function evalCancelRule(stage: LifecycleStage, row: PoLifecycleRow): CancelRule {
  switch (stage) {
    case "approved":
      return { kind: "allow" };
    case "sent_nm":
      return { kind: "allow", warn: `Đã gửi NM ${row.fromName} — sẽ tự thông báo hủy qua Zalo/Email.` };
    case "nm_confirmed":
      return { kind: "allow", warn: `NM đã xác nhận${row.carrierName ? ` và đã book ${row.carrierName}` : ""} — sẽ thông báo hủy.` };
    case "pickup":
      return {
        kind: "needs_sc",
        warn: `Hàng đang được bốc tại NM ${row.fromName}. Cần SC Manager duyệt trước khi hủy.`,
      };
    case "in_transit":
      return {
        kind: "block",
        reason: "Hàng đang trên xe — không thể hủy đơn.",
        alt: "Dùng luồng \"Trả hàng về NM\" nếu thực sự cần.",
      };
    case "delivering":
      return { kind: "block", reason: "Đơn đang giao tại CN — không thể hủy. Liên hệ thủ kho CN để xử lý." };
    case "completed":
      return { kind: "block", reason: "Đơn đã hoàn tất — không thể hủy." };
    case "cancelled":
      return { kind: "block", reason: "Đơn đã ở trạng thái Đã hủy." };
  }
}

function CancelDialog({
  row, onClose, onConfirm,
}: {
  row: PoLifecycleRow;
  onClose: () => void;
  onConfirm: (reason: string, note: string) => void;
}) {
  const rule = evalCancelRule(row.stage, row);
  const [reason, setReason] = useState("NM không đáp ứng");
  const [note, setNote] = useState("");
  const [scConfirm, setScConfirm] = useState(false);

  const canSubmit =
    rule.kind !== "block" &&
    note.trim().length > 0 &&
    (rule.kind !== "needs_sc" || scConfirm);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-danger inline-flex items-center gap-2">
            <X className="h-4 w-4" /> Hủy {row.poNumber}?
          </DialogTitle>
          <DialogDescription>
            Trạng thái hiện tại:{" "}
            <span className="font-semibold text-text-1">{STAGE_META[row.stage].label}</span>
          </DialogDescription>
        </DialogHeader>

        {rule.kind === "block" && (
          <div className="rounded-md border border-danger/40 bg-danger-bg/50 px-3 py-2.5 text-table-sm text-danger space-y-1">
            <div className="font-semibold inline-flex items-center gap-1.5">
              <X className="h-3.5 w-3.5" /> {rule.reason}
            </div>
            {rule.alt && <div className="text-text-2 text-table-sm">→ {rule.alt}</div>}
          </div>
        )}

        {rule.kind !== "block" && (
          <div className="space-y-3">
            {rule.kind === "needs_sc" ? (
              <div className="rounded-md border border-warning/40 bg-warning-bg/50 px-3 py-2 text-table-sm text-warning inline-flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{rule.warn}</span>
              </div>
            ) : rule.warn ? (
              <div className="rounded-md border border-info/30 bg-info-bg/40 px-3 py-2 text-table-sm text-info inline-flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{rule.warn}</span>
              </div>
            ) : null}

            <div>
              <Label className="text-caption">Lý do *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NM không đáp ứng">NM không đáp ứng</SelectItem>
                  <SelectItem value="CN hủy nhu cầu">CN hủy nhu cầu</SelectItem>
                  <SelectItem value="Thay đổi kế hoạch">Thay đổi kế hoạch</SelectItem>
                  <SelectItem value="Khác">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-caption">Ghi chú *</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Mô tả chi tiết để truy vết về sau"
                required
              />
            </div>
            {rule.kind === "needs_sc" && (
              <label className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-bg/30 px-3 py-2 text-table-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={scConfirm}
                  onChange={(e) => setScConfirm(e.target.checked)}
                  className="mt-0.5 accent-warning"
                />
                <span>
                  Tôi xác nhận đã có <b>SC Manager</b> chấp thuận (qua Zalo/Email) cho phép hủy đơn
                  ở trạng thái "Lấy hàng".
                </span>
              </label>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {rule.kind === "block" ? "Đóng" : "Không hủy"}
          </Button>
          {rule.kind !== "block" && (
            <Button variant="destructive" disabled={!canSubmit} onClick={() => onConfirm(reason, note)}>
              Hủy đơn ✓
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Small shared utilities
   ═══════════════════════════════════════════════════════════════════════════ */
function FilePickerStub({ label, required }: { label: string; required?: boolean }) {
  return (
    <button type="button" className="w-full rounded-card border-2 border-dashed border-surface-3 bg-surface-1 hover:bg-surface-3 p-3 text-table-sm text-text-2 inline-flex items-center justify-center gap-2 transition-colors">
      <Camera className="h-4 w-4" />
      <span>{label}</span>
      {required && <span className="text-danger">*</span>}
    </button>
  );
}

function SlaInfo({ text }: { text: string }) {
  return (
    <div className="rounded-card bg-info-bg/40 border border-info/20 px-2.5 py-1.5 text-[11px] text-info inline-flex items-center gap-1.5">
      <AlertTriangle className="h-3 w-3 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function nowTs(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${mi}`;
}

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtDateShort(iso: string): string {
  if (!iso) return "—";
  const [, m, dd] = iso.split("-");
  return `${dd}/${m}`;
}

/** Convert uploaded EvidenceFile[] → PoEvidence[] for timeline/evidence storage. */
function filesToEvidence(files: EvidenceFile[], defaultKind: "photo" | "doc" | "screenshot" | "signature" = "photo"): PoEvidence[] {
  return files.map((f) => ({
    label: f.name,
    kind: f.type.startsWith("image/") ? (defaultKind === "screenshot" ? "screenshot" : "photo")
      : f.type.includes("pdf") ? "doc"
      : defaultKind,
    url: f.dataUrl,
    count: 1,
  }));
}
