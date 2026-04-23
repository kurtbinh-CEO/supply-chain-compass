import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { toast } from "sonner";
import {
  Check, Upload, Truck, Download, AlertTriangle,
  CheckCircle2, Loader2, FileSpreadsheet, ChevronRight, Clock, Factory,
} from "lucide-react";
import { TermTooltip } from "@/components/TermTooltip";
import { ClickableNumber } from "@/components/ClickableNumber";
import { VoiceInput } from "@/components/VoiceInput";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { poNumClasses } from "@/lib/po-numbers";
import {
  PoLifecycleStepper,
  type LifecycleStage,
} from "@/components/orders/PoLifecycleStepper";
import {
  FACTORIES, NM_COMMITMENTS, NM_INVENTORY,
  type CommitmentTier, type NmId,
} from "@/data/unis-enterprise-dataset";
import { NmCounterHistoryPanel } from "@/components/supply/NmCounterHistoryPanel";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Portal scope: 1 NM = TOKO (logged-in supplier identity)                   */
/* ─────────────────────────────────────────────────────────────────────────── */
const PORTAL_NM: NmId = "TOKO";
const portalFactory = FACTORIES.find((f) => f.id === PORTAL_NM)!;

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Tier metadata                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
type TierMeta = {
  vnLabel: string;        // "Cứng" / "Chắc" / "Mềm"
  windowLabel: string;    // "M+1 ±5%"
  badgeBg: string;
  badgeText: string;
  termKey: string;        // for TermTooltip
  slaDays: number;        // SLA to respond (days)
};

