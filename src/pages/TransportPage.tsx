import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  PauseCircle,
  Package,
  ChevronRight,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  Route as RouteIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { HoldOrShipPanel } from "@/components/orders/HoldOrShipPanel";
import {
  TRANSPORT_PLANS,
  BRANCHES,
  FACTORIES,
  SKU_BASES,
  type TransportPlan,
} from "@/data/unis-enterprise-dataset";

const fmt = (n: number) => `${n.toLocaleString("vi-VN")} m²`;

function nodeName(code: string): string {
  if (code.startsWith("NM-")) return FACTORIES.find((f) => f.code === code)?.name ?? code;
  return BRANCHES.find((b) => b.code === code)?.name ?? code;
}

const CN_HSTK_DAYS: Record<string, number> = {
  "CN-HN": 5.2, "CN-HCM": 4.1, "CN-DN": 6.8, "CN-CT": 7.2, "CN-NA": 3.4,
  "CN-NT": 4.8, "CN-HP": 6.0, "CN-BMT": 2.6, "CN-LA": 5.8, "CN-PK": 7.5,
  "CN-QN": 5.0, "CN-BD": 8.2,
};

type Decision = "SHIP" | "HOLD" | "TOP_UP";

function decisionFor(p: TransportPlan): Decision {
  if (p.status === "TOP_UP_SUGGESTED") return "TOP_UP";
  if (p.status === "HOLD") return "HOLD";
  return "SHIP";
}

function FillBadge({ pct }: { pct: number }) {
  const tone =
    pct >= 85
      ? "bg-success-bg text-success border-success/30"
      : pct >= 60
      ? "bg-warning-bg text-warning border-warning/30"
      : "bg-danger-bg text-danger border-danger/30";
  const icon = pct >= 85 ? "🟢" : pct >= 60 ? "🟡" : "🔴";
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-caption font-semibold inline-flex items-center gap-1", tone)}>
      {icon} {pct}%
    </span>
  );
}

function DecisionBadge({ d }: { d: Decision }) {
  const meta =
    d === "SHIP"
      ? { label: "SHIP", icon: "✅", cls: "bg-success/10 text-success border-success/30" }
      : d === "HOLD"
      ? { label: "HOLD", icon: "⏸️", cls: "bg-warning/10 text-warning border-warning/30" }
      : { label: "TOP_UP", icon: "📦", cls: "bg-info/10 text-primary border-primary/30" };
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-caption font-bold inline-flex items-center gap-1", meta.cls)}>
      {meta.icon} {meta.label}
    </span>
  );
}

function topUpSuggestions(plan: TransportPlan) {
  const nm = plan.fromCode;
  const candidates = SKU_BASES.filter((b) => `NM-${b.nmId}` === nm).slice(0, 3);
  const fallback = SKU_BASES.slice(0, 3);
  const list = candidates.length > 0 ? candidates : fallback;
  return list.map((c, i) => ({
    sku: c.code,
    qty: 80 + i * 60,
    reason: i === 0 ? "Near-SS · cùng NM" : i === 1 ? "Demand spike W21" : "Tận dụng container chưa đầy",
  }));
}

