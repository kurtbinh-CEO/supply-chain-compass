import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Plus, Upload, X, AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useVersionConflict, VersionConflictDialog } from "@/components/VersionConflict";
import {
  SKU_BASES,
  SKU_VARIANTS,
  FACTORIES,
  BRANCHES,
  CN_DISTANCES,
  TRANSIT_LT,
  type NmId,
} from "@/data/unis-enterprise-dataset";

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */
const NM_BY_ID: Record<NmId, string> = FACTORIES.reduce((acc, f) => {
  acc[f.id] = f.name;
  return acc;
}, {} as Record<NmId, string>);

const variantCount = (baseCode: string) =>
  SKU_VARIANTS.filter((v) => v.baseCode === baseCode).length;

const fmtVnd = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : v.toLocaleString("vi-VN");

/* ────────────────────────────────────────────────────────────────────────── */
/* Tabs definition                                                            */
/* ────────────────────────────────────────────────────────────────────────── */
type TabKey =
  | "items"
  | "suppliers"
  | "branches"
  | "routes"
  | "distances"
  | "containers"
  | "quality";

const tabDefs: { key: TabKey; label: string }[] = [
  { key: "items",      label: "Mã hàng" },
  { key: "suppliers",  label: "NM" },
  { key: "branches",   label: "CN" },
  { key: "routes",     label: "Tuyến" },
  { key: "distances",  label: "Khoảng cách" },
  { key: "containers", label: "Container" },
  { key: "quality",    label: "Chất lượng dữ liệu" },
];

