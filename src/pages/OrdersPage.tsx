import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { useTenant } from "@/components/TenantContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ChevronRight, Send, Upload, Loader2, PackageOpen, CheckCircle2, Truck, MapPin, Phone, User,
  Package, PackageCheck, ClipboardCheck, Clock, AlertTriangle, FileText, ArrowRight, Building2, X,
  Download, Filter as FilterIcon,
} from "lucide-react";
import { getPoTypeBadge, poNumClasses } from "@/lib/po-numbers";
import { useNavigate } from "react-router-dom";
import { LogicLink } from "@/components/LogicLink";
import { LogicTooltip } from "@/components/LogicTooltip";
import { BatchLockBanner, useBatchLock } from "@/components/BatchLockBanner";
import { useVersionConflict, VersionConflictDialog } from "@/components/VersionConflict";
import { usePurchaseOrders, type PurchaseOrderRow } from "@/hooks/usePurchaseOrders";
import { useRbac } from "@/components/RbacContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { getShipmentDetail, etaTone, etaLabel, type ShipmentDetail } from "@/lib/shipment-data";
import { BpoFlowCard } from "@/components/orders/BpoFlowCard";
import { PodUploadPanel } from "@/components/orders/PodUploadPanel";
import { LayoutGrid, GitBranch, Search, Filter, CalendarIcon, ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

/* ─────────── helpers ─────────── */
const supplierToNm: Record<string, string> = {
  "Mikado": "Mikado", "Toko": "Toko", "Đồng Tâm": "Đồng Tâm", "Vigracera": "Vigracera",
};

function formatVnd(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  return v.toLocaleString();
}
function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

/* ─────────── BPO burn-down model ─────────── */
interface BpoBurnDown {
  nm: string;
  bpo: string;
  bpoTotal: number;       // sum of all non-cancelled PO line qty (Created)
  approved: number;       // lines past submitted (submitted+confirmed+shipped+received)
  released: number;       // RPO issued (confirmed + shipped + received)
  shipped: number;        // ASN issued (shipped + received)
  delivered: number;      // sum of actual received qty (defaults to ordered qty when status=received)
  cancelled: number;      // sum of cancelled qty (excluded from funnel)
  remaining: number;      // bpoTotal - delivered
  completionPct: number;
  earliestEta: number | null;   // earliest expected_date (epoch ms) among unfulfilled lines, null if none
  revenueAtRisk: number;        // remaining qty × avg unit price (VND)
  rpos: RpoChild[];
}
interface RpoChild {
  rpo: string;
  status: string;
  item: string;
  qty: number;
  asn: string | null;
  shipDate: string;
  eta: string;
  actual: number;
  expected_date: string | null;
}

/* ─────────── tabs ─────────── */
const tabs = [
  { key: "approval", label: "PO Approval", icon: ClipboardCheck },
  { key: "burndown", label: "BPO Burn-down", icon: Package },
  { key: "tracking", label: "Shipment Tracking", icon: Truck },
];

const stageOrder = ["draft", "submitted", "confirmed", "shipped", "received"];
const stageLabels: Record<string, string> = {
  draft: "Draft", submitted: "Submitted", confirmed: "Confirmed",
  shipped: "Shipped", received: "Received", cancelled: "Cancelled",
};

/* Stage visual theming — vivid status colors per pipeline stage */
type StageTheme = {
  icon: typeof FileText;
  iconBg: string;       // background of icon circle
  iconColor: string;    // foreground of icon circle
  ring: string;         // ring around active card
  numberColor: string;  // big number color when active
  bar: string;          // progress bar fill color
  chip: string;         // selected-state chip background+border classes
};
const stageThemes: Record<string, StageTheme> = {
  draft: {
    icon: FileText,
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconColor: "text-slate-500 dark:text-slate-300",
    ring: "ring-slate-300 dark:ring-slate-600",
    numberColor: "text-slate-700 dark:text-slate-100",
    bar: "bg-slate-400",
    chip: "border-slate-300 bg-slate-100/80 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100",
  },
  submitted: {
    icon: ClipboardCheck,
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-600 dark:text-amber-300",
    ring: "ring-amber-400",
    numberColor: "text-amber-700 dark:text-amber-200",
    bar: "bg-amber-400",
    chip: "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-500 dark:bg-amber-950/50 dark:text-amber-200",
  },
  confirmed: {
    icon: PackageCheck,
    iconBg: "bg-blue-100 dark:bg-blue-950/50",
    iconColor: "text-blue-600 dark:text-blue-300",
    ring: "ring-blue-400",
    numberColor: "text-blue-700 dark:text-blue-200",
    bar: "bg-blue-500",
    chip: "border-blue-400 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-200",
  },
  shipped: {
    icon: Truck,
    iconBg: "bg-violet-100 dark:bg-violet-950/50",
    iconColor: "text-violet-600 dark:text-violet-300",
    ring: "ring-violet-400",
    numberColor: "text-violet-700 dark:text-violet-200",
    bar: "bg-violet-500",
    chip: "border-violet-400 bg-violet-50 text-violet-800 dark:border-violet-500 dark:bg-violet-950/50 dark:text-violet-200",
  },
  received: {
    icon: CheckCircle2,
    iconBg: "bg-emerald-100 dark:bg-emerald-950/50",
    iconColor: "text-emerald-600 dark:text-emerald-300",
    ring: "ring-emerald-400",
    numberColor: "text-emerald-700 dark:text-emerald-200",
    bar: "bg-emerald-500",
    chip: "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-200",
  },
};

export default function OrdersPage() {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const { groups: dbGroups, allOrders, loading: poLoading } = usePurchaseOrders();
  const { canEdit, canApprove, user } = useRbac();

  const ordersBatch = useBatchLock(null);
  const { conflict: ordersConflict, clearConflict } = useVersionConflict();
  const [activeTab, setActiveTab] = useState("approval");

  // Approval tab state
  const [selectedPos, setSelectedPos] = useState<Set<string>>(new Set());
  const [pendingApproval, setPendingApproval] = useState<null | { kind: "approve" | "reject" | "bulk"; pos: PurchaseOrderRow[] }>(null);
  const [approvalNote, setApprovalNote] = useState("");
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

  // Burn-down tab state
  const [drillBpo, setDrillBpo] = useState<string | null>(null);
  const [burndownView, setBurndownView] = useState<"compact" | "flow">("compact");
  const [bdSearch, setBdSearch] = useState("");
  const [bdNms, setBdNms] = useState<Set<string>>(new Set());
  const [bdSkus, setBdSkus] = useState<Set<string>>(new Set());
  const [bdDateRange, setBdDateRange] = useState<DateRange | undefined>(undefined);
  const [bdSort, setBdSort] = useState<"eta_asc" | "eta_desc" | "completion_asc" | "completion_desc" | "risk_desc" | "risk_asc" | "nm_asc">("risk_desc");

  // Tracking tab state
  const [openShipment, setOpenShipment] = useState<ShipmentDetail | null>(null);
  const [trackFilter, setTrackFilter] = useState<"all" | "in_transit" | "overdue" | "received">("all");
  const [trkSearch, setTrkSearch] = useState("");
  const [trkNms, setTrkNms] = useState<Set<string>>(new Set());
  const [trkSkus, setTrkSkus] = useState<Set<string>>(new Set());
  const [trkDateRange, setTrkDateRange] = useState<DateRange | undefined>(undefined);
  const [trkSort, setTrkSort] = useState<"eta_asc" | "eta_desc" | "stage_desc" | "stage_asc" | "qty_desc" | "nm_asc">("eta_asc");
  const [trkPage, setTrkPage] = useState(1);
  const [trkSelected, setTrkSelected] = useState<Set<string>>(new Set());
  const TRK_PAGE_SIZE = 25;

  // Pipeline rail filter (drives Approval-tab reference table)
  const [pipelineFilter, setPipelineFilter] = useState<string | null>(null);

  /* ── Derive effective status (with overrides) ── */
  const effectiveStatus = (po: PurchaseOrderRow): string => statusOverrides[po.po_number] || po.status;

  /**
   * Per-line received quantity (partial GRN aware).
   *
   * Rules:
   *   • cancelled / draft / submitted / confirmed → 0
   *   • shipped  → partial GRN possible (some lines arrive split). Deterministic
   *               fraction in [0, 0.7) of ordered — covers the "in-transit but
   *               first truck already received" case. Often 0 (still rolling).
   *   • received → full or short-shipped. Deterministic fraction in [0.85, 1.0]
   *               of ordered — never above ordered (cap enforced).
   *
   * Deterministic so totals stay stable across renders without DB writes.
   * When a backing column (e.g. `received_qty`) is added later, swap the body
   * for `Number(po.received_qty ?? 0)` and keep the cap.
   */
  const receivedQtyFor = (po: PurchaseOrderRow): number => {
    const st = effectiveStatus(po);
    const ordered = Number(po.quantity) || 0;
    if (ordered <= 0) return 0;
    if (st === "draft" || st === "submitted" || st === "confirmed" || st === "cancelled") return 0;

    // Stable hash from po_number → 0..999
    let h = 0;
    for (let i = 0; i < po.po_number.length; i++) h = (h * 31 + po.po_number.charCodeAt(i)) >>> 0;
    const r = (h % 1000) / 1000; // [0, 1)

    if (st === "shipped") {
      // ~40% of shipped lines have a first partial GRN already booked.
      if (r < 0.6) return 0;
      const frac = 0.2 + ((h >>> 5) % 500) / 1000; // [0.20, 0.70)
      return Math.min(ordered, Math.round(ordered * frac));
    }
    // received
    const frac = 0.85 + ((h >>> 7) % 150) / 1000; // [0.85, 1.00)
    // Most fully-received lines actually hit 100%
    const qty = r < 0.7 ? ordered : Math.round(ordered * frac);
    return Math.min(ordered, qty);
  };

  /* ── Stage counts from pipeline ── */
  const stageCounts = useMemo(() => {
    const c: Record<string, { count: number; qty: number }> = {};
    stageOrder.forEach((s) => (c[s] = { count: 0, qty: 0 }));
    allOrders.forEach((o) => {
      const s = effectiveStatus(o);
      if (c[s]) {
        c[s].count++;
        c[s].qty += Number(o.quantity);
      }
    });
    return c;
  }, [allOrders, statusOverrides]);




  /* ── Pending-approval queue (draft + submitted) ── */
  const approvalQueue = useMemo(() => {
    return allOrders.filter((o) => {
      const s = effectiveStatus(o);
      return s === "draft" || s === "submitted";
    });
  }, [allOrders, statusOverrides]);

  /* ── Filter options for Burn-down ── */
  const allNmList = useMemo(() => {
    const set = new Set<string>();
    allOrders.forEach((o) => set.add(supplierToNm[o.supplier] || o.supplier));
    return Array.from(set).sort();
  }, [allOrders]);
  const allSkuList = useMemo(() => {
    const set = new Set<string>();
    allOrders.forEach((o) => set.add(o.sku));
    return Array.from(set).sort();
  }, [allOrders]);

  /* ── Filtered orders for Burn-down ── */
  const filteredBdOrders = useMemo(() => {
    const q = bdSearch.trim().toLowerCase();
    return allOrders.filter((o) => {
      // Pipeline rail filter (cross-tab) — keep BPOs that have at least one line at this stage
      // (handled at NM/BPO aggregation by tagging — here we keep the line for analytics)
      const nm = supplierToNm[o.supplier] || o.supplier;
      if (bdNms.size > 0 && !bdNms.has(nm)) return false;
      if (bdSkus.size > 0 && !bdSkus.has(o.sku)) return false;
      if (bdDateRange?.from && o.expected_date) {
        const d = new Date(o.expected_date);
        if (d < bdDateRange.from) return false;
        if (bdDateRange.to && d > bdDateRange.to) return false;
      }
      if (q) {
        const hay = `${o.po_number} ${nm} ${o.sku}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allOrders, bdSearch, bdNms, bdSkus, bdDateRange]);

  const bdActiveFilterCount =
    (bdSearch.trim() ? 1 : 0) + (bdNms.size > 0 ? 1 : 0) + (bdSkus.size > 0 ? 1 : 0) + (bdDateRange?.from ? 1 : 0);
  const clearBdFilters = () => { setBdSearch(""); setBdNms(new Set()); setBdSkus(new Set()); setBdDateRange(undefined); };

  /* ── BPO burn-down aggregates ── */
  const burnDowns: BpoBurnDown[] = useMemo(() => {
    const bySupplier: Record<string, PurchaseOrderRow[]> = {};
    filteredBdOrders.forEach((o) => {
      const nm = supplierToNm[o.supplier] || o.supplier;
      if (!bySupplier[nm]) bySupplier[nm] = [];
      bySupplier[nm].push(o);
    });
    return Object.entries(bySupplier).map(([nm, orders]) => {
      // Stage qty buckets — each line counted at every stage it has REACHED
      const sumWhere = (preds: string[]) =>
        orders
          .filter((o) => preds.includes(effectiveStatus(o)))
          .reduce((s, o) => s + Number(o.quantity), 0);

      const cancelled = sumWhere(["cancelled"]);
      // Created = all non-cancelled lines (draft+submitted+confirmed+shipped+received)
      const bpoTotal = sumWhere(["draft", "submitted", "confirmed", "shipped", "received"]);
      // Approved = past submitted gate
      const approved = sumWhere(["submitted", "confirmed", "shipped", "received"]);
      // Released = RPO issued (confirmed onward)
      const released = sumWhere(["confirmed", "shipped", "received"]);
      // Shipped = ASN issued
      const shipped = sumWhere(["shipped", "received"]);
      // Delivered = Σ actual GRN qty per line (partial-aware, capped at ordered)
      const delivered = orders.reduce((s, o) => s + receivedQtyFor(o), 0);

      const remaining = Math.max(0, bpoTotal - delivered);
      const completionPct = bpoTotal > 0 ? Math.round((delivered / bpoTotal) * 100) : 0;

      const rpos: RpoChild[] = orders
        .filter((o) => effectiveStatus(o) !== "cancelled")
        .map((o) => {
          const st = effectiveStatus(o);
          const ordered = Number(o.quantity);
          const actual = receivedQtyFor(o);
          return {
            rpo: o.po_number,
            status: st,
            item: o.sku,
            qty: ordered,
            asn: ["shipped", "received"].includes(st) ? `ASN-${o.po_number.slice(-3)}` : null,
            shipDate: ["shipped", "received"].includes(st) ? fmtDate(o.expected_date) : "—",
            eta: fmtDate(o.expected_date),
            actual,
            expected_date: o.expected_date,
          };
        });

      // Earliest ETA among unfulfilled lines:
      // a line counts as fulfilled only when actual GRN qty >= ordered (not just status=received).
      const unfulfilledEtaTimes = orders
        .filter((o) => {
          const st = effectiveStatus(o);
          if (st === "cancelled") return false;
          if (receivedQtyFor(o) >= Number(o.quantity)) return false;
          return !!o.expected_date;
        })
        .map((o) => new Date(o.expected_date as string).getTime())
        .filter((t) => !Number.isNaN(t));
      const earliestEta = unfulfilledEtaTimes.length > 0 ? Math.min(...unfulfilledEtaTimes) : null;

      // Revenue at risk = remaining qty × avg unit price (weighted by qty across non-cancelled lines)
      const nonCancelled = orders.filter((o) => effectiveStatus(o) !== "cancelled");
      const totalQty = nonCancelled.reduce((s, o) => s + Number(o.quantity), 0);
      const totalValue = nonCancelled.reduce((s, o) => s + Number(o.quantity) * Number(o.unit_price), 0);
      const avgUnitPrice = totalQty > 0 ? totalValue / totalQty : 0;
      const revenueAtRisk = remaining * avgUnitPrice;

      // Mark whether this NM has ANY line at the active pipeline stage
      const matchesPipeline = !pipelineFilter
        ? true
        : orders.some((o) => effectiveStatus(o) === pipelineFilter);

      return {
        nm,
        bpo: `BPO-${nm.substring(0, 3).toUpperCase()}`,
        bpoTotal, approved, released, shipped, delivered, cancelled, remaining, completionPct,
        earliestEta, revenueAtRisk, rpos,
        matchesPipeline,
      } as BpoBurnDown & { matchesPipeline: boolean };
    }).filter((b) => b.matchesPipeline);
  }, [filteredBdOrders, statusOverrides, pipelineFilter]);

  /* ── Sort BPO results ── */
  const sortedBurnDowns: BpoBurnDown[] = useMemo(() => {
    const arr = [...burnDowns];
    const FAR = Number.POSITIVE_INFINITY;
    arr.sort((a, b) => {
      switch (bdSort) {
        case "eta_asc":         return (a.earliestEta ?? FAR) - (b.earliestEta ?? FAR);
        case "eta_desc":        return (b.earliestEta ?? -FAR) - (a.earliestEta ?? -FAR);
        case "completion_asc":  return a.completionPct - b.completionPct;
        case "completion_desc": return b.completionPct - a.completionPct;
        case "risk_desc":       return b.revenueAtRisk - a.revenueAtRisk;
        case "risk_asc":        return a.revenueAtRisk - b.revenueAtRisk;
        case "nm_asc":          return a.nm.localeCompare(b.nm);
        default:                return 0;
      }
    });
    return arr;
  }, [burnDowns, bdSort]);

  /* ── Shipment list (RPO with ASN) ── */
  const shipments = useMemo(() => {
    return allOrders
      .filter((o) => ["confirmed", "shipped", "received"].includes(effectiveStatus(o)))
      .map((o) => {
        const st = effectiveStatus(o);
        const asn = ["shipped", "received"].includes(st) ? `ASN-${o.po_number.slice(-3)}` : `PEND-${o.po_number.slice(-3)}`;
        const nm = supplierToNm[o.supplier] || o.supplier;
        const detail = getShipmentDetail(asn, o.po_number, st, fmtDate(o.expected_date), fmtDate(o.expected_date), "CN-HCM");
        return { ...detail, sku: o.sku, qty: Number(o.quantity), nm, status: st };
      });
  }, [allOrders, statusOverrides]);

  const filteredShipments = useMemo(() => {
    const q = trkSearch.trim().toLowerCase();
    const arr = shipments.filter((s: any) => {
      // Cross-tab pipeline filter (PO status from header rail)
      if (pipelineFilter && s.status !== pipelineFilter) return false;
      // Quick-status chip
      if (trackFilter === "received" && s.currentStage !== "received") return false;
      if (trackFilter === "in_transit" && !(s.currentStage === "in_transit" || s.currentStage === "loaded")) return false;
      if (trackFilter === "overdue" && !(s.etaCountdownH !== undefined && s.etaCountdownH < 0)) return false;
      // NM
      if (trkNms.size > 0 && !trkNms.has(s.nm)) return false;
      // SKU
      if (trkSkus.size > 0 && !trkSkus.has(s.sku)) return false;
      // ETA date range — parse "dd/mm" back to Date by using etaCountdownH heuristic
      if (trkDateRange?.from) {
        // s.eta is "dd/MM" — combine with current year
        const m = /^(\d{2})\/(\d{2})/.exec(s.eta || "");
        if (m) {
          const yr = new Date().getFullYear();
          const d = new Date(yr, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
          if (d < trkDateRange.from) return false;
          if (trkDateRange.to && d > trkDateRange.to) return false;
        }
      }
      // Search
      if (q) {
        const hay = `${s.asn} ${s.rpo} ${s.nm} ${s.sku} ${s.driver ?? ""} ${s.vehicle ?? ""} ${s.carrier ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // Sort
    const stageRank: Record<string, number> = { picked: 0, loaded: 1, in_transit: 2, at_gate: 3, received: 4 };
    arr.sort((a: any, b: any) => {
      switch (trkSort) {
        case "eta_asc":   return (a.etaCountdownH ?? 1e9) - (b.etaCountdownH ?? 1e9);
        case "eta_desc":  return (b.etaCountdownH ?? -1e9) - (a.etaCountdownH ?? -1e9);
        case "stage_desc":return (stageRank[b.currentStage] ?? 0) - (stageRank[a.currentStage] ?? 0);
        case "stage_asc": return (stageRank[a.currentStage] ?? 0) - (stageRank[b.currentStage] ?? 0);
        case "qty_desc":  return (b.qty ?? 0) - (a.qty ?? 0);
        case "nm_asc":    return String(a.nm).localeCompare(String(b.nm));
        default:          return 0;
      }
    });
    return arr;
  }, [shipments, trackFilter, trkSearch, trkNms, trkSkus, trkDateRange, trkSort, pipelineFilter]);

  const trkActiveFilterCount =
    (trkSearch.trim() ? 1 : 0) + (trkNms.size > 0 ? 1 : 0) + (trkSkus.size > 0 ? 1 : 0) + (trkDateRange?.from ? 1 : 0);
  const clearTrkFilters = () => { setTrkSearch(""); setTrkNms(new Set()); setTrkSkus(new Set()); setTrkDateRange(undefined); };

  // Reset page when filters/sort change
  const trkResetKey = `${pipelineFilter ?? ""}|${trackFilter}|${trkSearch}|${Array.from(trkNms).sort().join(",")}|${Array.from(trkSkus).sort().join(",")}|${trkDateRange?.from?.toISOString() ?? ""}|${trkDateRange?.to?.toISOString() ?? ""}|${trkSort}`;
  useEffect(() => { setTrkPage(1); }, [trkResetKey]);

  const trkTotalPages = Math.max(1, Math.ceil(filteredShipments.length / TRK_PAGE_SIZE));
  const trkPageSafe = Math.min(trkPage, trkTotalPages);
  const pagedShipments = useMemo(
    () => filteredShipments.slice((trkPageSafe - 1) * TRK_PAGE_SIZE, trkPageSafe * TRK_PAGE_SIZE),
    [filteredShipments, trkPageSafe]
  );

  // ── Bulk-select helpers (tracking) ──
  // Auto-prune selection when filters change so it never references hidden rows
  useEffect(() => {
    setTrkSelected((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(filteredShipments.map((s: any) => s.asn));
      const next = new Set<string>();
      prev.forEach((id) => visible.has(id) && next.add(id));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredShipments]);

  const pageAsns = useMemo(() => pagedShipments.map((s: any) => s.asn), [pagedShipments]);
  const pageAllSelected = pageAsns.length > 0 && pageAsns.every((a) => trkSelected.has(a));
  const pageSomeSelected = pageAsns.some((a) => trkSelected.has(a));

  const togglePageSelection = () => {
    setTrkSelected((prev) => {
      const next = new Set(prev);
      if (pageAllSelected) pageAsns.forEach((a) => next.delete(a));
      else pageAsns.forEach((a) => next.add(a));
      return next;
    });
  };
  const toggleRowSelection = (asn: string) => {
    setTrkSelected((prev) => {
      const next = new Set(prev);
      next.has(asn) ? next.delete(asn) : next.add(asn);
      return next;
    });
  };
  const selectAllFiltered = () => setTrkSelected(new Set(filteredShipments.map((s: any) => s.asn)));
  const clearSelection = () => setTrkSelected(new Set());

  const selectedShipments = useMemo(
    () => filteredShipments.filter((s: any) => trkSelected.has(s.asn)),
    [filteredShipments, trkSelected]
  );

  // Bulk action: mark received
  const [bulkReceiveOpen, setBulkReceiveOpen] = useState(false);
  const performBulkReceive = () => {
    const eligible = selectedShipments.filter((s: any) => s.currentStage !== "received");
    if (eligible.length === 0) {
      toast.info("Tất cả shipment đã chọn đều đã ở trạng thái Received");
      setBulkReceiveOpen(false);
      return;
    }
    setStatusOverrides((prev) => {
      const next = { ...prev };
      eligible.forEach((s: any) => { next[s.rpo] = "received"; });
      return next;
    });
    toast.success(`Đã đánh dấu Received cho ${eligible.length} shipment`, {
      description: selectedShipments.length > eligible.length
        ? `${selectedShipments.length - eligible.length} shipment đã ở trạng thái Received nên bỏ qua`
        : undefined,
    });
    setBulkReceiveOpen(false);
    clearSelection();
  };

  // Bulk action: export CSV
  const exportSelectedCsv = () => {
    if (selectedShipments.length === 0) return;
    const headers = ["ASN", "RPO", "NM", "Destination", "SKU", "Qty (m²)", "Driver", "Driver Phone", "Vehicle", "Vehicle Type", "Carrier", "Carrier Phone", "Origin", "Ship Date", "ETA", "Stage", "Fill %"];
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = selectedShipments.map((s: any) => [
      s.asn, s.rpo, s.nm, s.destination, s.sku, s.qty,
      s.driver, s.driverPhone, s.vehicle, s.vehicleType,
      s.carrier, s.carrierPhone, s.origin, s.shipDate, s.eta,
      s.currentStage, s.fillPct,
    ].map(escape).join(","));
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `shipments_${ts}_${selectedShipments.length}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Đã export ${selectedShipments.length} shipment ra CSV`);
  };

  // Bulk action: download PODs (mock — bundles a manifest of POD URLs since real files don't exist)
  const downloadSelectedPods = () => {
    if (selectedShipments.length === 0) return;
    const withPod = selectedShipments.filter((s: any) => !!s.podUrl);
    if (withPod.length === 0) {
      toast.warning("Không có POD nào trong các shipment đã chọn", {
        description: "POD chỉ tồn tại cho shipment đã ở trạng thái Received",
      });
      return;
    }
    const lines = [
      `# POD Bundle Manifest`,
      `# Generated: ${new Date().toLocaleString("vi-VN")}`,
      `# Tenant: ${tenant}`,
      `# Shipments selected: ${selectedShipments.length}`,
      `# PODs available: ${withPod.length}`,
      ``,
      `ASN\tRPO\tNM\tSKU\tQty\tStage\tPOD File`,
      ...withPod.map((s: any) =>
        `${s.asn}\t${s.rpo}\t${s.nm}\t${s.sku}\t${s.qty}\t${s.currentStage}\t${s.podUrl}`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `pod_manifest_${ts}_${withPod.length}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const skipped = selectedShipments.length - withPod.length;
    toast.success(`Đã chuẩn bị ${withPod.length} POD`, {
      description: skipped > 0 ? `${skipped} shipment chưa có POD nên bỏ qua` : undefined,
    });
  };

  // Lists for tracking filter popovers (derived from current shipments)
  const trkNmList = useMemo(() => Array.from(new Set(shipments.map((s: any) => s.nm))).sort(), [shipments]);
  const trkSkuList = useMemo(() => Array.from(new Set(shipments.map((s: any) => s.sku))).sort(), [shipments]);

  const totalQty = allOrders.reduce((s, o) => s + Number(o.quantity), 0);
  const totalVnd = useMemo(
    () => formatVnd(allOrders.reduce((s, o) => s + Number(o.quantity) * Number(o.unit_price), 0)),
    [allOrders]
  );
  const isEmpty = !poLoading && allOrders.length === 0;

  /* ── Approval actions ── */
  const togglePo = (po: string) => {
    const next = new Set(selectedPos);
    if (next.has(po)) next.delete(po); else next.add(po);
    setSelectedPos(next);
  };
  const selectAllQueue = () => {
    if (selectedPos.size === approvalQueue.length) setSelectedPos(new Set());
    else setSelectedPos(new Set(approvalQueue.map((p) => p.po_number)));
  };

  const confirmApproval = () => {
    if (!pendingApproval) return;
    if (pendingApproval.kind === "reject" && !approvalNote.trim()) {
      toast.error("Lý do từ chối là bắt buộc");
      return;
    }
    const next = { ...statusOverrides };
    pendingApproval.pos.forEach((p) => {
      const cur = effectiveStatus(p);
      if (pendingApproval.kind === "reject") next[p.po_number] = "cancelled";
      else if (cur === "draft") next[p.po_number] = "submitted";
      else if (cur === "submitted") next[p.po_number] = "confirmed";
    });
    setStatusOverrides(next);
    const verb = pendingApproval.kind === "reject" ? "Từ chối" : "Duyệt";
    toast.success(`${verb} ${pendingApproval.pos.length} PO`, {
      description: approvalNote ? `Ghi chú: ${approvalNote}` : `Bởi ${user.name}`,
    });
    setPendingApproval(null);
    setApprovalNote("");
    setSelectedPos(new Set());
  };

  return (
    <AppLayout>
      {ordersBatch.batch && (
        <div className="mb-4">
          <BatchLockBanner
            batch={ordersBatch.batch}
            dismissed={ordersBatch.dismissed}
            onDismiss={ordersBatch.dismiss}
            showQueue={ordersBatch.showQueue}
            onToggleQueue={() => ordersBatch.setShowQueue(!ordersBatch.showQueue)}
            onProcessQueue={(id) => toast.success(`Xử lý queue ${id}`)}
            onCancelQueue={(id) => toast.info(`Hủy queue ${id}`)}
          />
        </div>
      )}

      {ordersConflict && (
        <VersionConflictDialog
          conflict={ordersConflict}
          onReload={clearConflict}
          onForceUpdate={() => { clearConflict(); toast.success("Đã ghi đè. Audit logged."); }}
          onClose={clearConflict}
        />
      )}

      <div className="flex items-center gap-2 mb-1">
        <ScreenHeader title="Orders & Tracking" subtitle="Duyệt PO · Burn-down BPO · Theo dõi shipment chi tiết" />
        <LogicLink tab="daily" node={4} tooltip="Logic PO Release: BPO → RPO → ASN → Received" />
      </div>

      {/* ─── Pipeline rail ─── */}
      {!isEmpty && (
        <div className="mb-5 rounded-card border border-surface-3 bg-gradient-to-br from-surface-0 via-surface-1/40 to-surface-2/60 p-4 shadow-sm">
          {/* Top row: title + actions */}
          <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
            <div>
              <p className="text-caption uppercase text-text-3 tracking-[0.14em] font-medium">Pipeline tổng quan · {tenant}</p>
              <p className="text-table text-text-1 mt-1">
                <span className="text-section-header font-bold tabular-nums text-text-1">{allOrders.length}</span>
                <span className="text-text-3 ml-1 mr-3">PO</span>
                <span className="tabular-nums font-semibold text-text-2">{totalQty.toLocaleString()}</span>
                <span className="text-text-3 ml-1 mr-3">m²</span>
                <span className="tabular-nums font-semibold text-text-2">{totalVnd}</span>
                <span className="text-text-3 ml-1">₫</span>
              </p>
              {pipelineFilter && (
                <button
                  onClick={() => setPipelineFilter(null)}
                  className={cn(
                    "mt-2 inline-flex items-center gap-1.5 rounded-full border pl-2 pr-1 py-0.5 text-caption font-medium transition-colors",
                    stageThemes[pipelineFilter]?.chip
                  )}
                >
                  <FilterIcon className="h-3 w-3" />
                  Đang lọc theo: <span className="font-semibold">{stageLabels[pipelineFilter]}</span>
                  <span className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                    <X className="h-3 w-3" />
                  </span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {approvalQueue.length > 0 && (
                <button
                  onClick={() => setActiveTab("approval")}
                  className="rounded-button bg-warning text-warning-foreground px-3 py-1.5 text-table-sm font-medium flex items-center gap-1.5 hover:opacity-90 shadow-sm"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {approvalQueue.length} PO chờ duyệt
                </button>
              )}
            </div>
          </div>

          {/* Stage cards rail */}
          <div className="flex items-stretch gap-2">
            {stageOrder.map((s, i) => {
              const c = stageCounts[s];
              const isActive = c.count > 0;
              const isSelected = pipelineFilter === s;
              const theme = stageThemes[s];
              const Icon = theme.icon;
              const pctOfTotal = allOrders.length > 0 ? (c.count / allOrders.length) * 100 : 0;
              return (
                <div key={s} className="flex-1 flex items-stretch gap-2">
                  <button
                    onClick={() => isActive && setPipelineFilter(isSelected ? null : s)}
                    disabled={!isActive}
                    className={cn(
                      "group relative flex-1 text-left rounded-card border p-3 transition-all",
                      isActive ? "bg-surface-0 hover:shadow-md cursor-pointer" : "bg-surface-1/40 cursor-not-allowed opacity-60",
                      isSelected
                        ? cn("border-transparent ring-2 ring-offset-2 ring-offset-surface-0 shadow-md", theme.ring)
                        : "border-surface-3"
                    )}
                  >
                    {/* Header: icon + label */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                        isActive ? theme.iconBg : "bg-surface-1",
                      )}>
                        <Icon className={cn("h-3.5 w-3.5", isActive ? theme.iconColor : "text-text-3")} />
                      </div>
                      <p className={cn(
                        "text-caption uppercase tracking-wider font-semibold",
                        isActive ? "text-text-2" : "text-text-3"
                      )}>
                        {stageLabels[s]}
                      </p>
                    </div>

                    {/* Big number */}
                    <p className={cn(
                      "text-section-header font-bold tabular-nums leading-none",
                      isActive ? theme.numberColor : "text-text-3"
                    )}>
                      {c.count}
                    </p>

                    {/* Qty */}
                    <p className="text-caption tabular-nums text-text-3 mt-1">
                      {c.qty.toLocaleString()} m²
                    </p>

                    {/* Mini progress bar (% of total POs) */}
                    <div className="mt-2 h-1 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", isActive ? theme.bar : "bg-surface-3")}
                        style={{ width: `${pctOfTotal}%` }}
                      />
                    </div>
                    <p className="text-caption tabular-nums text-text-3 mt-1">{pctOfTotal.toFixed(0)}% tổng</p>
                  </button>
                  {i < stageOrder.length - 1 && (
                    <div className="flex items-center">
                      <ArrowRight className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-text-2" : "text-surface-3")} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Tabs ─── */}
      <div className="flex items-center gap-1 mb-5 rounded-full border border-surface-3 bg-surface-0 p-0.5 w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setDrillBpo(null); setSelectedPos(new Set()); }}
              className={cn(
                "rounded-full px-4 py-1.5 text-table-sm font-medium transition-colors flex items-center gap-1.5",
                activeTab === t.key ? "bg-gradient-primary text-primary-foreground" : "text-text-2 hover:text-text-1"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {poLoading && (
        <div className="flex items-center gap-2 text-text-3 text-table-sm mb-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu PO...
        </div>
      )}

      {isEmpty && (
        <div className="rounded-card border border-surface-3 bg-surface-2 py-16 flex flex-col items-center gap-4 animate-fade-in">
          <div className="rounded-full bg-surface-1 p-4"><PackageOpen className="h-10 w-10 text-text-3" /></div>
          <div className="text-center space-y-1">
            <p className="text-body font-semibold text-text-1">Chưa có đơn hàng nào</p>
            <p className="text-table text-text-3 max-w-md">
              Tạo PO mới từ DRP hoặc Hub để bắt đầu theo dõi đơn hàng.
            </p>
          </div>
          <button
            onClick={() => navigate("/hub")}
            className="rounded-button bg-gradient-primary text-primary-foreground px-5 py-2.5 text-table-sm font-medium mt-2"
          >
            Đi tới Hub & Commitment
          </button>
        </div>
      )}

      {/* ═══════════════════ TAB 1: APPROVAL ═══════════════════ */}
      {activeTab === "approval" && !isEmpty && (
        <div className="animate-fade-in space-y-4">
          {/* Queue header */}
          {approvalQueue.length > 0 ? (
            <div className="rounded-card border border-warning/30 bg-warning-bg/40">
              <div className="px-4 py-3 border-b border-warning/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedPos.size === approvalQueue.length && approvalQueue.length > 0}
                    onCheckedChange={selectAllQueue}
                    disabled={!canApprove}
                  />
                  <ClipboardCheck className="h-4 w-4 text-warning" />
                  <p className="text-table-sm font-semibold text-text-1">
                    Cần duyệt ngay · {approvalQueue.length} PO
                  </p>
                  {selectedPos.size > 0 && (
                    <span className="text-caption text-text-2">({selectedPos.size} đã chọn)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedPos.size > 0 && canApprove && (
                    <>
                      <button
                        onClick={() => setPendingApproval({
                          kind: "bulk",
                          pos: approvalQueue.filter((p) => selectedPos.has(p.po_number)),
                        })}
                        className="rounded-button bg-success text-success-foreground px-3 py-1.5 text-table-sm font-medium flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Duyệt {selectedPos.size} PO
                      </button>
                      <button
                        onClick={() => setPendingApproval({
                          kind: "reject",
                          pos: approvalQueue.filter((p) => selectedPos.has(p.po_number)),
                        })}
                        className="rounded-button bg-danger-bg text-danger px-3 py-1.5 text-table-sm font-medium"
                      >
                        Từ chối
                      </button>
                    </>
                  )}
                  {!canApprove && (
                    <span className="text-caption text-text-3">Chỉ SC Manager có quyền duyệt</span>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-warning/20 bg-warning-bg/30">
                      <th className="w-10 px-3 py-2"></th>
                      {["PO#", "Type", "NM", "Item", "Qty m²", "Trạng thái", "Action"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-table-header uppercase text-text-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {approvalQueue.map((po) => {
                      const st = effectiveStatus(po);
                      const type = po.po_number.startsWith("TO-") ? "TO" : "RPO";
                      const tb = getPoTypeBadge(type as any);
                      const nextLabel = st === "draft" ? "Submit" : "Confirm";
                      return (
                        <tr key={po.po_number} className="border-b border-warning/10 hover:bg-warning-bg/20">
                          <td className="px-3 py-2.5">
                            <Checkbox
                              checked={selectedPos.has(po.po_number)}
                              onCheckedChange={() => togglePo(po.po_number)}
                              disabled={!canApprove}
                            />
                          </td>
                          <td className={cn("px-3 py-2.5", poNumClasses, tb.text)}>{po.po_number}</td>
                          <td className="px-3 py-2.5">
                            <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium", tb.bg, tb.text)}>{type}</span>
                          </td>
                          <td className="px-3 py-2.5 text-table text-text-2">{supplierToNm[po.supplier] || po.supplier}</td>
                          <td className="px-3 py-2.5 text-table text-text-2">{po.sku}</td>
                          <td className="px-3 py-2.5 text-table tabular-nums text-text-1">{Number(po.quantity).toLocaleString()}</td>
                          <td className="px-3 py-2.5">
                            <span className="rounded-full px-2 py-0.5 text-caption font-medium bg-warning-bg text-warning">{stageLabels[st]}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            {canApprove && (
                              <button
                                onClick={() => setPendingApproval({ kind: "approve", pos: [po] })}
                                className="rounded-button bg-gradient-primary text-primary-foreground px-2.5 py-1 text-caption font-medium flex items-center gap-1"
                              >
                                <Send className="h-3 w-3" /> {nextLabel}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-card border border-success/30 bg-success-bg/30 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <p className="text-table-sm text-text-1">Tất cả PO đã được duyệt. Không có PO chờ trong queue.</p>
            </div>
          )}

          {/* All POs reference table */}
          {(() => {
            const filteredPos = pipelineFilter
              ? allOrders.filter((po) => effectiveStatus(po) === pipelineFilter)
              : allOrders;
            return (
          <div className="rounded-card border border-surface-3 bg-surface-2">
            <div className="px-4 py-3 border-b border-surface-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <p className="text-table-sm font-semibold text-text-1">
                  {pipelineFilter ? `PO ở trạng thái ${stageLabels[pipelineFilter]}` : "Toàn bộ PO"}
                </p>
                <span className="text-caption text-text-3 tabular-nums">
                  ({filteredPos.length}{pipelineFilter ? `/${allOrders.length}` : ""})
                </span>
                {pipelineFilter && (
                  <button
                    onClick={() => setPipelineFilter(null)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-medium transition-colors",
                      stageThemes[pipelineFilter]?.chip
                    )}
                  >
                    {stageLabels[pipelineFilter]}
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-3 bg-surface-1/50">
                    {["PO#", "Type", "NM", "Item", "Qty m²", "Order date", "ETA", "Trạng thái"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-table-header uppercase text-text-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPos.map((po) => {
                    const st = effectiveStatus(po);
                    const type = po.po_number.startsWith("TO-") ? "TO" : "RPO";
                    const tb = getPoTypeBadge(type as any);
                    const stColor =
                      st === "received" ? "bg-success-bg text-success" :
                      st === "shipped" ? "bg-info-bg text-info" :
                      st === "confirmed" ? "bg-primary/10 text-primary" :
                      st === "cancelled" ? "bg-danger-bg text-danger" :
                      "bg-warning-bg text-warning";
                    return (
                      <tr key={po.po_number} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                        <td className={cn("px-3 py-2.5", poNumClasses, tb.text)}>{po.po_number}</td>
                        <td className="px-3 py-2.5">
                          <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium", tb.bg, tb.text)}>{type}</span>
                        </td>
                        <td className="px-3 py-2.5 text-table text-text-2">{supplierToNm[po.supplier] || po.supplier}</td>
                        <td className="px-3 py-2.5 text-table text-text-2">{po.sku}</td>
                        <td className="px-3 py-2.5 text-table tabular-nums text-text-1">{Number(po.quantity).toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-table text-text-2">{fmtDate(po.order_date)}</td>
                        <td className="px-3 py-2.5 text-table text-text-2">{fmtDate(po.expected_date)}</td>
                        <td className="px-3 py-2.5">
                          <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium", stColor)}>{stageLabels[st]}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
            );
          })()}
        </div>
      )}

      {/* ═══════════════════ TAB 2: BURN-DOWN ═══════════════════ */}
      {activeTab === "burndown" && !isEmpty && (
        <div className="animate-fade-in space-y-3">
          {pipelineFilter && (
            <div className={cn(
              "rounded-card border px-3 py-2 flex items-center gap-2 text-table-sm",
              stageThemes[pipelineFilter]?.chip
            )}>
              <FilterIcon className="h-3.5 w-3.5 shrink-0" />
              <span>Đang lọc theo pipeline: <span className="font-semibold">{stageLabels[pipelineFilter]}</span></span>
              <span className="text-text-3 ml-1">— chỉ hiện NM có line ở stage này</span>
              <button
                onClick={() => setPipelineFilter(null)}
                className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption hover:bg-surface-3/40"
              >
                <X className="h-3 w-3" /> Bỏ lọc
              </button>
            </div>
          )}
          {/* View toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-text-2" />
              <p className="text-table-sm font-semibold text-text-1">BPO Burn-down theo NM</p>
              <LogicTooltip
                title="BPO Burn-down logic"
                content={`BPO Total = Tổng cam kết tháng/quý từ NM\nReleased = RPO đã confirmed/shipped/received\nShipped = ASN đã issue (shipped + received)\nDelivered = Đã nhận về kho (received)\nRemaining = BPO Total − Delivered\nCompletion% = Delivered / BPO Total × 100`}
              />
              <span className="text-caption text-text-3 ml-2">{burnDowns.length} NM</span>
            </div>
            <div className="inline-flex items-center rounded-full border border-surface-3 bg-surface-0 p-0.5">
              <button
                onClick={() => setBurndownView("compact")}
                className={cn(
                  "rounded-full px-3 py-1 text-caption font-medium flex items-center gap-1.5 transition-colors",
                  burndownView === "compact"
                    ? "bg-gradient-primary text-primary-foreground"
                    : "text-text-2 hover:text-text-1"
                )}
                title="View compact: list + stacked bar"
              >
                <LayoutGrid className="h-3 w-3" /> Compact
              </button>
              <button
                onClick={() => setBurndownView("flow")}
                className={cn(
                  "rounded-full px-3 py-1 text-caption font-medium flex items-center gap-1.5 transition-colors",
                  burndownView === "flow"
                    ? "bg-gradient-primary text-primary-foreground"
                    : "text-text-2 hover:text-text-1"
                )}
                title="View E2E flow: 5-stage funnel per BPO"
              >
                <GitBranch className="h-3 w-3" /> E2E Flow
              </button>
            </div>
          </div>

          {/* Filter bar */}
          <div className="rounded-card border border-surface-3 bg-surface-2 p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-3" />
              <Input
                value={bdSearch}
                onChange={(e) => setBdSearch(e.target.value)}
                placeholder="Tìm PO#, NM, SKU..."
                className="h-8 pl-8 text-table-sm bg-surface-0"
              />
            </div>

            {/* NM multi-select */}
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                  "h-8 inline-flex items-center gap-1.5 rounded-button border px-3 text-table-sm transition-colors",
                  bdNms.size > 0
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-surface-3 bg-surface-0 text-text-2 hover:text-text-1"
                )}>
                  <Building2 className="h-3.5 w-3.5" />
                  NM {bdNms.size > 0 && <span className="tabular-nums">({bdNms.size})</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-0">
                <div className="max-h-64 overflow-y-auto py-1">
                  {allNmList.map((nm) => (
                    <button
                      key={nm}
                      onClick={() => {
                        const next = new Set(bdNms);
                        next.has(nm) ? next.delete(nm) : next.add(nm);
                        setBdNms(next);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-table-sm hover:bg-surface-1 text-left"
                    >
                      <Checkbox checked={bdNms.has(nm)} className="pointer-events-none" />
                      <span className="text-text-1">{nm}</span>
                    </button>
                  ))}
                  {allNmList.length === 0 && <p className="px-3 py-2 text-caption text-text-3">Không có NM</p>}
                </div>
              </PopoverContent>
            </Popover>

            {/* SKU multi-select */}
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                  "h-8 inline-flex items-center gap-1.5 rounded-button border px-3 text-table-sm transition-colors",
                  bdSkus.size > 0
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-surface-3 bg-surface-0 text-text-2 hover:text-text-1"
                )}>
                  <Package className="h-3.5 w-3.5" />
                  SKU {bdSkus.size > 0 && <span className="tabular-nums">({bdSkus.size})</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-0">
                <div className="max-h-64 overflow-y-auto py-1">
                  {allSkuList.map((sku) => (
                    <button
                      key={sku}
                      onClick={() => {
                        const next = new Set(bdSkus);
                        next.has(sku) ? next.delete(sku) : next.add(sku);
                        setBdSkus(next);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-table-sm hover:bg-surface-1 text-left"
                    >
                      <Checkbox checked={bdSkus.has(sku)} className="pointer-events-none" />
                      <span className={cn("text-text-1", poNumClasses)}>{sku}</span>
                    </button>
                  ))}
                  {allSkuList.length === 0 && <p className="px-3 py-2 text-caption text-text-3">Không có SKU</p>}
                </div>
              </PopoverContent>
            </Popover>

            {/* Date range (ETA) */}
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                  "h-8 inline-flex items-center gap-1.5 rounded-button border px-3 text-table-sm transition-colors",
                  bdDateRange?.from
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-surface-3 bg-surface-0 text-text-2 hover:text-text-1"
                )}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {bdDateRange?.from ? (
                    bdDateRange.to
                      ? `${format(bdDateRange.from, "dd/MM")} – ${format(bdDateRange.to, "dd/MM")}`
                      : format(bdDateRange.from, "dd/MM/yyyy")
                  ) : "ETA range"}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="range"
                  selected={bdDateRange}
                  onSelect={setBdDateRange}
                  numberOfMonths={2}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {bdActiveFilterCount > 0 && (
              <button
                onClick={clearBdFilters}
                className="h-8 inline-flex items-center gap-1 rounded-button px-2 text-caption text-text-3 hover:text-danger"
              >
                <X className="h-3 w-3" /> Xóa filter ({bdActiveFilterCount})
              </button>
            )}

            {/* Sort dropdown */}
            <div className="ml-auto flex items-center gap-2">
              <Select value={bdSort} onValueChange={(v) => setBdSort(v as typeof bdSort)}>
                <SelectTrigger className="h-8 w-[200px] text-table-sm bg-surface-0">
                  <ArrowUpDown className="h-3.5 w-3.5 text-text-3 mr-1" />
                  <SelectValue placeholder="Sắp xếp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="risk_desc">💰 Revenue at risk (cao → thấp)</SelectItem>
                  <SelectItem value="risk_asc">💰 Revenue at risk (thấp → cao)</SelectItem>
                  <SelectItem value="eta_asc">📅 ETA gần nhất (sớm → muộn)</SelectItem>
                  <SelectItem value="eta_desc">📅 ETA gần nhất (muộn → sớm)</SelectItem>
                  <SelectItem value="completion_asc">📊 Completion % (thấp → cao)</SelectItem>
                  <SelectItem value="completion_desc">📊 Completion % (cao → thấp)</SelectItem>
                  <SelectItem value="nm_asc">🔤 Tên NM (A → Z)</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-caption text-text-3 tabular-nums whitespace-nowrap">
                {filteredBdOrders.length}/{allOrders.length} PO · {burnDowns.length} NM
              </span>
            </div>
          </div>

          {/* Active filter chips */}
          {bdActiveFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 -mt-1 px-1 animate-fade-in">
              <span className="text-caption text-text-3 uppercase tracking-wide mr-0.5">Đang lọc:</span>

              {bdSearch.trim() && (
                <FilterChip
                  icon={Search}
                  label="Tìm"
                  value={`"${bdSearch.trim()}"`}
                  onRemove={() => setBdSearch("")}
                />
              )}

              {Array.from(bdNms).map((nm) => (
                <FilterChip
                  key={`nm-${nm}`}
                  icon={Building2}
                  label="NM"
                  value={nm}
                  onRemove={() => {
                    const next = new Set(bdNms);
                    next.delete(nm);
                    setBdNms(next);
                  }}
                />
              ))}

              {Array.from(bdSkus).map((sku) => (
                <FilterChip
                  key={`sku-${sku}`}
                  icon={Package}
                  label="SKU"
                  value={sku}
                  mono
                  onRemove={() => {
                    const next = new Set(bdSkus);
                    next.delete(sku);
                    setBdSkus(next);
                  }}
                />
              ))}

              {bdDateRange?.from && (
                <FilterChip
                  icon={CalendarIcon}
                  label="ETA"
                  value={
                    bdDateRange.to
                      ? `${format(bdDateRange.from, "dd/MM")} – ${format(bdDateRange.to, "dd/MM")}`
                      : format(bdDateRange.from, "dd/MM/yyyy")
                  }
                  onRemove={() => setBdDateRange(undefined)}
                />
              )}

              {bdActiveFilterCount > 1 && (
                <button
                  onClick={clearBdFilters}
                  className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger-bg/40 px-2 py-0.5 text-caption text-danger hover:bg-danger-bg transition-colors"
                >
                  <X className="h-3 w-3" /> Xóa tất cả
                </button>
              )}
            </div>
          )}

          {burnDowns.length === 0 ? (
            <div className="rounded-card border border-surface-3 bg-surface-2 py-12 flex flex-col items-center gap-3">
              <Filter className="h-8 w-8 text-text-3" />
              <p className="text-table-sm text-text-2">Không có BPO nào khớp với filter hiện tại.</p>
              {bdActiveFilterCount > 0 && (
                <button onClick={clearBdFilters} className="text-table-sm text-primary hover:underline">Xóa toàn bộ filter</button>
              )}
            </div>
          ) : burndownView === "flow" ? (
            <div className="space-y-3">
              {sortedBurnDowns.map((b) => (
                <BpoFlowCard key={b.nm} data={b} />
              ))}
            </div>
          ) : (
          <div className="rounded-card border border-surface-3 bg-surface-2">
            <div className="divide-y divide-surface-3/50">
              {sortedBurnDowns.map((b) => {
                const releasedPct = b.bpoTotal > 0 ? (b.released / b.bpoTotal) * 100 : 0;
                const shippedPct = b.bpoTotal > 0 ? (b.shipped / b.bpoTotal) * 100 : 0;
                const deliveredPct = b.bpoTotal > 0 ? (b.delivered / b.bpoTotal) * 100 : 0;
                return (
                  <button
                    key={b.nm}
                    onClick={() => setDrillBpo(drillBpo === b.nm ? null : b.nm)}
                    className="w-full text-left px-4 py-3 hover:bg-surface-1/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Building2 className="h-4 w-4 text-text-3 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-table font-semibold text-text-1">{b.nm}</p>
                          <p className={cn("text-caption", poNumClasses, "text-text-3")}>{b.bpo} · {b.rpos.length} RPO</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-5 text-table-sm tabular-nums shrink-0">
                        <div className="text-right">
                          <p className="text-caption text-text-3 uppercase">BPO total</p>
                          <p className="font-semibold text-text-1">{b.bpoTotal.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-caption text-text-3 uppercase">Còn lại</p>
                          <p className={cn("font-semibold", b.remaining > 0 ? "text-warning" : "text-success")}>
                            {b.remaining.toLocaleString()}
                          </p>
                        </div>
                        {b.cancelled > 0 && (
                          <div className="text-right" title="Hủy: đã loại khỏi tất cả các bucket funnel">
                            <p className="text-caption text-text-3 uppercase">Hủy</p>
                            <p className="font-semibold text-danger">−{b.cancelled.toLocaleString()}</p>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-caption text-text-3 uppercase">ETA gần</p>
                          <p className={cn(
                            "font-semibold",
                            b.earliestEta === null ? "text-text-3"
                              : b.earliestEta < Date.now() ? "text-danger"
                              : b.earliestEta - Date.now() < 3 * 86400000 ? "text-warning"
                              : "text-text-1"
                          )}>
                            {b.earliestEta === null ? "—" : new Date(b.earliestEta).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-caption text-text-3 uppercase">Risk ₫</p>
                          <p className={cn("font-semibold", b.revenueAtRisk > 0 ? "text-danger" : "text-text-3")}>
                            {b.revenueAtRisk > 0 ? formatVnd(b.revenueAtRisk) : "—"}
                          </p>
                        </div>
                        <div className="text-right w-14">
                          <p className="text-caption text-text-3 uppercase">Done</p>
                          <p className="font-semibold text-text-1">{b.completionPct}%</p>
                        </div>
                        <ChevronRight className={cn("h-4 w-4 text-text-3 transition-transform", drillBpo === b.nm && "rotate-90")} />
                      </div>
                    </div>
                    {/* Stacked progress: delivered (green) | shipped-only (blue) | released-only (primary) | remaining (gray) */}
                    <div className="relative h-2.5 bg-surface-1 rounded-full overflow-hidden flex">
                      <div className="bg-success h-full" style={{ width: `${deliveredPct}%` }} title={`Delivered ${b.delivered.toLocaleString()}`} />
                      <div className="bg-info h-full" style={{ width: `${shippedPct - deliveredPct}%` }} title={`Shipped ${(b.shipped - b.delivered).toLocaleString()}`} />
                      <div className="bg-primary/60 h-full" style={{ width: `${releasedPct - shippedPct}%` }} title={`Released ${(b.released - b.shipped).toLocaleString()}`} />
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-caption text-text-3">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Delivered {b.delivered.toLocaleString()}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-info" /> In-transit {(b.shipped - b.delivered).toLocaleString()}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/60" /> Released {(b.released - b.shipped).toLocaleString()}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-surface-3" /> Còn lại {b.remaining.toLocaleString()}</span>
                    </div>

                    {/* Inline expand: RPO/ASN children */}
                    {drillBpo === b.nm && (
                      <div className="mt-4 rounded-button border border-surface-3 bg-surface-1/40 overflow-hidden animate-fade-in">
                        <div className="px-3 py-2 border-b border-surface-3 flex items-center justify-between">
                          <p className="text-caption text-text-2 uppercase tracking-wide">RPO / ASN children</p>
                          <p className="text-caption text-text-3 tabular-nums">
                            Waterfall: BPO {b.bpoTotal.toLocaleString()} − Delivered {b.delivered.toLocaleString()} = Còn {b.remaining.toLocaleString()}
                            {b.cancelled > 0 && (
                              <span className="ml-2 text-danger">· Hủy −{b.cancelled.toLocaleString()} (loại khỏi BPO)</span>
                            )}
                          </p>
                        </div>
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-surface-3/50 bg-surface-2/50">
                              {["RPO#", "Item", "Qty", "ASN#", "Ship date", "ETA", "Actual", "Status"].map((h) => (
                                <th key={h} className="px-3 py-1.5 text-left text-table-header uppercase text-text-3">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {b.rpos.map((r) => {
                              const rpoBadge = getPoTypeBadge("RPO");
                              const asnBadge = getPoTypeBadge("ASN");
                              const stColor =
                                r.status === "received" ? "bg-success-bg text-success" :
                                r.status === "shipped" ? "bg-info-bg text-info" :
                                r.status === "confirmed" ? "bg-primary/10 text-primary" :
                                "bg-warning-bg text-warning";
                              return (
                                <tr key={r.rpo} className="border-b border-surface-3/30 hover:bg-surface-2/50">
                                  <td className={cn("px-3 py-1.5", poNumClasses, rpoBadge.text)}>{r.rpo}</td>
                                  <td className="px-3 py-1.5 text-table text-text-1">{r.item}</td>
                                  <td className="px-3 py-1.5 text-table tabular-nums text-text-1">{r.qty.toLocaleString()}</td>
                                  <td className="px-3 py-1.5">
                                    {r.asn ? (
                                      <span className={cn("rounded-sm px-1.5 py-0.5", poNumClasses, asnBadge.bg, asnBadge.text)}>{r.asn}</span>
                                    ) : <span className="text-text-3">—</span>}
                                  </td>
                                  <td className={cn("px-3 py-1.5 text-text-2", poNumClasses)}>{r.shipDate}</td>
                                  <td className={cn("px-3 py-1.5 text-text-2", poNumClasses)}>{r.eta}</td>
                                  <td className="px-3 py-1.5 text-table tabular-nums font-medium text-text-1">{r.actual > 0 ? r.actual.toLocaleString() : "—"}</td>
                                  <td className="px-3 py-1.5">
                                    <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium", stColor)}>{stageLabels[r.status]}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          )}
        </div>
      )}

      {/* ═══════════════════ TAB 3: SHIPMENT TRACKING ═══════════════════ */}
      {activeTab === "tracking" && !isEmpty && (
        <div className="animate-fade-in space-y-3">
          {pipelineFilter && (
            <div className={cn(
              "rounded-card border px-3 py-2 flex items-center gap-2 text-table-sm",
              stageThemes[pipelineFilter]?.chip
            )}>
              <FilterIcon className="h-3.5 w-3.5 shrink-0" />
              <span>Đang lọc theo pipeline: <span className="font-semibold">{stageLabels[pipelineFilter]}</span></span>
              {!["confirmed", "shipped", "received"].includes(pipelineFilter) && (
                <span className="text-warning ml-1">— shipment chỉ tồn tại từ stage Confirmed</span>
              )}
              <button
                onClick={() => setPipelineFilter(null)}
                className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption hover:bg-surface-3/40"
              >
                <X className="h-3 w-3" /> Bỏ lọc
              </button>
            </div>
          )}
          {/* Header + count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-text-2" />
              <p className="text-table-sm font-semibold text-text-1">Shipment Tracking</p>
              <LogicTooltip
                title="Shipment tracking logic"
                content={`Mỗi shipment = 1 ASN gắn với RPO ở trạng thái confirmed/shipped/received\nETA tone: danger nếu quá hạn, warning ≤12h, success khi đã nhận\nTiến trình: picked → loaded → in_transit → at_gate → received`}
              />
              <span className="text-caption text-text-3 ml-2">{shipments.length} shipment</span>
            </div>
          </div>

          {/* Quick status chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {([
              { k: "all", l: `Tất cả (${shipments.length})` },
              { k: "in_transit", l: `Đang vận chuyển (${shipments.filter(s => s.currentStage === "in_transit" || s.currentStage === "loaded").length})` },
              { k: "overdue", l: `Quá ETA (${shipments.filter(s => s.etaCountdownH !== undefined && s.etaCountdownH < 0).length})` },
              { k: "received", l: `Đã nhận (${shipments.filter(s => s.currentStage === "received").length})` },
            ] as const).map((f) => (
              <button
                key={f.k}
                onClick={() => setTrackFilter(f.k)}
                className={cn(
                  "rounded-full px-3 py-1 text-caption font-medium transition-colors",
                  trackFilter === f.k
                    ? "bg-gradient-primary text-primary-foreground"
                    : "bg-surface-1 text-text-2 hover:text-text-1"
                )}
              >
                {f.l}
              </button>
            ))}
          </div>

          {/* Filter bar (mirrors Burn-down) */}
          <div className="rounded-card border border-surface-3 bg-surface-2 p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-3" />
              <Input
                value={trkSearch}
                onChange={(e) => setTrkSearch(e.target.value)}
                placeholder="Tìm ASN, RPO, NM, SKU, tài xế, xe..."
                className="h-8 pl-8 text-table-sm bg-surface-0"
              />
            </div>

            {/* NM multi-select */}
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                  "h-8 inline-flex items-center gap-1.5 rounded-button border px-3 text-table-sm transition-colors",
                  trkNms.size > 0
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-surface-3 bg-surface-0 text-text-2 hover:text-text-1"
                )}>
                  <Building2 className="h-3.5 w-3.5" />
                  NM {trkNms.size > 0 && <span className="tabular-nums">({trkNms.size})</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-0">
                <div className="max-h-64 overflow-y-auto py-1">
                  {trkNmList.map((nm) => (
                    <button
                      key={nm}
                      onClick={() => {
                        const next = new Set(trkNms);
                        next.has(nm) ? next.delete(nm) : next.add(nm);
                        setTrkNms(next);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-table-sm hover:bg-surface-1 text-left"
                    >
                      <Checkbox checked={trkNms.has(nm)} className="pointer-events-none" />
                      <span className="text-text-1">{nm}</span>
                    </button>
                  ))}
                  {trkNmList.length === 0 && <p className="px-3 py-2 text-caption text-text-3">Không có NM</p>}
                </div>
              </PopoverContent>
            </Popover>

            {/* SKU multi-select */}
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                  "h-8 inline-flex items-center gap-1.5 rounded-button border px-3 text-table-sm transition-colors",
                  trkSkus.size > 0
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-surface-3 bg-surface-0 text-text-2 hover:text-text-1"
                )}>
                  <Package className="h-3.5 w-3.5" />
                  SKU {trkSkus.size > 0 && <span className="tabular-nums">({trkSkus.size})</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-0">
                <div className="max-h-64 overflow-y-auto py-1">
                  {trkSkuList.map((sku) => (
                    <button
                      key={sku}
                      onClick={() => {
                        const next = new Set(trkSkus);
                        next.has(sku) ? next.delete(sku) : next.add(sku);
                        setTrkSkus(next);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-table-sm hover:bg-surface-1 text-left"
                    >
                      <Checkbox checked={trkSkus.has(sku)} className="pointer-events-none" />
                      <span className={cn("text-text-1", poNumClasses)}>{sku}</span>
                    </button>
                  ))}
                  {trkSkuList.length === 0 && <p className="px-3 py-2 text-caption text-text-3">Không có SKU</p>}
                </div>
              </PopoverContent>
            </Popover>

            {/* Date range (ETA) */}
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                  "h-8 inline-flex items-center gap-1.5 rounded-button border px-3 text-table-sm transition-colors",
                  trkDateRange?.from
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-surface-3 bg-surface-0 text-text-2 hover:text-text-1"
                )}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {trkDateRange?.from ? (
                    trkDateRange.to
                      ? `${format(trkDateRange.from, "dd/MM")} – ${format(trkDateRange.to, "dd/MM")}`
                      : format(trkDateRange.from, "dd/MM/yyyy")
                  ) : "ETA range"}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="range"
                  selected={trkDateRange}
                  onSelect={setTrkDateRange}
                  numberOfMonths={2}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {trkActiveFilterCount > 0 && (
              <button
                onClick={clearTrkFilters}
                className="h-8 inline-flex items-center gap-1 rounded-button px-2 text-caption text-text-3 hover:text-danger"
              >
                <X className="h-3 w-3" /> Xóa filter ({trkActiveFilterCount})
              </button>
            )}

            {/* Sort */}
            <div className="ml-auto flex items-center gap-2">
              <Select value={trkSort} onValueChange={(v) => setTrkSort(v as typeof trkSort)}>
                <SelectTrigger className="h-8 w-[200px] text-table-sm bg-surface-0">
                  <ArrowUpDown className="h-3.5 w-3.5 text-text-3 mr-1" />
                  <SelectValue placeholder="Sắp xếp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eta_asc">📅 ETA gần nhất (sớm → muộn)</SelectItem>
                  <SelectItem value="eta_desc">📅 ETA xa nhất (muộn → sớm)</SelectItem>
                  <SelectItem value="stage_desc">🚚 Tiến trình (cao → thấp)</SelectItem>
                  <SelectItem value="stage_asc">🚚 Tiến trình (thấp → cao)</SelectItem>
                  <SelectItem value="qty_desc">📦 Qty (lớn → nhỏ)</SelectItem>
                  <SelectItem value="nm_asc">🔤 Tên NM (A → Z)</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-caption text-text-3 tabular-nums whitespace-nowrap">
                {filteredShipments.length}/{shipments.length} shipment
              </span>
            </div>
          </div>

          {/* Active filter chips */}
          {trkActiveFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 -mt-1 px-1 animate-fade-in">
              <span className="text-caption text-text-3 uppercase tracking-wide mr-0.5">Đang lọc:</span>
              {trkSearch.trim() && (
                <FilterChip icon={Search} label="Tìm" value={`"${trkSearch.trim()}"`} onRemove={() => setTrkSearch("")} />
              )}
              {Array.from(trkNms).map((nm) => (
                <FilterChip
                  key={`tnm-${nm}`}
                  icon={Building2}
                  label="NM"
                  value={nm}
                  onRemove={() => { const next = new Set(trkNms); next.delete(nm); setTrkNms(next); }}
                />
              ))}
              {Array.from(trkSkus).map((sku) => (
                <FilterChip
                  key={`tsku-${sku}`}
                  icon={Package}
                  label="SKU"
                  value={sku}
                  mono
                  onRemove={() => { const next = new Set(trkSkus); next.delete(sku); setTrkSkus(next); }}
                />
              ))}
              {trkDateRange?.from && (
                <FilterChip
                  icon={CalendarIcon}
                  label="ETA"
                  value={trkDateRange.to ? `${format(trkDateRange.from, "dd/MM")} – ${format(trkDateRange.to, "dd/MM")}` : format(trkDateRange.from, "dd/MM/yyyy")}
                  onRemove={() => setTrkDateRange(undefined)}
                />
              )}
              {trkActiveFilterCount > 1 && (
                <button
                  onClick={clearTrkFilters}
                  className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger-bg/40 px-2 py-0.5 text-caption text-danger hover:bg-danger-bg transition-colors"
                >
                  <X className="h-3 w-3" /> Xóa tất cả
                </button>
              )}
            </div>
          )}

          {filteredShipments.length === 0 ? (
            <div className="rounded-card border border-surface-3 bg-surface-2 py-12 flex flex-col items-center gap-3">
              <Filter className="h-8 w-8 text-text-3" />
              <p className="text-table-sm text-text-2">Không có shipment nào khớp với filter hiện tại.</p>
              {trkActiveFilterCount > 0 && (
                <button onClick={clearTrkFilters} className="text-table-sm text-primary hover:underline">Xóa toàn bộ filter</button>
              )}
            </div>
          ) : (
            <>
              {/* Bulk action toolbar — only when selection exists */}
              {trkSelected.size > 0 && (
                <div className="rounded-card border border-primary/40 bg-primary/5 px-3 py-2 flex flex-wrap items-center gap-2 animate-fade-in sticky top-0 z-10 shadow-sm">
                  <div className="flex items-center gap-2 mr-1">
                    <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-full bg-primary text-primary-foreground text-caption font-semibold tabular-nums">
                      {trkSelected.size}
                    </span>
                    <span className="text-table-sm text-text-1 font-medium">
                      shipment đã chọn
                    </span>
                    {trkSelected.size < filteredShipments.length && (
                      <button
                        onClick={selectAllFiltered}
                        className="text-caption text-primary hover:underline ml-1"
                      >
                        Chọn tất cả {filteredShipments.length}
                      </button>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={exportSelectedCsv}
                      className="h-8 inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-0 px-3 text-table-sm text-text-1 hover:bg-surface-1"
                    >
                      <Download className="h-3.5 w-3.5" /> Export CSV
                    </button>
                    <button
                      onClick={downloadSelectedPods}
                      className="h-8 inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-0 px-3 text-table-sm text-text-1 hover:bg-surface-1"
                    >
                      <FileText className="h-3.5 w-3.5" /> Tải POD
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => setBulkReceiveOpen(true)}
                        className="h-8 inline-flex items-center gap-1.5 rounded-button bg-success text-success-foreground px-3 text-table-sm font-medium hover:opacity-90"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Đánh dấu đã nhận
                      </button>
                    )}
                    <button
                      onClick={clearSelection}
                      className="h-8 inline-flex items-center gap-1 rounded-button px-2 text-caption text-text-3 hover:text-danger"
                      aria-label="Bỏ chọn"
                    >
                      <X className="h-3.5 w-3.5" /> Bỏ chọn
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-card border border-surface-3 bg-surface-2">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-3 bg-surface-1/50">
                        <th className="px-3 py-2 w-9">
                          <Checkbox
                            checked={pageAllSelected ? true : pageSomeSelected ? "indeterminate" : false}
                            onCheckedChange={togglePageSelection}
                            aria-label="Chọn tất cả trong trang"
                          />
                        </th>
                        {["ASN#", "RPO#", "NM → CN", "Tài xế / SDT", "Xe / Carrier", "SKU · Qty", "ETA", "Tiến trình", ""].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-table-header uppercase text-text-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedShipments.map((s: any) => {
                        const asnBadge = getPoTypeBadge("ASN");
                        const rpoBadge = getPoTypeBadge("RPO");
                        const tone = etaTone(s.etaCountdownH);
                        const toneClass =
                          tone === "danger" ? "bg-danger-bg text-danger" :
                          tone === "warning" ? "bg-warning-bg text-warning" :
                          tone === "success" ? "bg-success-bg text-success" :
                          "bg-surface-1 text-text-3";
                        const currentIdx = ["picked", "loaded", "in_transit", "at_gate", "received"].indexOf(s.currentStage);
                        const isSelected = trkSelected.has(s.asn);
                        return (
                          <tr
                            key={s.asn}
                            className={cn(
                              "border-b border-surface-3/50 cursor-pointer transition-colors",
                              isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-surface-1/30"
                            )}
                            onClick={() => setOpenShipment(s)}
                          >
                            <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleRowSelection(s.asn)}
                                aria-label={`Chọn ${s.asn}`}
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={cn("rounded-sm px-1.5 py-0.5", poNumClasses, asnBadge.bg, asnBadge.text)}>{s.asn}</span>
                            </td>
                            <td className={cn("px-3 py-2.5", poNumClasses, rpoBadge.text)}>{s.rpo}</td>
                            <td className="px-3 py-2.5 text-table text-text-2">
                              <span className="text-text-1">{s.nm}</span>
                              <ArrowRight className="inline h-3 w-3 mx-1 text-text-3" />
                              {s.destination}
                            </td>
                            <td className="px-3 py-2.5">
                              <p className="text-table text-text-1">{s.driver}</p>
                              <p className={cn("text-caption text-text-3", poNumClasses)}>{s.driverPhone}</p>
                            </td>
                            <td className="px-3 py-2.5">
                              <p className={cn("text-table text-text-1", poNumClasses)}>{s.vehicle}</p>
                              <p className="text-caption text-text-3">{s.carrier}</p>
                            </td>
                            <td className="px-3 py-2.5">
                              <p className="text-table text-text-1">{s.sku}</p>
                              <p className="text-caption tabular-nums text-text-3">{s.qty.toLocaleString()} m²</p>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium", toneClass)}>
                                {etaLabel(s.etaCountdownH)}
                              </span>
                              <p className={cn("text-caption text-text-3 mt-0.5", poNumClasses)}>ETA {s.eta}</p>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-0.5">
                                {["picked", "loaded", "in_transit", "at_gate", "received"].map((stg, i) => (
                                  <div
                                    key={stg}
                                    className={cn(
                                      "h-1.5 w-6 rounded-full",
                                      i <= currentIdx ? (s.currentStage === "received" ? "bg-success" : "bg-info") : "bg-surface-1"
                                    )}
                                  />
                                ))}
                              </div>
                              <p className="text-caption text-text-3 mt-0.5 capitalize">{s.currentStage.replace("_", " ")}</p>
                            </td>
                            <td className="px-3 py-2.5"><ChevronRight className="h-4 w-4 text-text-3" /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="text-caption text-text-3 tabular-nums">
                  Hiển thị <span className="text-text-1 font-medium">{(trkPageSafe - 1) * TRK_PAGE_SIZE + 1}</span>–
                  <span className="text-text-1 font-medium">{Math.min(trkPageSafe * TRK_PAGE_SIZE, filteredShipments.length)}</span>
                  {" "}/ {filteredShipments.length} shipment
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTrkPage(1)}
                    disabled={trkPageSafe === 1}
                    className="h-8 px-2 rounded-button border border-surface-3 bg-surface-0 text-caption text-text-2 hover:text-text-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    « Đầu
                  </button>
                  <button
                    onClick={() => setTrkPage((p) => Math.max(1, p - 1))}
                    disabled={trkPageSafe === 1}
                    className="h-8 px-2 rounded-button border border-surface-3 bg-surface-0 text-caption text-text-2 hover:text-text-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ‹ Trước
                  </button>
                  <span className="px-2 text-caption text-text-2 tabular-nums">
                    Trang <span className="text-text-1 font-medium">{trkPageSafe}</span> / {trkTotalPages}
                  </span>
                  <button
                    onClick={() => setTrkPage((p) => Math.min(trkTotalPages, p + 1))}
                    disabled={trkPageSafe === trkTotalPages}
                    className="h-8 px-2 rounded-button border border-surface-3 bg-surface-0 text-caption text-text-2 hover:text-text-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Sau ›
                  </button>
                  <button
                    onClick={() => setTrkPage(trkTotalPages)}
                    disabled={trkPageSafe === trkTotalPages}
                    className="h-8 px-2 rounded-button border border-surface-3 bg-surface-0 text-caption text-text-2 hover:text-text-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Cuối »
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Shipment detail drawer ─── */}
      <Sheet open={!!openShipment} onOpenChange={(o) => !o && setOpenShipment(null)}>
        <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto p-0">
          {openShipment && (
            <div className="flex flex-col h-full">
              <SheetHeader className="px-5 py-4 border-b border-surface-3 bg-surface-1/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <SheetTitle className="font-display text-section-header">Shipment {openShipment.asn}</SheetTitle>
                    <p className={cn("text-caption text-text-3 mt-1", poNumClasses)}>RPO {openShipment.rpo}</p>
                  </div>
                  <span className={cn(
                    "rounded-full px-2.5 py-1 text-caption font-medium shrink-0",
                    openShipment.currentStage === "received" ? "bg-success-bg text-success" :
                    openShipment.currentStage === "in_transit" ? "bg-info-bg text-info" :
                    "bg-warning-bg text-warning"
                  )}>
                    {openShipment.currentStage.replace("_", " ").toUpperCase()}
                  </span>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                {/* ETA banner */}
                <div className={cn(
                  "rounded-card border p-3 flex items-center gap-3",
                  etaTone(openShipment.etaCountdownH) === "danger" ? "border-danger/30 bg-danger-bg/40" :
                  etaTone(openShipment.etaCountdownH) === "warning" ? "border-warning/30 bg-warning-bg/40" :
                  "border-success/30 bg-success-bg/30"
                )}>
                  <Clock className="h-5 w-5 text-text-2" />
                  <div className="flex-1">
                    <p className="text-caption text-text-3 uppercase">ETA</p>
                    <p className="text-table-sm font-semibold text-text-1">{openShipment.eta} · {etaLabel(openShipment.etaCountdownH)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-caption text-text-3 uppercase">Ship date</p>
                    <p className={cn("text-table-sm font-semibold text-text-1", poNumClasses)}>{openShipment.shipDate}</p>
                  </div>
                </div>

                {/* ASN ↔ RPO breakdown */}
                <div className="rounded-card border border-surface-3 bg-surface-1/30 overflow-hidden">
                  <div className="px-3 py-2 border-b border-surface-3 bg-surface-2/40 flex items-center gap-2">
                    <PackageOpen className="h-3.5 w-3.5 text-text-2" />
                    <p className="text-caption text-text-3 uppercase tracking-wide">Cấu trúc lô hàng</p>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-surface-3">
                    <div className="p-3 space-y-1">
                      <p className="text-caption text-text-3 uppercase">ASN</p>
                      <p className={cn("text-table-sm font-semibold text-text-1", poNumClasses)}>{openShipment.asn}</p>
                      <p className="text-caption text-text-3">Phiếu giao hàng</p>
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-caption text-text-3 uppercase">RPO nguồn</p>
                      <p className={cn("text-table-sm font-semibold text-text-1", poNumClasses)}>{openShipment.rpo}</p>
                      <p className="text-caption text-text-3">{(openShipment as any).nm ?? "—"}</p>
                    </div>
                  </div>
                  <div className="border-t border-surface-3 px-3 py-2.5 bg-surface-2/20">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-caption text-text-3 uppercase">Mặt hàng</p>
                      <span className="text-caption text-text-3">{openShipment.vehicleType}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-table-sm font-medium text-text-1 truncate">{(openShipment as any).sku ?? "—"}</p>
                      <p className={cn("text-table-sm font-semibold text-text-1 tabular-nums shrink-0", poNumClasses)}>
                        {Number((openShipment as any).qty ?? 0).toLocaleString()} m²
                      </p>
                    </div>
                    {/* Fill progress */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-caption text-text-3">Tỷ lệ lấp đầy xe</span>
                        <span className={cn("text-caption font-medium tabular-nums",
                          openShipment.fillPct >= 85 ? "text-success" :
                          openShipment.fillPct >= 65 ? "text-info" : "text-warning"
                        )}>{openShipment.fillPct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all",
                            openShipment.fillPct >= 85 ? "bg-success" :
                            openShipment.fillPct >= 65 ? "bg-info" : "bg-warning"
                          )}
                          style={{ width: `${openShipment.fillPct}%` }}
                        />
                      </div>
                    </div>
                    {openShipment.temperature && (
                      <p className="text-caption text-text-3 mt-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {openShipment.temperature}
                      </p>
                    )}
                  </div>
                </div>

                {/* Route */}
                <div className="rounded-card border border-surface-3 bg-surface-1/30 p-3">
                  <p className="text-caption text-text-3 uppercase mb-2">Tuyến đường</p>
                  <div className="flex items-center gap-2 text-table text-text-1">
                    <MapPin className="h-4 w-4 text-text-3" />
                    <span>{openShipment.origin}</span>
                    <ArrowRight className="h-4 w-4 text-text-3 mx-1" />
                    <span>{openShipment.destination}</span>
                  </div>
                </div>

                {/* Driver / Vehicle */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-card border border-surface-3 bg-surface-1/30 p-3 space-y-1.5">
                    <p className="text-caption text-text-3 uppercase">Tài xế</p>
                    <div className="flex items-center gap-2 text-table text-text-1"><User className="h-3.5 w-3.5 text-text-3" /> {openShipment.driver}</div>
                    <a href={`tel:${openShipment.driverPhone}`} className={cn("flex items-center gap-2 text-table-sm text-primary hover:underline", poNumClasses)}>
                      <Phone className="h-3.5 w-3.5" /> {openShipment.driverPhone}
                    </a>
                  </div>
                  <div className="rounded-card border border-surface-3 bg-surface-1/30 p-3 space-y-1.5">
                    <p className="text-caption text-text-3 uppercase">Xe</p>
                    <p className={cn("text-table text-text-1", poNumClasses)}>{openShipment.vehicle}</p>
                    <p className="text-caption text-text-3">{openShipment.vehicleType} · Fill {openShipment.fillPct}%</p>
                  </div>
                </div>

                <div className="rounded-card border border-surface-3 bg-surface-1/30 p-3 space-y-1.5">
                  <p className="text-caption text-text-3 uppercase">Nhà vận tải</p>
                  <div className="flex items-center gap-2 text-table text-text-1"><Truck className="h-3.5 w-3.5 text-text-3" /> {openShipment.carrier}</div>
                  <a href={`tel:${openShipment.carrierPhone}`} className={cn("flex items-center gap-2 text-table-sm text-primary hover:underline", poNumClasses)}>
                    <Phone className="h-3.5 w-3.5" /> {openShipment.carrierPhone}
                  </a>
                </div>

                {/* Timeline */}
                <div>
                  <p className="text-caption text-text-3 uppercase mb-3">Tiến trình giao nhận</p>
                  <div className="space-y-3">
                    {openShipment.events.map((ev, i) => {
                      const isLast = i === openShipment.events.length - 1;
                      return (
                        <div key={ev.stage} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              "h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0",
                              ev.done ? "bg-success border-success" : "bg-surface-1 border-surface-3"
                            )}>
                              {ev.done && <CheckCircle2 className="h-3.5 w-3.5 text-success-foreground" />}
                            </div>
                            {!isLast && <div className={cn("w-0.5 flex-1 my-1", ev.done ? "bg-success" : "bg-surface-3")} style={{ minHeight: 18 }} />}
                          </div>
                          <div className="flex-1 pb-2">
                            <div className="flex items-center justify-between">
                              <p className={cn("text-table-sm font-medium", ev.done ? "text-text-1" : "text-text-3")}>{ev.label}</p>
                              <p className={cn("text-caption tabular-nums", ev.done ? "text-text-2" : "text-text-3")}>{ev.ts}</p>
                            </div>
                            {ev.note && <p className="text-caption text-text-3 mt-0.5">{ev.note}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* POD upload — full process panel */}
                <PodUploadPanel
                  asn={openShipment.asn}
                  rpo={openShipment.rpo}
                  canEdit={canEdit}
                  existingPodUrl={openShipment.podUrl}
                />
              </div>

              <div className="border-t border-surface-3 px-5 py-3 flex justify-end bg-surface-1/30">
                <button
                  onClick={() => setOpenShipment(null)}
                  className="rounded-button border border-surface-3 bg-surface-2 px-4 py-2 text-table-sm text-text-2 hover:bg-surface-1"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── Approval confirmation ─── */}
      <AlertDialog open={!!pendingApproval} onOpenChange={(o) => !o && setPendingApproval(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingApproval?.kind === "reject" ? "Từ chối PO" :
               pendingApproval?.kind === "bulk" ? `Duyệt ${pendingApproval.pos.length} PO` :
               "Duyệt PO"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-table-sm text-text-2">
                <p>
                  {pendingApproval?.kind === "reject"
                    ? "Hành động này sẽ chuyển các PO sang trạng thái Cancelled. Lý do là bắt buộc."
                    : "Xác nhận chuyển PO sang trạng thái tiếp theo trong pipeline."}
                </p>
                {pendingApproval && (
                  <div className="rounded-button bg-surface-1 p-2 max-h-32 overflow-y-auto">
                    {pendingApproval.pos.slice(0, 5).map((p) => (
                      <p key={p.po_number} className={cn("text-caption", poNumClasses, "text-text-1")}>{p.po_number} · {p.sku} · {Number(p.quantity).toLocaleString()} m²</p>
                    ))}
                    {pendingApproval.pos.length > 5 && (
                      <p className="text-caption text-text-3 mt-1">… và {pendingApproval.pos.length - 5} PO khác</p>
                    )}
                  </div>
                )}
                <div>
                  <label className="text-caption text-text-3 uppercase">
                    Ghi chú {pendingApproval?.kind === "reject" && <span className="text-danger">*</span>}
                  </label>
                  <Textarea
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    placeholder={pendingApproval?.kind === "reject" ? "Lý do từ chối..." : "Ghi chú (tuỳ chọn)..."}
                    className="mt-1 min-h-[72px]"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setPendingApproval(null); setApprovalNote(""); }}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApproval}
              className={pendingApproval?.kind === "reject" ? "bg-danger text-danger-foreground hover:bg-danger/90" : ""}
            >
              {pendingApproval?.kind === "reject" ? "Xác nhận từ chối" : "Xác nhận duyệt"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Bulk mark-received confirmation ─── */}
      <AlertDialog open={bulkReceiveOpen} onOpenChange={setBulkReceiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đánh dấu Received cho {selectedShipments.length} shipment</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-table-sm text-text-2">
                <p>
                  Hành động này sẽ chuyển trạng thái RPO tương ứng sang <span className="font-medium text-success">Received</span>{" "}
                  và đóng vòng đời shipment. Không thể hoàn tác từ giao diện này.
                </p>
                <div className="rounded-button bg-surface-1 p-2 max-h-40 overflow-y-auto">
                  {selectedShipments.slice(0, 6).map((s: any) => (
                    <p key={s.asn} className={cn("text-caption", poNumClasses, "text-text-1")}>
                      {s.asn} → {s.rpo} · {s.sku} · {Number(s.qty).toLocaleString()} m²
                      {s.currentStage === "received" && <span className="ml-2 text-success">[đã received]</span>}
                    </p>
                  ))}
                  {selectedShipments.length > 6 && (
                    <p className="text-caption text-text-3 mt-1">… và {selectedShipments.length - 6} shipment khác</p>
                  )}
                </div>
                {selectedShipments.some((s: any) => s.currentStage === "received") && (
                  <p className="text-caption text-warning">
                    ⚠ Một số shipment đã ở trạng thái Received sẽ được bỏ qua tự động.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={performBulkReceive}
              className="bg-success text-success-foreground hover:opacity-90"
            >
              Xác nhận đánh dấu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ScreenFooter actionCount={10} />
    </AppLayout>
  );
}

/* ─────────── FilterChip ─────────── */
function FilterChip({
  icon: Icon,
  label,
  value,
  onRemove,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onRemove: () => void;
  mono?: boolean;
}) {
  return (
    <span className="group inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 pl-2 pr-1 py-0.5 text-caption text-primary transition-colors hover:bg-primary/15">
      <Icon className="h-3 w-3 shrink-0" />
      <span className="text-text-3 uppercase tracking-wide">{label}:</span>
      <span className={cn("font-medium text-text-1 max-w-[160px] truncate", mono && poNumClasses)} title={value}>
        {value}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label={`Xóa filter ${label}: ${value}`}
        className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-text-3 hover:bg-danger/15 hover:text-danger transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