function PackingTab() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actioned, setActioned] = useState<Record<string, Decision | undefined>>({});

  return (
    <div className="rounded-card border border-surface-3 bg-surface-1 overflow-hidden">
      <table className="w-full">
        <thead className="bg-surface-2/50 border-b border-surface-3">
          <tr className="text-table-sm text-text-3 text-left">
            <th className="px-4 py-2.5 font-medium">Container</th>
            <th className="px-4 py-2.5 font-medium">Tuyến</th>
            <th className="px-4 py-2.5 font-medium">Loại</th>
            <th className="px-4 py-2.5 font-medium text-right">Tải</th>
            <th className="px-4 py-2.5 font-medium text-center">Fill%</th>
            <th className="px-4 py-2.5 font-medium text-center">Quyết định</th>
            <th className="px-4 py-2.5 font-medium">Khuyến nghị</th>
            <th className="px-4 py-2.5 font-medium text-right">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {TRANSPORT_PLANS.map((p) => {
            const d = actioned[p.id] ?? decisionFor(p);
            const isOpen = expanded === p.id;
            const canExpand = d === "TOP_UP";
            return (
              <>
                <tr
                  key={p.id}
                  className={cn(
                    "border-b border-surface-3 transition-colors",
                    canExpand ? "cursor-pointer hover:bg-surface-2/40" : "hover:bg-surface-2/20",
                  )}
                  onClick={() => canExpand && setExpanded(isOpen ? null : p.id)}
                >
                  <td className="px-4 py-3 font-mono text-table-sm text-text-1">
                    <span className="inline-flex items-center gap-1">
                      {canExpand && (isOpen ? <ChevronDown className="h-3 w-3 text-text-3" /> : <ChevronRight className="h-3 w-3 text-text-3" />)}
                      {p.id}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-table-sm text-text-2">
                    {nodeName(p.fromCode)} <ChevronRight className="inline h-3 w-3 text-text-3" /> {nodeName(p.toCnCode)}
                  </td>
                  <td className="px-4 py-3 text-table-sm text-text-2">{p.containerType}</td>
                  <td className="px-4 py-3 text-table-sm text-text-1 font-mono text-right">
                    {fmt(p.loadedM2)} <span className="text-text-3">/ {fmt(p.capacityM2)}</span>
                  </td>
                  <td className="px-4 py-3 text-center"><FillBadge pct={p.fillPct} /></td>
                  <td className="px-4 py-3 text-center"><DecisionBadge d={d} /></td>
                  <td className="px-4 py-3 text-table-sm text-text-2 italic">{p.recommendation}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => {
                          setActioned((s) => ({ ...s, [p.id]: "SHIP" }));
                          toast.success(`XUẤT ${p.id}`, { description: `${nodeName(p.fromCode)} → ${nodeName(p.toCnCode)}` });
                        }}
                        className="rounded-button border border-surface-3 bg-surface-0 px-2 py-1 text-caption font-medium text-text-1 hover:bg-success/10 hover:border-success/30 hover:text-success transition-colors"
                        title="Xuất ngay"
                      >
                        <Truck className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => {
                          setActioned((s) => ({ ...s, [p.id]: "HOLD" }));
                          toast(`Giữ ${p.id} 1–2 ngày`);
                        }}
                        className="rounded-button border border-surface-3 bg-surface-0 px-2 py-1 text-caption font-medium text-text-1 hover:bg-warning/10 hover:border-warning/30 hover:text-warning transition-colors"
                        title="Giữ"
                      >
                        <PauseCircle className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
                {canExpand && isOpen && (
                  <tr key={`${p.id}-exp`} className="bg-info-bg/40 border-b border-surface-3">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-2 text-table-sm font-semibold text-text-1">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Gợi ý gom thêm — cùng NM, near-SS first
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {topUpSuggestions(p).map((s, i) => (
                          <div key={i} className="rounded-button border border-surface-3 bg-surface-0 p-2.5">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-table-sm text-text-1">{s.sku}</span>
                              <span className="text-caption font-mono text-text-2">{fmt(s.qty)}</span>
                            </div>
                            <p className="text-caption text-text-3 italic mt-0.5">{s.reason}</p>
                            <button
                              onClick={() => toast.success(`Đã thêm ${s.sku} (${fmt(s.qty)}) vào ${p.id}`)}
                              className="mt-1.5 w-full rounded-button bg-primary/10 px-2 py-1 text-caption font-medium text-primary hover:bg-primary/20 transition-colors"
                            >
                              + Thêm vào container
                            </button>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RoutesTab() {
  const grouped = useMemo(() => {
    const m = new Map<string, TransportPlan[]>();
    TRANSPORT_PLANS.forEach((p) => {
      const arr = m.get(p.fromCode) ?? [];
      arr.push(p);
      m.set(p.fromCode, arr);
    });
    m.forEach((arr) =>
      arr.sort((a, b) => (CN_HSTK_DAYS[a.toCnCode] ?? 9) - (CN_HSTK_DAYS[b.toCnCode] ?? 9)),
    );
    return Array.from(m.entries());
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-info/30 bg-info-bg/40 p-3 text-table-sm text-text-2 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <span>Mỗi tuyến: CN ưu tiên theo HSTK thấp nhất → giao trước. CN HSTK ≤ 3 ngày = khẩn cấp.</span>
      </div>
      {grouped.map(([from, plans]) => (
        <div key={from} className="rounded-card border border-surface-3 bg-surface-1 overflow-hidden">
          <div className="px-4 py-2.5 bg-surface-2/50 border-b border-surface-3 flex items-center gap-2">
            <RouteIcon className="h-4 w-4 text-primary" />
            <span className="font-display text-section-header text-text-1">{nodeName(from)}</span>
            <span className="text-caption text-text-3">· {plans.length} điểm giao</span>
          </div>
          <table className="w-full">
            <thead className="bg-surface-2/30">
              <tr className="text-caption text-text-3 text-left">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Đến CN</th>
                <th className="px-4 py-2 font-medium text-right">HSTK (ngày)</th>
                <th className="px-4 py-2 font-medium text-right">Tải</th>
                <th className="px-4 py-2 font-medium text-center">Fill%</th>
                <th className="px-4 py-2 font-medium">Container</th>
                <th className="px-4 py-2 font-medium">Lịch xuất</th>
                <th className="px-4 py-2 font-medium text-center">Quyết định</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p, i) => {
                const hstk = CN_HSTK_DAYS[p.toCnCode] ?? 4;
                const urgent = hstk <= 3;
                return (
                  <tr key={p.id} className={cn("border-t border-surface-3", urgent && "bg-danger/5")}>
                    <td className="px-4 py-2.5 text-caption font-mono text-text-3">#{i + 1}</td>
                    <td className="px-4 py-2.5 text-table-sm text-text-1 font-medium">{nodeName(p.toCnCode)}</td>
                    <td className={cn("px-4 py-2.5 text-table-sm font-mono text-right", urgent ? "text-danger font-bold" : "text-text-2")}>
                      {hstk.toFixed(1)}{urgent && " 🔴"}
                    </td>
                    <td className="px-4 py-2.5 text-table-sm text-text-2 font-mono text-right">{fmt(p.loadedM2)}</td>
                    <td className="px-4 py-2.5 text-center"><FillBadge pct={p.fillPct} /></td>
                    <td className="px-4 py-2.5 text-table-sm text-text-2">{p.containerType}</td>
                    <td className="px-4 py-2.5 text-caption font-mono text-text-3">{p.scheduledDate}</td>
                    <td className="px-4 py-2.5 text-center"><DecisionBadge d={decisionFor(p)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default function TransportPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"packing" | "routes">("packing");

  const summary = useMemo(() => {
    const ship = TRANSPORT_PLANS.filter((p) => decisionFor(p) === "SHIP").length;
    const hold = TRANSPORT_PLANS.filter((p) => decisionFor(p) === "HOLD").length;
    const topUp = TRANSPORT_PLANS.filter((p) => decisionFor(p) === "TOP_UP").length;
    return { ship, hold, topUp, total: TRANSPORT_PLANS.length };
  }, []);

  return (
    <AppLayout>
      <div className="p-8 max-w-screen-2xl mx-auto">
      <ScreenHeader
        title="Đóng hàng & Vận tải"
        subtitle={`F2-B5 · ${summary.total} container · ${summary.ship} SHIP · ${summary.hold} HOLD · ${summary.topUp} TOP_UP`}
      />

      <div className="flex items-center gap-1 mb-5 border-b border-surface-3">
        {([
          { id: "packing", label: "Đóng hàng", icon: Package },
          { id: "routes", label: "Tuyến giao", icon: RouteIcon },
        ] as const).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2.5 text-table-sm font-medium border-b-2 transition-colors -mb-px",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-text-3 hover:text-text-1 hover:border-surface-3",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "packing" && (
        <div className="space-y-5">
          <PackingTab />
          <div>
            <h3 className="font-display text-section-header text-text-1 mb-2">Quyết định Giữ / Xuất container</h3>
            <HoldOrShipPanel />
          </div>
        </div>
      )}

      {tab === "routes" && <RoutesTab />}

      <button
        onClick={() => navigate("/orders")}
        className="mt-6 w-full rounded-card border border-primary/30 bg-primary/5 px-5 py-3 flex items-center justify-between hover:bg-primary/10 transition-colors group"
      >
        <div className="text-left">
          <div className="text-caption text-text-3 uppercase tracking-wider">Bước tiếp</div>
          <div className="text-table font-semibold text-text-1 mt-0.5">
            Đóng hàng xong → Duyệt PO/TO & release ERP
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-primary font-medium text-table-sm">
          Mở Orders <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>

      <ScreenFooter actionCount={summary.total} />
      </div>
    </AppLayout>
  );
}