const TIER_META: Record<CommitmentTier, TierMeta> = {
  Hard: {
    vnLabel: "Cứng",
    windowLabel: "M+1 ±5%",
    badgeBg: "bg-success-bg",
    badgeText: "text-success",
    termKey: "CamKetCung",
    slaDays: 2,
  },
  Firm: {
    vnLabel: "Chắc",
    windowLabel: "M+2 ±15%",
    badgeBg: "bg-info-bg",
    badgeText: "text-info",
    termKey: "CamKetChac",
    slaDays: 3,
  },
  Soft: {
    vnLabel: "Mềm",
    windowLabel: "M+3 ±30%",
    badgeBg: "bg-warning-bg",
    badgeText: "text-warning",
    termKey: "CamKetMem",
    slaDays: 5,
  },
  Counter: {
    vnLabel: "Đề xuất",
    windowLabel: "Đang đàm phán",
    badgeBg: "bg-warning-bg",
    badgeText: "text-warning",
    termKey: "CamKetChac",
    slaDays: 2,
  },
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Commitment response state                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
type ResponseStatus = "pending" | "confirmed" | "counter" | "rejected";

interface CommitmentRow {
  id: string;
  skuBaseCode: string;
  requestedM2: number;
  committedM2: number;
  tier: CommitmentTier;
  validUntil: string;
  status: ResponseStatus;
  daysElapsed: number;     // days since request was sent
  counterQty?: number;
  counterReason?: string;
  counterNote?: string;
}

const COUNTER_REASONS = [
  "Hết năng lực",
  "Thiếu nguyên liệu",
  "Lịch SX kín",
  "Khác",
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Stock freshness                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */
type Freshness = "fresh" | "old" | "blocked";

function freshnessFromStaleness(s: "fresh" | "1d" | "stale"): Freshness {
  if (s === "fresh") return "fresh";
  if (s === "1d") return "old";
  return "blocked";
}

const FRESHNESS_META: Record<Freshness, { label: string; bg: string; text: string }> = {
  fresh:   { label: "Mới",   bg: "bg-success-bg", text: "text-success" },
  old:     { label: "Cũ",    bg: "bg-warning-bg", text: "text-warning" },
  blocked: { label: "CHẶN",  bg: "bg-danger-bg",  text: "text-danger"  },
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Excel upload — 7-step workflow                                             */
/* ─────────────────────────────────────────────────────────────────────────── */
type UploadStep =
  | "idle"        // 1. before download
  | "downloaded"  // 2. template downloaded
  | "uploading"   // 3. picking file
  | "validating"  // 4. parsing & validating
  | "preview"     // 5. preview diff
  | "confirming"  // 6. user confirms
  | "applied";    // 7. saved

interface UploadPreview {
  newCount: number;
  updateCount: number;
  errorCount: number;
  errors: string[];
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  PO lifecycle (in-flight orders)                                            */
/* ─────────────────────────────────────────────────────────────────────────── */
interface PoOrder {
  id: string;
  poNumber: string;
  skuBaseCode: string;
  qtyM2: number;
  stage: LifecycleStage;
  shipDetails?: ShipDetails;
}

interface ShipDetails {
  vehiclePlate: string;   // số xe
  carrier: string;        // NVT
  containerNo: string;    // container
  driverName: string;     // tài xế
  driverPhone: string;    // SĐT
}

const SHIP_FIELDS: Array<{ key: keyof ShipDetails; label: string; placeholder: string; type?: string }> = [
  { key: "vehiclePlate", label: "Số xe",     placeholder: "VD: 51C-12345" },
  { key: "carrier",      label: "Nhà vận tải (NVT)", placeholder: "VD: Vinatrans" },
  { key: "containerNo",  label: "Số container",      placeholder: "VD: TCKU1234567" },
  { key: "driverName",   label: "Tài xế",            placeholder: "Họ và tên" },
  { key: "driverPhone",  label: "SĐT tài xế",        placeholder: "VD: 0901 234 567", type: "tel" },
];

const EMPTY_SHIP: ShipDetails = {
  vehiclePlate: "", carrier: "", containerNo: "", driverName: "", driverPhone: "",
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Seed data                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
function seedCommitments(): CommitmentRow[] {
  return NM_COMMITMENTS
    .filter((c) => c.nmId === PORTAL_NM)
    .map((c, i) => ({
      id: `cm-${i + 1}`,
      skuBaseCode: c.skuBaseCode,
      requestedM2: c.requestedM2,
      committedM2: c.committedM2,
      tier: c.tier,
      validUntil: c.validUntil,
      status: c.tier === "Counter" ? "counter" : "pending",
      daysElapsed: c.tier === "Counter" ? 2 : c.tier === "Soft" ? 1 : 1,
      counterQty: c.tier === "Counter" ? c.committedM2 : undefined,
      counterReason: c.tier === "Counter" ? "Lịch SX kín" : undefined,
    }));
}

function seedPoOrders(): PoOrder[] {
  // Build a few mock POs targeting Toko's SKUs in different lifecycle stages
  return [
    { id: "po-1", poNumber: "PO-TKO-2605-001", skuBaseCode: "GA-600", qtyM2: 4250, stage: "submitted" },
    { id: "po-2", poNumber: "PO-TKO-2605-002", skuBaseCode: "GA-800", qtyM2: 1800, stage: "nm_accepted" },
    { id: "po-3", poNumber: "PO-TKO-2605-003", skuBaseCode: "GA-600", qtyM2: 2600, stage: "in_production" },
    { id: "po-4", poNumber: "PO-TKO-2605-004", skuBaseCode: "GA-800", qtyM2: 950,  stage: "shipped",
      shipDetails: { vehiclePlate: "51C-72184", carrier: "Vinatrans", containerNo: "TCKU2200881", driverName: "Lê Văn Hùng", driverPhone: "0903 555 222" } },
  ];
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
function formatVnDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function slaPct(elapsed: number, total: number): number {
  return Math.min(100, Math.round((elapsed / total) * 100));
}

function slaTone(elapsed: number, total: number): string {
  const r = elapsed / total;
  if (r >= 1) return "bg-danger";
  if (r >= 0.66) return "bg-warning";
  return "bg-success";
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  COMPONENT                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
export default function SupplierPortalPage() {
  const [commitments, setCommitments] = useState<CommitmentRow[]>(seedCommitments);
  const [counterId, setCounterId] = useState<string | null>(null);
  const [counterDraft, setCounterDraft] = useState<{ qty: string; reason: string; note: string }>({
    qty: "", reason: COUNTER_REASONS[0], note: "",
  });

  // Stock tab
  const stockRows = useMemo(
    () =>
      NM_INVENTORY
        .filter((r) => r.nmId === PORTAL_NM)
        .map((r) => ({ ...r, freshness: freshnessFromStaleness(r.staleness) })),
    [],
  );

  // Excel upload state
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
  const [uploadPreview, setUploadPreview] = useState<UploadPreview | null>(null);

  // Orders
  const [poOrders, setPoOrders] = useState<PoOrder[]>(seedPoOrders);
  const [shipPoId, setShipPoId] = useState<string | null>(null);
  const [shipDraft, setShipDraft] = useState<ShipDetails>(EMPTY_SHIP);

  /* ───────── Commitment actions ───────── */
  const confirmCommitment = (id: string) => {
    const c = commitments.find((x) => x.id === id);
    setCommitments((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: "confirmed", committedM2: x.requestedM2 } : x)),
    );
    toast.success(`Đã xác nhận cam kết ${c?.skuBaseCode}`, {
      description: `${c?.requestedM2.toLocaleString()} m² · tier ${c ? TIER_META[c.tier].vnLabel : ""}`,
    });
  };

  const openCounter = (id: string) => {
    const c = commitments.find((x) => x.id === id);
    if (!c) return;
    setCounterId(id);
    setCounterDraft({
      qty: String(c.counterQty ?? Math.round(c.requestedM2 * 0.8)),
      reason: c.counterReason ?? COUNTER_REASONS[0],
      note: c.counterNote ?? "",
    });
  };

  const submitCounter = () => {
    if (!counterId) return;
    const c = commitments.find((x) => x.id === counterId);
    if (!c) return;
    const qty = Number(counterDraft.qty);
    if (!qty || qty <= 0) {
      toast.error("Nhập số lượng tối đa hợp lệ");
      return;
    }
    if (qty > c.requestedM2) {
      toast.error(`Tối đa không được vượt số yêu cầu (${c.requestedM2.toLocaleString()} m²)`);
      return;
    }
    setCommitments((prev) =>
      prev.map((x) =>
        x.id === counterId
          ? {
              ...x,
              status: "counter",
              committedM2: qty,
              counterQty: qty,
              counterReason: counterDraft.reason,
              counterNote: counterDraft.note,
            }
          : x,
      ),
    );
    toast(`Đã gửi đề xuất khác cho ${c.skuBaseCode}`, {
      description: `${qty.toLocaleString()} m² · ${counterDraft.reason}`,
    });
    setCounterId(null);
  };

  const markPending = (id: string) => {
    setCommitments((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: "pending" } : x)),
    );
    toast("Đặt lại trạng thái: Chờ xử lý");
  };

  /* ───────── Excel upload workflow ───────── */
  const downloadTemplate = () => {
    setUploadStep("downloaded");
    toast.success(`Đã tải mẫu cho ${portalFactory.name}`, {
      description: `${stockRows.length} mã hàng pre-filled · file Excel sẵn sàng cập nhật`,
    });
  };

  const startUpload = () => {
    setUploadStep("uploading");
    // Simulate validation
    window.setTimeout(() => {
      setUploadStep("validating");
      window.setTimeout(() => {
        // Mock preview: 1 new, 4 updated, 1 error (SKU not belonging to NM)
        const newCount = 1;
        const updateCount = stockRows.length - 1;
        const errors = ["Dòng 7: SKU `GT-300` không thuộc NM Toko (chỉ định cho Đồng Tâm)."];
        setUploadPreview({
          newCount,
          updateCount,
          errorCount: errors.length,
          errors,
        });
        setUploadStep("preview");
      }, 700);
    }, 400);
  };

  const confirmUpload = () => {
    setUploadStep("confirming");
    window.setTimeout(() => {
      setUploadStep("applied");
      toast.success("Đã cập nhật tồn kho", {
        description: `${uploadPreview?.updateCount ?? 0} cập nhật · ${uploadPreview?.newCount ?? 0} mới · ${uploadPreview?.errorCount ?? 0} lỗi bỏ qua`,
      });
    }, 500);
  };

  const resetUpload = () => {
    setUploadStep("idle");
    setUploadPreview(null);
  };

  /* ───────── PO lifecycle actions ───────── */
  const advanceStage = (id: string, next: LifecycleStage) => {
    const po = poOrders.find((p) => p.id === id);
    setPoOrders((prev) => prev.map((p) => (p.id === id ? { ...p, stage: next } : p)));
    const labels: Record<LifecycleStage, string> = {
      draft: "Soạn", submitted: "Xác nhận", nm_accepted: "NM nhận",
      in_production: "Đang SX", shipped: "Giao", received: "Nhận", closed: "Đóng",
    };
    toast.success(`${po?.poNumber}: chuyển sang ${labels[next]}`);
  };

  const openShipForm = (id: string) => {
    const po = poOrders.find((p) => p.id === id);
    setShipDraft(po?.shipDetails ?? EMPTY_SHIP);
    setShipPoId(id);
  };

  const shipMissingFields = useMemo(() => {
    return SHIP_FIELDS.filter((f) => !shipDraft[f.key].trim()).map((f) => f.label);
  }, [shipDraft]);

  const submitShip = () => {
    if (!shipPoId) return;
    if (shipMissingFields.length > 0) {
      toast.error("Thiếu thông tin bắt buộc", {
        description: `Cần nhập: ${shipMissingFields.join(", ")}`,
      });
      return;
    }
    const po = poOrders.find((p) => p.id === shipPoId);
    setPoOrders((prev) =>
      prev.map((p) =>
        p.id === shipPoId ? { ...p, stage: "shipped", shipDetails: shipDraft } : p,
      ),
    );
    toast.success(`${po?.poNumber}: đã giao`, {
      description: `${shipDraft.vehiclePlate} · ${shipDraft.carrier} · ${shipDraft.driverName}`,
    });
    setShipPoId(null);
    setShipDraft(EMPTY_SHIP);
  };

  /* ─────────────────────────────────────────────────────────────────────── */
  /*  RENDER                                                                  */
  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <AppLayout>
      <div className="max-w-[680px] mx-auto space-y-5">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-screen-title text-text-1">{portalFactory.name}</h1>
            <p className="text-table text-text-2">
              Cổng nhà cung cấp · {portalFactory.code} · Khu vực {portalFactory.region}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-button text-table-sm font-medium px-2.5 py-1",
              portalFactory.honoringPct >= 90
                ? "bg-success-bg text-success"
                : portalFactory.honoringPct >= 70
                  ? "bg-warning-bg text-warning"
                  : "bg-danger-bg text-danger",
            )}
            title="Honoring rate"
          >
            <TermTooltip term="HonoringRate">
              <span>Honoring {portalFactory.honoringPct}%</span>
            </TermTooltip>
          </span>
        </header>

        {/* Tabs */}
        <Tabs defaultValue="commitments">
          <TabsList className="bg-surface-1 border border-surface-3 w-full justify-start flex-wrap h-auto">
            <TabsTrigger
              value="commitments"
              className="data-[state=active]:bg-surface-2 data-[state=active]:text-text-1 text-text-2 text-table"
            >
              Phản hồi cam kết
              <span className="ml-1.5 text-caption text-text-3">
                ({commitments.filter((c) => c.status === "pending").length})
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="stock"
              className="data-[state=active]:bg-surface-2 data-[state=active]:text-text-1 text-text-2 text-table"
            >
              Cập nhật tồn kho
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="data-[state=active]:bg-surface-2 data-[state=active]:text-text-1 text-text-2 text-table"
            >
              Theo dõi đơn hàng
              <span className="ml-1.5 text-caption text-text-3">({poOrders.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* ─────────────────────────────────── TAB 1: Commitments ──────── */}
          <TabsContent value="commitments" className="space-y-4">
            {/* Counter history (renders only if counter_rate > 30%) */}
            <NmCounterHistoryPanel nmId={PORTAL_NM} nmName={portalFactory.name} threshold={30} />

            {/* Tier legend */}
            <div className="rounded-card border border-surface-3 bg-surface-2 p-3">
              <div className="text-caption uppercase text-text-3 mb-2">Khung cam kết</div>
              <div className="flex flex-wrap gap-2 text-table-sm">
                {(["Hard", "Firm", "Soft"] as const).map((t) => {
                  const m = TIER_META[t];
                  return (
                    <TermTooltip key={t} term={m.termKey}>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-1 rounded-sm font-medium",
                          m.badgeBg,
                          m.badgeText,
                        )}
                      >
                        {m.vnLabel} <span className="text-text-3 font-normal">({m.windowLabel})</span>
                      </span>
                    </TermTooltip>
                  );
                })}
              </div>
            </div>

            {commitments.map((c) => {
              const meta = TIER_META[c.tier];
              const slaPctVal = slaPct(c.daysElapsed, meta.slaDays);
              const slaToneCls = slaTone(c.daysElapsed, meta.slaDays);
              const isPending = c.status === "pending";
              return (
                <article
                  key={c.id}
                  className="rounded-card border border-surface-3 bg-surface-2 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-section-header text-text-1">
                          {c.skuBaseCode}
                        </span>
                        <TermTooltip term={meta.termKey}>
                          <span
                            className={cn(
                              "text-caption font-medium px-1.5 py-0.5 rounded-sm",
                              meta.badgeBg,
                              meta.badgeText,
                            )}
                          >
                            {meta.vnLabel} · {meta.windowLabel}
                          </span>
                        </TermTooltip>
                      </div>
                      <p className="text-table text-text-2">
                        Yêu cầu:{" "}
                        <ClickableNumber
                          value={`${c.requestedM2.toLocaleString()} m²`}
                          label={`${c.skuBaseCode} requested`}
                          color="text-text-1 font-medium"
                          formula={`Requested = Hub gửi xuống = ${c.requestedM2.toLocaleString()} m²\nTier ${meta.vnLabel} (${meta.windowLabel})`}
                          note="Số m² Hub yêu cầu NM cam kết — phản hồi trước SLA"
                        />
                        {" · "}Cam kết hiện tại:{" "}
                        <ClickableNumber
                          value={`${c.committedM2.toLocaleString()} m²`}
                          label={`${c.skuBaseCode} committed`}
                          color={cn(
                            "font-medium",
                            c.committedM2 >= c.requestedM2 ? "text-success" : "text-warning",
                          )}
                          formula={`Committed = ${c.committedM2.toLocaleString()} m²\nHonoring = committed/requested = ${((c.committedM2 / Math.max(1, c.requestedM2)) * 100).toFixed(0)}%`}
                          note={
                            c.committedM2 < c.requestedM2
                              ? `Honoring ${((c.committedM2 / c.requestedM2) * 100).toFixed(0)}% vì capacity NM thiếu — counter ${(c.requestedM2 - c.committedM2).toLocaleString()} m²`
                              : "Honoring 100% — cam kết đầy đủ"
                          }
                        />
                      </p>
                      <p className="text-table-sm text-text-3">
                        Hiệu lực đến {formatVnDate(c.validUntil)}
                      </p>
                    </div>
                    <StatusPill status={c.status} />
                  </div>

                  {/* SLA countdown */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-table-sm">
                      <span className="text-text-3 inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Chờ phản hồi
                      </span>
                      <span className="text-text-2 tabular-nums">
                        {c.daysElapsed}/{meta.slaDays} ngày
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                      <div
                        className={cn("h-full transition-all", slaToneCls)}
                        style={{ width: `${slaPctVal}%` }}
                      />
                    </div>
                  </div>

                  {/* Counter offer summary (if any) */}
                  {c.status === "counter" && c.counterReason && (
                    <div className="rounded-button bg-warning-bg/40 border border-warning/30 p-2.5 text-table-sm text-text-2">
                      <span className="font-medium text-warning">Đề xuất:</span>{" "}
                      {c.counterQty?.toLocaleString()} m² · {c.counterReason}
                      {c.counterNote && <span className="text-text-3"> — {c.counterNote}</span>}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => confirmCommitment(c.id)}
                      disabled={c.status === "confirmed"}
                      className={cn(
                        "h-11 rounded-button font-medium text-table flex items-center justify-center gap-1.5 transition-opacity",
                        c.status === "confirmed"
                          ? "bg-success-bg text-success cursor-default"
                          : "bg-gradient-primary text-primary-foreground hover:opacity-90",
                      )}
                    >
                      <Check className="h-4 w-4" />
                      Xác nhận
                    </button>
                    <button
                      onClick={() => openCounter(c.id)}
                      className="h-11 rounded-button border border-surface-3 bg-surface-2 text-text-1 font-medium text-table flex items-center justify-center gap-1.5 hover:bg-surface-1 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                      Đề xuất khác
                    </button>
                    <button
                      onClick={() => markPending(c.id)}
                      disabled={isPending}
                      className={cn(
                        "h-11 rounded-button border font-medium text-table flex items-center justify-center gap-1.5 transition-colors",
                        isPending
                          ? "bg-surface-1 text-text-3 border-surface-3 cursor-default"
                          : "border-surface-3 bg-surface-2 text-text-2 hover:bg-surface-1",
                      )}
                    >
                      <Clock className="h-4 w-4" />
                      Chờ xử lý
                    </button>
                  </div>
                </article>
              );
            })}
          </TabsContent>

          {/* ─────────────────────────────────── TAB 2: Stock update ──────── */}
          <TabsContent value="stock" className="space-y-4">
            {/* 7-step workflow indicator */}
            <UploadStepIndicator step={uploadStep} />

            {/* Step 1: download template */}
            <div className="rounded-card border border-surface-3 bg-surface-2 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-section-header text-text-1">
                    Bước 1 · Tải mẫu Excel
                  </h3>
                  <p className="text-table-sm text-text-3 mt-0.5">
                    Mẫu pre-filled {stockRows.length} mã hàng được phân công cho {portalFactory.name}.
                  </p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="h-10 px-3 rounded-button bg-gradient-primary text-primary-foreground text-table font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity shrink-0"
                >
                  <Download className="h-4 w-4" />
                  Tải mẫu
                </button>
              </div>

              {uploadStep === "downloaded" && (
                <div className="rounded-button bg-success-bg/40 border border-success/30 p-2.5 text-table-sm text-success inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Đã tải mẫu — điền số liệu rồi upload bên dưới.
                </div>
              )}
            </div>

            {/* Step 2-7: Upload workflow */}
            <div className="rounded-card border border-surface-3 bg-surface-2 p-4 space-y-3">
              <h3 className="font-display text-section-header text-text-1">
                Bước 2-7 · Upload &amp; xác nhận
              </h3>

              {(uploadStep === "idle" || uploadStep === "downloaded") && (
                <button
                  onClick={startUpload}
                  className="w-full h-12 rounded-button border-2 border-dashed border-surface-3 text-text-2 text-table inline-flex items-center justify-center gap-2 hover:bg-surface-1 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Chọn file Excel để upload
                </button>
              )}

              {(uploadStep === "uploading" || uploadStep === "validating") && (
                <div className="rounded-button bg-info-bg/40 p-3 text-info text-table inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadStep === "uploading" ? "Đang tải file…" : "Đang validate…"}
                </div>
              )}

              {uploadStep === "preview" && uploadPreview && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <PreviewBadge label="Mới" value={uploadPreview.newCount} tone="info" />
                    <PreviewBadge label="Cập nhật" value={uploadPreview.updateCount} tone="success" />
                    <PreviewBadge label="Lỗi" value={uploadPreview.errorCount} tone="danger" />
                  </div>
                  {uploadPreview.errors.length > 0 && (
                    <div className="rounded-button bg-danger-bg/40 border border-danger/30 p-3 space-y-1">
                      <div className="text-table-sm font-medium text-danger inline-flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" /> Lỗi không hợp lệ
                      </div>
                      <ul className="text-table-sm text-text-2 list-disc pl-5 space-y-0.5">
                        {uploadPreview.errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={confirmUpload}
                      className="flex-1 h-11 rounded-button bg-gradient-primary text-primary-foreground font-medium text-table inline-flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Xác nhận áp dụng
                    </button>
                    <button
                      onClick={resetUpload}
                      className="h-11 px-4 rounded-button border border-surface-3 text-text-2 text-table hover:bg-surface-1 transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {uploadStep === "applied" && (
                <div className="rounded-button bg-success-bg/40 border border-success/30 p-3 text-success text-table inline-flex items-center gap-2 w-full">
                  <CheckCircle2 className="h-4 w-4" /> Đã áp dụng cập nhật tồn kho.
                  <button onClick={resetUpload} className="ml-auto underline text-table-sm">
                    Upload tiếp
                  </button>
                </div>
              )}
            </div>

            {/* Current stock — read-only with freshness gate */}
            <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
              <div className="px-4 py-2.5 bg-surface-1 flex items-center justify-between">
                <h3 className="font-display text-section-header text-text-1">
                  Tồn kho hiện tại
                </h3>
                <div className="flex gap-1.5 text-caption">
                  {(["fresh", "old", "blocked"] as const).map((f) => {
                    const m = FRESHNESS_META[f];
                    return (
                      <TermTooltip key={f} term="Stale">
                        <span className={cn("px-1.5 py-0.5 rounded-sm font-medium", m.bg, m.text)}>
                          {m.label}
                        </span>
                      </TermTooltip>
                    );
                  })}
                </div>
              </div>
              <table className="w-full text-table">
                <thead>
                  <tr className="bg-surface-1 border-b border-surface-3">
                    <th className="text-left px-4 py-2 text-table-header uppercase text-text-3">SKU</th>
                    <th className="text-right px-4 py-2 text-table-header uppercase text-text-3">Tồn (m²)</th>
                    <th className="text-right px-4 py-2 text-table-header uppercase text-text-3">Đang SX (m²)</th>
                    <th className="text-left px-4 py-2 text-table-header uppercase text-text-3">Cập nhật</th>
                  </tr>
                </thead>
                <tbody>
                  {stockRows.map((r, i) => {
                    const m = FRESHNESS_META[r.freshness];
                    return (
                      <tr key={r.skuBaseCode} className={i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"}>
                        <td className="px-4 py-2.5 font-mono text-table-sm text-text-1">
                          {r.skuBaseCode}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-text-1">
                          {r.onHandM2.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-text-2">
                          {r.inProductionM2.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-table-sm">
                          <span className={cn("px-1.5 py-0.5 rounded-sm font-medium", m.bg, m.text)}>
                            {m.label}
                          </span>
                          <span className="ml-2 text-text-3">
                            {new Date(r.updatedAt).toLocaleDateString("vi-VN")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ─────────────────────────────────── TAB 3: PO orders ───────── */}
          <TabsContent value="orders" className="space-y-4">
            {poOrders.map((po) => {
              const canAcceptPo = po.stage === "submitted";
              const canStartProd = po.stage === "nm_accepted";
              const canShip = po.stage === "in_production";
              return (
                <article
                  key={po.id}
                  className="rounded-card border border-surface-3 bg-surface-2 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TermTooltip term="PO">
                          <span className={cn("text-info font-mono", poNumClasses)}>
                            {po.poNumber}
                          </span>
                        </TermTooltip>
                      </div>
                      <p className="text-table text-text-2">
                        <span className="font-mono text-text-1">{po.skuBaseCode}</span>
                        {" · "}
                        <span className="tabular-nums">{po.qtyM2.toLocaleString()} m²</span>
                      </p>
                    </div>
                  </div>

                  {/* 7-stage stepper */}
                  <PoLifecycleStepper currentStage={po.stage} />

                  {/* Action row */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => advanceStage(po.id, "nm_accepted")}
                      disabled={!canAcceptPo}
                      className={cn(
                        "h-11 rounded-button text-table font-medium inline-flex items-center justify-center gap-1.5 transition-opacity",
                        canAcceptPo
                          ? "bg-gradient-primary text-primary-foreground hover:opacity-90"
                          : "bg-surface-1 text-text-3 cursor-default",
                      )}
                    >
                      <Check className="h-4 w-4" />
                      NM nhận PO
                    </button>
                    <button
                      onClick={() => advanceStage(po.id, "in_production")}
                      disabled={!canStartProd}
                      className={cn(
                        "h-11 rounded-button text-table font-medium inline-flex items-center justify-center gap-1.5 transition-colors",
                        canStartProd
                          ? "border border-info bg-info-bg text-info hover:bg-info/10"
                          : "bg-surface-1 text-text-3 cursor-default",
                      )}
                    >
                      <Factory className="h-4 w-4" />
                      Bắt đầu SX
                    </button>
                    <button
                      onClick={() => openShipForm(po.id)}
                      disabled={!canShip}
                      className={cn(
                        "h-11 rounded-button text-table font-medium inline-flex items-center justify-center gap-1.5 transition-colors",
                        canShip
                          ? "border border-success bg-success-bg text-success hover:bg-success/10"
                          : "bg-surface-1 text-text-3 cursor-default",
                      )}
                    >
                      <Truck className="h-4 w-4" />
                      Đã giao
                    </button>
                  </div>

                  {/* Shipped details summary */}
                  {po.shipDetails && po.stage !== "in_production" && (
                    <div className="rounded-button bg-surface-1 border border-surface-3 p-3 text-table-sm space-y-0.5">
                      <div className="text-text-3 uppercase text-caption mb-1">Thông tin giao hàng</div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-text-2">
                        <span>Số xe: <span className="text-text-1">{po.shipDetails.vehiclePlate}</span></span>
                        <span>NVT: <span className="text-text-1">{po.shipDetails.carrier}</span></span>
                        <span>Container: <span className="text-text-1 font-mono">{po.shipDetails.containerNo}</span></span>
                        <span>Tài xế: <span className="text-text-1">{po.shipDetails.driverName}</span></span>
                        <span className="col-span-2">SĐT: <span className="text-text-1">{po.shipDetails.driverPhone}</span></span>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>

      {/* ─────────────────────────── Counter-offer bottom sheet ─────── */}
      {counterId && (
        <>
          <div
            className="fixed inset-0 bg-text-1/30 z-50"
            onClick={() => setCounterId(null)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-surface-2 border-t border-surface-3 rounded-t-panel p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1.5 rounded-full bg-surface-3 mx-auto" />
            <h3 className="font-display text-section-header text-text-1">
              Đề xuất khác — {commitments.find((c) => c.id === counterId)?.skuBaseCode}
            </h3>
            <p className="text-table-sm text-text-3">
              Yêu cầu gốc:{" "}
              <span className="text-text-1 tabular-nums font-medium">
                {commitments.find((c) => c.id === counterId)?.requestedM2.toLocaleString()} m²
              </span>
            </p>

            <div>
              <label className="text-caption text-text-3 uppercase">Số lượng tối đa (m²)</label>
              <input
                type="number"
                value={counterDraft.qty}
                onChange={(e) => setCounterDraft((d) => ({ ...d, qty: e.target.value }))}
                className="w-full h-12 mt-1 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 tabular-nums"
              />
            </div>

            <div>
              <label className="text-caption text-text-3 uppercase">Lý do</label>
              <select
                value={counterDraft.reason}
                onChange={(e) => setCounterDraft((d) => ({ ...d, reason: e.target.value }))}
                className="w-full h-12 mt-1 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1"
              >
                {COUNTER_REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-caption text-text-3 uppercase">Ghi chú thêm</label>
              <div className="flex items-start gap-2 mt-1">
                <textarea
                  value={counterDraft.note}
                  onChange={(e) => setCounterDraft((d) => ({ ...d, note: e.target.value }))}
                  placeholder="Mô tả chi tiết tình huống…"
                  className="flex-1 h-24 rounded-button border border-surface-3 bg-surface-0 px-3 py-2 text-table text-text-1 resize-none"
                />
                <VoiceInput
                  size="md"
                  onTranscript={(t) => setCounterDraft((d) => ({ ...d, note: d.note + t }))}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={submitCounter}
                className="flex-1 h-12 rounded-button bg-gradient-primary text-primary-foreground font-medium text-table hover:opacity-90 transition-opacity"
              >
                Gửi đề xuất
              </button>
              <button
                onClick={() => setCounterId(null)}
                className="h-12 px-4 rounded-button border border-surface-3 text-text-2 text-table hover:bg-surface-1 transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─────────────────────────── Ship form bottom sheet ────────── */}
      {shipPoId && (
        <>
          <div
            className="fixed inset-0 bg-text-1/30 z-50"
            onClick={() => setShipPoId(null)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-surface-2 border-t border-surface-3 rounded-t-panel p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1.5 rounded-full bg-surface-3 mx-auto" />
            <div>
              <h3 className="font-display text-section-header text-text-1">
                Thông tin giao hàng
              </h3>
              <p className="text-table-sm text-text-3 mt-0.5">
                {poOrders.find((p) => p.id === shipPoId)?.poNumber} — Tất cả trường bắt buộc.
              </p>
            </div>

            <div className="space-y-3">
              {SHIP_FIELDS.map((f) => {
                const missing = !shipDraft[f.key].trim();
                return (
                  <div key={f.key}>
                    <label className="text-caption text-text-3 uppercase flex items-center gap-1">
                      {f.label}
                      <span className="text-danger">*</span>
                    </label>
                    <input
                      type={f.type ?? "text"}
                      value={shipDraft[f.key]}
                      onChange={(e) =>
                        setShipDraft((s) => ({ ...s, [f.key]: e.target.value }))
                      }
                      placeholder={f.placeholder}
                      className={cn(
                        "w-full h-12 mt-1 rounded-button border bg-surface-0 px-3 text-table text-text-1",
                        missing ? "border-danger/40" : "border-surface-3",
                      )}
                    />
                  </div>
                );
              })}
            </div>

            {shipMissingFields.length > 0 && (
              <div className="rounded-button bg-warning-bg/40 border border-warning/30 p-2.5 text-table-sm text-warning inline-flex items-start gap-1.5">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Còn thiếu: <strong>{shipMissingFields.join(", ")}</strong>. Không thể gửi nếu thiếu bất kỳ trường nào.
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={submitShip}
                disabled={shipMissingFields.length > 0}
                className={cn(
                  "flex-1 h-12 rounded-button font-medium text-table transition-opacity inline-flex items-center justify-center gap-1.5",
                  shipMissingFields.length > 0
                    ? "bg-surface-1 text-text-3 cursor-not-allowed"
                    : "bg-gradient-primary text-primary-foreground hover:opacity-90",
                )}
              >
                <Truck className="h-4 w-4" /> Xác nhận đã giao
              </button>
              <button
                onClick={() => setShipPoId(null)}
                className="h-12 px-4 rounded-button border border-surface-3 text-text-2 text-table hover:bg-surface-1 transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Small presentational helpers                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
function StatusPill({ status }: { status: ResponseStatus }) {
  const map: Record<ResponseStatus, { label: string; bg: string; text: string }> = {
    pending:   { label: "Chờ xử lý", bg: "bg-warning-bg", text: "text-warning" },
    confirmed: { label: "Đã xác nhận", bg: "bg-success-bg", text: "text-success" },
    counter:   { label: "Đã đề xuất khác", bg: "bg-info-bg", text: "text-info" },
    rejected:  { label: "Đã từ chối", bg: "bg-danger-bg", text: "text-danger" },
  };
  const m = map[status];
  return (
    <span className={cn("text-caption font-medium px-1.5 py-0.5 rounded-sm shrink-0", m.bg, m.text)}>
      {m.label}
    </span>
  );
}

function PreviewBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "info" | "success" | "danger";
}) {
  const map = {
    info:    { bg: "bg-info-bg",    text: "text-info" },
    success: { bg: "bg-success-bg", text: "text-success" },
    danger:  { bg: "bg-danger-bg",  text: "text-danger" },
  };
  const m = map[tone];
  return (
    <div className={cn("rounded-button p-2.5", m.bg)}>
      <div className={cn("text-section-header font-display tabular-nums", m.text)}>{value}</div>
      <div className={cn("text-caption uppercase", m.text)}>{label}</div>
    </div>
  );
}

const STEP_ORDER: UploadStep[] = [
  "idle", "downloaded", "uploading", "validating", "preview", "confirming", "applied",
];

const STEP_LABELS: Record<UploadStep, string> = {
  idle:        "Tải mẫu",
  downloaded:  "Điền số liệu",
  uploading:   "Tải lên",
  validating:  "Kiểm tra",
  preview:     "Xem trước",
  confirming:  "Xác nhận",
  applied:     "Áp dụng",
};

function UploadStepIndicator({ step }: { step: UploadStep }) {
  const idx = STEP_ORDER.indexOf(step);
  return (
    <div className="rounded-card border border-surface-3 bg-surface-1 p-2">
      <div className="flex items-center gap-1 overflow-x-auto">
        {STEP_ORDER.map((s, i) => {
          const reached = i <= idx;
          const active = i === idx;
          return (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-sm text-caption font-medium",
                  active
                    ? "bg-primary text-primary-foreground"
                    : reached
                      ? "bg-success-bg text-success"
                      : "text-text-3",
                )}
              >
                <FileSpreadsheet className="h-3 w-3" />
                <span>{i + 1}. {STEP_LABELS[s]}</span>
              </div>
              {i < STEP_ORDER.length - 1 && (
                <ChevronRight className="h-3 w-3 text-text-3 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