/* ────────────────────────────────────────────────────────────────────────── */
/* Reusable simple search header                                              */
/* ────────────────────────────────────────────────────────────────────────── */
function SearchToolbar({
  value, onChange, onAdd, onUpload, addLabel = "Thêm mới",
}: {
  value: string;
  onChange: (s: string) => void;
  onAdd?: () => void;
  onUpload?: () => void;
  addLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-3" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tìm kiếm..."
          className="w-full h-9 pl-9 pr-3 rounded-button border border-surface-3 bg-surface-0 text-table text-text-1 placeholder:text-text-3"
        />
      </div>
      {onAdd && (
        <button
          onClick={onAdd}
          className="h-9 px-3 rounded-button bg-gradient-primary text-primary-foreground text-table-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" /> {addLabel}
        </button>
      )}
      {onUpload && (
        <button
          onClick={onUpload}
          className="h-9 px-3 rounded-button border border-surface-3 bg-surface-2 text-text-2 text-table-sm font-medium flex items-center gap-1.5 hover:bg-surface-1 transition-colors"
        >
          <Upload className="h-3.5 w-3.5" /> Upload CSV
        </button>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB 1 — Mã hàng (SKU bases) with NM column + variant badge + Add modal    */
/* ────────────────────────────────────────────────────────────────────────── */
function ItemsTab() {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return SKU_BASES.filter(
      (b) =>
        b.code.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        NM_BY_ID[b.nmId].toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div className="space-y-3">
      <SearchToolbar
        value={search}
        onChange={setSearch}
        onAdd={() => setAdding(true)}
        onUpload={() => toast("Upload CSV (demo)")}
      />

      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <table className="w-full text-table">
          <thead>
            <tr className="bg-surface-1">
              {["Mã gốc", "Tên SKU", "Nhà máy", "Loại", "Đơn vị", "Đơn giá (VND/m²)", "Variants"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((b, i) => (
              <tr
                key={b.code}
                className={`${i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"} hover:bg-surface-3 cursor-pointer transition-colors`}
                onClick={() => toast(`Chỉnh sửa ${b.code} (demo)`)}
              >
                <td className="px-4 py-2.5 font-mono font-medium text-text-1">{b.code}</td>
                <td className="px-4 py-2.5 text-text-2">{b.name}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-info-bg text-info text-table-sm font-medium">
                    {NM_BY_ID[b.nmId]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-text-2">{b.category}</td>
                <td className="px-4 py-2.5 text-text-2">{b.unit}</td>
                <td className="px-4 py-2.5 text-text-2 tabular-nums">{b.unitPrice.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-1 border border-surface-3 text-text-2 text-table-sm tabular-nums">
                    {variantCount(b.code)} variant
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-table-sm text-text-3">{rows.length} / {SKU_BASES.length} mã gốc</p>

      {adding && <NewItemModal onClose={() => setAdding(false)} />}
    </div>
  );
}

function NewItemModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [nmId, setNmId] = useState<NmId | "">("");
  const [error, setError] = useState<string | null>(null);

  const onSave = () => {
    if (!code.trim() || !name.trim()) {
      setError("Mã gốc và tên là bắt buộc.");
      return;
    }
    if (!nmId) {
      setError("Phải chọn Nhà máy. 1 mã gốc bắt buộc gắn 1 NM duy nhất.");
      return;
    }
    toast.success(`Đã tạo ${code} → ${NM_BY_ID[nmId as NmId]}`);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-text-1/30 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[480px] max-w-full bg-surface-2 border-l border-surface-3 z-50 rounded-l-panel animate-slide-in-right shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-3">
          <h2 className="font-display text-section-header text-text-1">Tạo mã gốc mới</h2>
          <button onClick={onClose} className="text-text-3 hover:text-text-1 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="text-table-sm text-text-3 uppercase font-medium">Mã gốc *</label>
            <input
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
              placeholder="VD: GA-300"
              className="w-full h-10 mt-1 rounded-button border border-surface-3 bg-surface-0 px-3 text-table font-mono text-text-1"
            />
          </div>
          <div>
            <label className="text-table-sm text-text-3 uppercase font-medium">Tên SKU *</label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="Granite GA 30×30"
              className="w-full h-10 mt-1 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1"
            />
          </div>
          <div>
            <label className="text-table-sm text-text-3 uppercase font-medium">
              Nhà máy * <span className="text-text-3 normal-case">(1 mã gốc = 1 NM duy nhất)</span>
            </label>
            <select
              value={nmId}
              onChange={(e) => { setNmId(e.target.value as NmId); setError(null); }}
              className={`w-full h-10 mt-1 rounded-button border bg-surface-0 px-3 text-table text-text-1 ${
                error && !nmId ? "border-danger" : "border-surface-3"
              }`}
            >
              <option value="">— Chọn nhà máy —</option>
              {FACTORIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.region}) — LT {f.ltDays}d, Honoring {f.honoringPct}%
                </option>
              ))}
            </select>
          </div>
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-card bg-danger-bg border border-danger/30 text-danger text-table-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-surface-3 flex gap-2">
          <button
            onClick={onSave}
            className="flex-1 h-10 rounded-button bg-gradient-primary text-primary-foreground font-medium text-table hover:opacity-90 transition-opacity"
          >
            Lưu
          </button>
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-button border border-surface-3 text-text-2 text-table font-medium hover:bg-surface-1 transition-colors"
          >
            Huỷ
          </button>
        </div>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB 2 — NM (factories) full attribute table                                */
/* ────────────────────────────────────────────────────────────────────────── */
function SuppliersTab() {
  const [search, setSearch] = useState("");
  const rows = FACTORIES.filter(
    (f) => f.name.toLowerCase().includes(search.toLowerCase()) || f.code.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-3">
      <SearchToolbar value={search} onChange={setSearch} onAdd={() => toast("Thêm NM (demo)")} onUpload={() => toast("Upload CSV (demo)")} />
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <table className="w-full text-table">
          <thead>
            <tr className="bg-surface-1">
              {["Mã NM", "Tên", "Vùng", "LT (ngày)", "σ_LT", "MOQ (m²)", "Capacity/tháng", "Reliability", "Honoring", "Giá tier 1", "Giá tier 2"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((f, i) => (
              <tr key={f.id} className={`${i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"} hover:bg-surface-3 transition-colors`}>
                <td className="px-4 py-2.5 font-mono font-medium text-text-1">{f.code}</td>
                <td className="px-4 py-2.5 text-text-2">{f.name}</td>
                <td className="px-4 py-2.5 text-text-2">{f.region}</td>
                <td className="px-4 py-2.5 text-text-2 tabular-nums">{f.ltDays}</td>
                <td className="px-4 py-2.5 text-text-2 tabular-nums">{f.sigmaLt.toFixed(1)}</td>
                <td className="px-4 py-2.5 text-text-2 tabular-nums">{f.moqM2.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2.5 text-text-2 tabular-nums">{f.capacityM2Month.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2.5 tabular-nums">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-table-sm font-medium ${
                    f.reliability >= 0.9 ? "bg-success-bg text-success"
                      : f.reliability >= 0.7 ? "bg-warning-bg text-warning"
                      : "bg-danger-bg text-danger"
                  }`}>
                    {(f.reliability * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="px-4 py-2.5 text-text-2 tabular-nums">{f.honoringPct}%</td>
                <td className="px-4 py-2.5 text-text-2 tabular-nums">{fmtVnd(f.priceTier1)}</td>
                <td className="px-4 py-2.5 text-text-2 tabular-nums">{fmtVnd(f.priceTier2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-table-sm text-text-3">{rows.length} / {FACTORIES.length} nhà máy</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB 3 — CN (12 branches) with region, lat/lng, z-factor, SS               */
/* ────────────────────────────────────────────────────────────────────────── */
function BranchesTab() {
  const [search, setSearch] = useState("");
  const rows = BRANCHES.filter(
    (b) => b.name.toLowerCase().includes(search.toLowerCase()) || b.code.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-3">
      <SearchToolbar value={search} onChange={setSearch} onAdd={() => toast("Thêm CN (demo)")} onUpload={() => toast("Upload CSV (demo)")} />
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <table className="w-full text-table">
          <thead>
            <tr className="bg-surface-1">
              {["Mã CN", "Tên chi nhánh", "Vùng", "Lat", "Lng", "z-factor", "Mức phục vụ", "Quản lý"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((b, i) => {
              const sl = b.zFactor >= 1.96 ? "97.5%" : b.zFactor >= 1.65 ? "95%" : b.zFactor >= 1.5 ? "93.3%" : "90%";
              return (
                <tr key={b.code} className={`${i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"} hover:bg-surface-3 transition-colors`}>
                  <td className="px-4 py-2.5 font-mono font-medium text-text-1">{b.code}</td>
                  <td className="px-4 py-2.5 text-text-2">{b.name}</td>
                  <td className="px-4 py-2.5"><span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-1 border border-surface-3 text-text-2 text-table-sm">{b.region}</span></td>
                  <td className="px-4 py-2.5 text-text-2 tabular-nums">{b.lat.toFixed(4)}</td>
                  <td className="px-4 py-2.5 text-text-2 tabular-nums">{b.lng.toFixed(4)}</td>
                  <td className="px-4 py-2.5 text-text-2 tabular-nums">{b.zFactor.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-text-2">{sl}</td>
                  <td className="px-4 py-2.5 text-text-2">{b.manager}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-table-sm text-text-3">{rows.length} / {BRANCHES.length} chi nhánh</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB 4 — Tuyến (Transit LT matrix) — editable                              */
/* ────────────────────────────────────────────────────────────────────────── */
function RoutesTab() {
  const [mode, setMode] = useState<"NM_TO_CN" | "CN_TO_CN">("NM_TO_CN");
  const lanes = TRANSIT_LT.filter((t) => t.mode === mode);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode("NM_TO_CN")}
          className={`h-9 px-3 rounded-button text-table-sm font-medium transition-colors ${
            mode === "NM_TO_CN" ? "bg-gradient-primary text-primary-foreground" : "bg-surface-2 border border-surface-3 text-text-2 hover:bg-surface-1"
          }`}
        >
          NM → CN ({TRANSIT_LT.filter(t => t.mode === "NM_TO_CN").length} tuyến)
        </button>
        <button
          onClick={() => setMode("CN_TO_CN")}
          className={`h-9 px-3 rounded-button text-table-sm font-medium transition-colors ${
            mode === "CN_TO_CN" ? "bg-gradient-primary text-primary-foreground" : "bg-surface-2 border border-surface-3 text-text-2 hover:bg-surface-1"
          }`}
        >
          CN → CN (LCNB) ({TRANSIT_LT.filter(t => t.mode === "CN_TO_CN").length} tuyến)
        </button>
        <div className="ml-auto text-table-sm text-text-3">
          Click ô số để chỉnh sửa
        </div>
      </div>

      {mode === "NM_TO_CN" ? <NmCnMatrix /> : <CnCnLtMatrix />}
    </div>
  );
}

function NmCnMatrix() {
  const get = (nmCode: string, cnCode: string) =>
    TRANSIT_LT.find((t) => t.mode === "NM_TO_CN" && t.fromCode === nmCode && t.toCode === cnCode)?.days ?? "-";
  return (
    <div className="rounded-card border border-surface-3 bg-surface-2 overflow-x-auto">
      <table className="w-full text-table">
        <thead>
          <tr className="bg-surface-1">
            <th className="text-left px-3 py-2.5 text-table-header uppercase text-text-3 font-medium sticky left-0 bg-surface-1">NM \ CN</th>
            {BRANCHES.map((b) => (
              <th key={b.code} className="px-3 py-2.5 text-table-header uppercase text-text-3 font-medium text-center">{b.code}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FACTORIES.map((f, i) => (
            <tr key={f.id} className={i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"}>
              <td className="px-3 py-2.5 font-medium text-text-1 sticky left-0 bg-inherit">{f.name}</td>
              {BRANCHES.map((b) => (
                <td key={b.code} className="px-3 py-2.5 text-center tabular-nums">
                  <input
                    defaultValue={String(get(f.code, b.code))}
                    onBlur={(e) => toast(`${f.name} → ${b.code}: ${e.target.value}d (lưu demo)`)}
                    className="w-12 h-7 text-center rounded border border-surface-3 bg-surface-0 text-text-1 hover:border-primary focus:border-primary focus:outline-none"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CnCnLtMatrix() {
  const get = (from: string, to: string) =>
    TRANSIT_LT.find((t) => t.mode === "CN_TO_CN" && t.fromCode === from && t.toCode === to)?.days ?? null;
  return (
    <div className="rounded-card border border-surface-3 bg-surface-2 overflow-x-auto">
      <table className="w-full text-table">
        <thead>
          <tr className="bg-surface-1">
            <th className="text-left px-3 py-2.5 text-table-header uppercase text-text-3 font-medium sticky left-0 bg-surface-1">From \ To</th>
            {BRANCHES.map((b) => (
              <th key={b.code} className="px-3 py-2.5 text-table-header uppercase text-text-3 font-medium text-center">{b.code}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BRANCHES.map((from, i) => (
            <tr key={from.code} className={i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"}>
              <td className="px-3 py-2.5 font-medium text-text-1 sticky left-0 bg-inherit">{from.code}</td>
              {BRANCHES.map((to) => {
                const d = get(from.code, to.code);
                if (from.code === to.code) return <td key={to.code} className="px-3 py-2.5 text-center text-text-3">—</td>;
                if (d === null) return <td key={to.code} className="px-3 py-2.5 text-center text-text-3">·</td>;
                return (
                  <td key={to.code} className="px-3 py-2.5 text-center tabular-nums">
                    <input
                      defaultValue={String(d)}
                      onBlur={(e) => toast(`${from.code} → ${to.code}: ${e.target.value}d (lưu demo)`)}
                      className="w-12 h-7 text-center rounded border border-surface-3 bg-surface-0 text-text-1 hover:border-primary focus:border-primary focus:outline-none"
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB 5 — Khoảng cách CN↔CN (read-only)                                     */
/* ────────────────────────────────────────────────────────────────────────── */
function DistancesTab() {
  const get = (from: string, to: string) => {
    if (from === to) return 0;
    const d = CN_DISTANCES.find(
      (x) => (x.fromCn === from && x.toCn === to) || (x.fromCn === to && x.toCn === from),
    );
    return d?.km ?? null;
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-table-sm text-text-3">
          Ma trận khoảng cách CN↔CN (chỉ đọc, dùng cho LCNB ≤ 500 km).
        </p>
        <span className="text-table-sm text-text-3">{CN_DISTANCES.length} cặp</span>
      </div>
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-x-auto">
        <table className="w-full text-table">
          <thead>
            <tr className="bg-surface-1">
              <th className="text-left px-3 py-2.5 text-table-header uppercase text-text-3 font-medium sticky left-0 bg-surface-1">CN \ CN</th>
              {BRANCHES.map((b) => (
                <th key={b.code} className="px-3 py-2.5 text-table-header uppercase text-text-3 font-medium text-center">{b.code}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BRANCHES.map((from, i) => (
              <tr key={from.code} className={i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"}>
                <td className="px-3 py-2.5 font-medium text-text-1 sticky left-0 bg-inherit">{from.code}</td>
                {BRANCHES.map((to) => {
                  const km = get(from.code, to.code);
                  if (from.code === to.code) return <td key={to.code} className="px-3 py-2.5 text-center text-text-3">—</td>;
                  if (km === null) return <td key={to.code} className="px-3 py-2.5 text-center text-text-3">·</td>;
                  const tone = km < 100 ? "text-success" : km < 300 ? "text-info" : km < 500 ? "text-warning" : "text-text-3";
                  return (
                    <td key={to.code} className={`px-3 py-2.5 text-center tabular-nums ${tone}`}>
                      {km.toLocaleString("vi-VN")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 text-table-sm text-text-3">
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> &lt; 100 km</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-info" /> 100–300 km</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> 300–500 km</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-surface-3" /> &gt; 500 km / không xét LCNB</span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB 6 — Container types                                                    */
/* ────────────────────────────────────────────────────────────────────────── */
const CONTAINER_TYPES = [
  { code: "20FT",   name: "Container 20ft",  capacityM2: 900,   palletLimit: 10, weightLimitKg: 18000, costPerKm: 12000, note: "Đường dài, fill ≥ 60%" },
  { code: "40FT",   name: "Container 40ft",  capacityM2: 1800,  palletLimit: 22, weightLimitKg: 26000, costPerKm: 16000, note: "Đường dài, fill ≥ 60%" },
  { code: "TRUCK10",name: "Truck 10 tấn",    capacityM2: 600,   palletLimit: 8,  weightLimitKg: 10000, costPerKm: 9000,  note: "Nội vùng, LCNB" },
];

function ContainersTab() {
  return (
    <div className="space-y-3">
      <SearchToolbar value="" onChange={() => {}} onAdd={() => toast("Thêm loại container (demo)")} />
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <table className="w-full text-table">
          <thead>
            <tr className="bg-surface-1">
              {["Mã", "Tên", "Sức chứa (m²)", "Pallet limit", "Tải trọng (kg)", "Cước (VND/km)", "Ghi chú"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CONTAINER_TYPES.map((c, i) => (
              <tr key={c.code} className={`${i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"} hover:bg-surface-3 transition-colors`}>
                <td className="px-4 py-2.5 font-mono font-medium text-text-1">{c.code}</td>
                <td className="px-4 py-2.5 text-text-2">{c.name}</td>
                <td className="px-4 py-2.5 text-text-2 tabular-nums">{c.capacityM2.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2.5 text-text-2 tabular-nums">{c.palletLimit}</td>
                <td className="px-4 py-2.5 text-text-2 tabular-nums">{c.weightLimitKg.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2.5 text-text-2 tabular-nums">{c.costPerKm.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2.5 text-text-3">{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB 7 — Chất lượng dữ liệu                                                 */
/* ────────────────────────────────────────────────────────────────────────── */
interface DataIssue {
  id: string;
  severity: "high" | "medium" | "low";
  entity: string;
  description: string;
  fixRoute: string;
}

function QualityTab() {
  const navigate = useNavigate();

  const issues: DataIssue[] = useMemo(() => {
    const out: DataIssue[] = [];

    // SKU thiếu NM (single-source rule)
    SKU_BASES.forEach((b) => {
      if (!b.nmId || !FACTORIES.some((f) => f.id === b.nmId)) {
        out.push({
          id: `sku-nm-${b.code}`,
          severity: "high",
          entity: `SKU ${b.code}`,
          description: `Mã gốc ${b.code} chưa gắn NM (vi phạm rule 1 NM/1 mã gốc).`,
          fixRoute: "/master-data?tab=items",
        });
      }
    });

    // Variant thiếu base
    SKU_VARIANTS.forEach((v) => {
      if (!SKU_BASES.some((b) => b.code === v.baseCode)) {
        out.push({
          id: `var-base-${v.code}`,
          severity: "high",
          entity: `Variant ${v.code}`,
          description: `Variant ${v.code} đang trỏ tới mã gốc không tồn tại (${v.baseCode}).`,
          fixRoute: "/master-data?tab=items",
        });
      }
    });

    // CN thiếu toạ độ
    BRANCHES.forEach((b) => {
      if (b.lat === 0 || b.lng === 0) {
        out.push({
          id: `cn-geo-${b.code}`,
          severity: "medium",
          entity: `CN ${b.code}`,
          description: `${b.name} chưa có toạ độ lat/lng — không tính được khoảng cách LCNB.`,
          fixRoute: "/master-data?tab=branches",
        });
      }
    });

    // Demo: 2 issue minh hoạ để gauge < 100%
    out.push({
      id: "demo-honoring-phumy",
      severity: "high",
      entity: "NM Phú Mỹ",
      description: "Honoring 45% < ngưỡng 80% — đang block auto-PO.",
      fixRoute: "/master-data?tab=suppliers",
    });
    out.push({
      id: "demo-stale-phumy",
      severity: "medium",
      entity: "NM Phú Mỹ",
      description: "Tồn kho không cập nhật > 48h (Stale). Cần liên hệ để sync.",
      fixRoute: "/supply",
    });

    return out;
  }, []);

  // Completeness — tính trên 4 trục: SKU/NM/Variant/CN
  const totalChecks = SKU_BASES.length + SKU_VARIANTS.length + BRANCHES.length + FACTORIES.length;
  const realIssueCount = issues.filter((i) => !i.id.startsWith("demo-")).length;
  const completenessPct = Math.max(
    0,
    Math.min(100, Math.round(((totalChecks - realIssueCount) / totalChecks) * 100)),
  );
  // We aim the demo gauge at 96% as briefed
  const displayedPct = realIssueCount === 0 ? 96 : completenessPct;

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayedPct / 100) * circumference;
  const tone =
    displayedPct >= 95 ? "text-success" : displayedPct >= 85 ? "text-warning" : "text-danger";

  return (
    <div className="space-y-4">
      {/* Gauge + summary */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
        <div className="rounded-card border border-surface-3 bg-surface-2 p-4 flex flex-col items-center justify-center">
          <div className="relative w-[140px] h-[140px]">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r={radius} className="stroke-surface-3 fill-none" strokeWidth="10" />
              <circle
                cx="70" cy="70" r={radius}
                className={`${tone} fill-none transition-all duration-700`}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                stroke="currentColor"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-display text-[28px] font-bold tabular-nums ${tone}`}>{displayedPct}%</span>
              <span className="text-table-sm text-text-3 uppercase tracking-wide">Hoàn chỉnh</span>
            </div>
          </div>
        </div>
        <div className="rounded-card border border-surface-3 bg-surface-2 p-4 flex flex-col gap-3">
          <h3 className="font-display text-section-header text-text-1">Chất lượng dữ liệu nền</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Mã gốc" value={`${SKU_BASES.length}`} sub={`${SKU_VARIANTS.length} variants`} />
            <Stat label="Nhà máy" value={`${FACTORIES.length}`} sub="single-source" />
            <Stat label="Chi nhánh" value={`${BRANCHES.length}`} sub="có toạ độ" />
            <Stat label="Issue" value={`${issues.length}`} sub={`${issues.filter((i) => i.severity === "high").length} cao`} tone={issues.length === 0 ? "success" : "warning"} />
          </div>
        </div>
      </div>

      {/* Issue list */}
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-3 flex items-center justify-between">
          <h4 className="font-display text-section-header text-text-1">Danh sách vấn đề ({issues.length})</h4>
          {issues.length === 0 && (
            <span className="inline-flex items-center gap-1 text-success text-table-sm">
              <CheckCircle2 className="h-4 w-4" /> Không có vấn đề
            </span>
          )}
        </div>
        <ul className="divide-y divide-surface-3">
          {issues.map((iss) => {
            const sevTone =
              iss.severity === "high" ? "bg-danger-bg text-danger"
              : iss.severity === "medium" ? "bg-warning-bg text-warning"
              : "bg-info-bg text-info";
            return (
              <li key={iss.id} className="px-4 py-3 flex items-center gap-3 hover:bg-surface-1 transition-colors">
                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-table-sm font-medium ${sevTone} uppercase`}>
                  {iss.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text-1 text-table">{iss.entity}</div>
                  <div className="text-text-3 text-table-sm">{iss.description}</div>
                </div>
                <button
                  onClick={() => { toast(`Mở ${iss.fixRoute}`); navigate(iss.fixRoute.split("?")[0]); }}
                  className="h-8 px-3 rounded-button bg-gradient-primary text-primary-foreground text-table-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity shrink-0"
                >
                  <Wrench className="h-3.5 w-3.5" /> Sửa ngay
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone = "default" }: { label: string; value: string; sub?: string; tone?: "default" | "success" | "warning" }) {
  const valueTone = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-text-1";
  return (
    <div className="rounded-card bg-surface-1 border border-surface-3 p-3">
      <div className="text-table-sm text-text-3 uppercase tracking-wide">{label}</div>
      <div className={`font-display text-[22px] font-bold tabular-nums ${valueTone}`}>{value}</div>
      {sub && <div className="text-table-sm text-text-3">{sub}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* MAIN PAGE                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */
export default function MasterDataPage() {
  const { conflict: mdConflict, clearConflict: clearMdConflict } = useVersionConflict();

  return (
    <AppLayout>
      <ScreenHeader title="Dữ liệu gốc" subtitle="Single source of truth — SKU · NM · CN · Tuyến · Container" />

      {mdConflict && (
        <VersionConflictDialog
          conflict={mdConflict}
          onReload={clearMdConflict}
          onForceUpdate={() => { clearMdConflict(); toast.success("Đã ghi đè. Audit logged."); }}
          onClose={clearMdConflict}
        />
      )}

      <Tabs defaultValue="items">
        <TabsList className="bg-surface-1 border border-surface-3 mb-4 flex flex-wrap h-auto">
          {tabDefs.map((t) => (
            <TabsTrigger
              key={t.key}
              value={t.key}
              className="data-[state=active]:bg-surface-2 data-[state=active]:text-text-1 text-text-2 text-table"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="items"><ItemsTab /></TabsContent>
        <TabsContent value="suppliers"><SuppliersTab /></TabsContent>
        <TabsContent value="branches"><BranchesTab /></TabsContent>
        <TabsContent value="routes"><RoutesTab /></TabsContent>
        <TabsContent value="distances"><DistancesTab /></TabsContent>
        <TabsContent value="containers"><ContainersTab /></TabsContent>
        <TabsContent value="quality"><QualityTab /></TabsContent>
      </Tabs>

      <ScreenFooter actionCount={5} />
    </AppLayout>
  );
}
