import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Plus, Upload, X, AlertTriangle, CheckCircle2, Wrench, Inbox, Zap, FileSpreadsheet, PenLine } from "lucide-react";
import { toast } from "sonner";
import { useVersionConflict, VersionConflictDialog } from "@/components/VersionConflict";
import { PriceListsTab } from "@/components/master/PriceListsTab";
import { CarriersTab } from "@/components/master/CarriersTab";
import { DataSourceSelector, type DataSource } from "@/components/DataSourceSelector";
import {
  CrudToolbar,
  EntityFormDialog,
  DeleteConfirmDialog,
  RowActions,
  exportToCsv,
  type FormField,
} from "@/components/master/CrudPrimitives";
import { Button } from "@/components/ui/button";
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
  | "pricelists"
  | "branches"
  | "routes"
  | "carriers"
  | "distances"
  | "containers"
  | "quality";

const tabDefs: { key: TabKey; label: string }[] = [
  { key: "items",      label: "Mã hàng" },
  { key: "suppliers",  label: "NM" },
  { key: "pricelists", label: "Bảng giá" },
  { key: "branches",   label: "CN" },
  { key: "routes",     label: "Tuyến" },
  { key: "carriers",   label: "Nhà xe" },
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
/* TAB 1 — Mã hàng (SKU bases) — Full CRUD                                   */
/* ────────────────────────────────────────────────────────────────────────── */
const ITEM_FIELDS: FormField[] = [
  { key: "code",      label: "Mã gốc", type: "text", required: true, mono: true, placeholder: "VD: GA-300", readOnlyOnEdit: true, span: 1 },
  { key: "name",      label: "Tên SKU", type: "text", required: true, placeholder: "Granite GA 30×30", span: 1 },
  { key: "nmId",      label: "Nhà máy", type: "select", required: true, span: 1,
    options: FACTORIES.map((f) => ({ value: f.id, label: `${f.name} (${f.region})` })),
    hint: "1 mã gốc = 1 NM duy nhất",
  },
  { key: "category",  label: "Loại", type: "text", placeholder: "Granite / Ceramic", span: 1 },
  { key: "unit",      label: "Đơn vị", type: "text", placeholder: "m²", span: 1 },
  { key: "unitPrice", label: "Đơn giá (VND/m²)", type: "number", placeholder: "180000", span: 1 },
];

function ItemsTab() {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<typeof SKU_BASES[number] | null>(null);
  const [deleting, setDeleting] = useState<typeof SKU_BASES[number] | null>(null);

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
      <CrudToolbar
        search={search}
        onSearchChange={setSearch}
        onAdd={() => setAdding(true)}
        onImport={(src) => toast.success(`Nhập mã hàng từ ${src} (demo)`)}
        onExport={() =>
          exportToCsv(
            "ma_hang",
            rows.map((b) => ({
              ma_goc: b.code,
              ten: b.name,
              nha_may: NM_BY_ID[b.nmId],
              loai: b.category,
              don_vi: b.unit,
              don_gia: b.unitPrice,
              variants: variantCount(b.code),
            })),
          )
        }
        addLabel="Thêm mã hàng"
        importTitle="Nhập danh mục mã hàng"
        importDescription="Chọn nguồn nhập SKU hàng loạt"
        placeholder="Tìm theo mã, tên, NM..."
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
              <th className="px-4 py-2.5 text-right text-table-header uppercase text-text-3 font-medium w-[88px]">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b, i) => (
              <tr
                key={b.code}
                className={`group ${i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"} hover:bg-surface-3 transition-colors`}
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
                <td className="px-4 py-2.5">
                  <RowActions onEdit={() => setEditing(b)} onDelete={() => setDeleting(b)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-table-sm text-text-3">{rows.length} / {SKU_BASES.length} mã gốc</p>

      <EntityFormDialog
        open={adding}
        mode="create"
        entityName="mã hàng"
        fields={ITEM_FIELDS}
        onClose={() => setAdding(false)}
        onSave={(v) => {
          toast.success(`Đã tạo ${v.code} → ${NM_BY_ID[v.nmId as NmId] ?? v.nmId} (demo)`);
          setAdding(false);
        }}
      />

      <EntityFormDialog
        open={!!editing}
        mode="edit"
        entityName="mã hàng"
        fields={ITEM_FIELDS}
        initialValues={editing ? {
          code: editing.code,
          name: editing.name,
          nmId: editing.nmId,
          category: editing.category,
          unit: editing.unit,
          unitPrice: editing.unitPrice,
        } : undefined}
        onClose={() => setEditing(null)}
        onSave={(v) => {
          toast.success(`Đã cập nhật ${v.code} (demo)`);
          setEditing(null);
        }}
      />

      <DeleteConfirmDialog
        open={!!deleting}
        entityLabel={deleting ? `mã ${deleting.code}` : ""}
        description={
          deleting
            ? `Mã ${deleting.code} đang có ${variantCount(deleting.code)} variants. Xóa sẽ ảnh hưởng forecast & PO.`
            : undefined
        }
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          toast.success(`Đã xóa ${deleting?.code} (demo)`);
          setDeleting(null);
        }}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB 2 — NM (factories) full attribute table                                */
/* ────────────────────────────────────────────────────────────────────────── */
const SUPPLIER_FIELDS: FormField[] = [
  { key: "code",            label: "Mã NM", type: "text", required: true, mono: true, placeholder: "VD: NM-MIK", readOnlyOnEdit: true, span: 1 },
  { key: "name",            label: "Tên nhà máy", type: "text", required: true, placeholder: "Mikado Ceramics", span: 1 },
  { key: "region",          label: "Vùng", type: "select", required: true, span: 1,
    options: [
      { value: "Bắc",   label: "Bắc" },
      { value: "Trung", label: "Trung" },
      { value: "Nam",   label: "Nam" },
    ],
  },
  { key: "ltDays",          label: "LT (ngày)", type: "number", required: true, span: 1 },
  { key: "sigmaLt",         label: "σ_LT", type: "number", placeholder: "1.5", span: 1 },
  { key: "moqM2",           label: "MOQ (m²)", type: "number", span: 1 },
  { key: "capacityM2Month", label: "Capacity / tháng", type: "number", span: 1 },
  { key: "honoringPct",     label: "Honoring %", type: "number", placeholder: "85", span: 1 },
  { key: "priceTier1",      label: "Giá tier 1 (VND)", type: "number", span: 1 },
  { key: "priceTier2",      label: "Giá tier 2 (VND)", type: "number", span: 1 },
];

function SuppliersTab() {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<typeof FACTORIES[number] | null>(null);
  const [deleting, setDeleting] = useState<typeof FACTORIES[number] | null>(null);

  const rows = FACTORIES.filter(
    (f) => f.name.toLowerCase().includes(search.toLowerCase()) || f.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <CrudToolbar
        search={search}
        onSearchChange={setSearch}
        onAdd={() => setAdding(true)}
        onImport={(src) => toast.success(`Nhập NM từ ${src} (demo)`)}
        onExport={() =>
          exportToCsv(
            "nha_may",
            rows.map((f) => ({
              ma_nm: f.code, ten: f.name, vung: f.region,
              lt_ngay: f.ltDays, sigma_lt: f.sigmaLt,
              moq_m2: f.moqM2, capacity_thang: f.capacityM2Month,
              reliability_pct: Math.round(f.reliability * 100),
              honoring_pct: f.honoringPct,
              gia_tier1: f.priceTier1, gia_tier2: f.priceTier2,
            })),
          )
        }
        addLabel="Thêm NM"
        importTitle="Nhập danh sách NM"
        importDescription="Chọn nguồn nhập nhà máy hàng loạt"
        placeholder="Tìm theo mã, tên NM..."
      />
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <table className="w-full text-table">
          <thead>
            <tr className="bg-surface-1">
              {["Mã NM", "Tên", "Vùng", "LT (ngày)", "σ_LT", "MOQ (m²)", "Capacity/tháng", "Reliability", "Honoring", "Giá tier 1", "Giá tier 2"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 font-medium">{h}</th>
              ))}
              <th className="px-4 py-2.5 text-right text-table-header uppercase text-text-3 font-medium w-[88px]">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f, i) => (
              <tr key={f.id} className={`group ${i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"} hover:bg-surface-3 transition-colors`}>
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
                <td className="px-4 py-2.5">
                  <RowActions onEdit={() => setEditing(f)} onDelete={() => setDeleting(f)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-table-sm text-text-3">{rows.length} / {FACTORIES.length} nhà máy</p>

      <EntityFormDialog
        open={adding}
        mode="create"
        entityName="nhà máy"
        fields={SUPPLIER_FIELDS}
        onClose={() => setAdding(false)}
        onSave={(v) => {
          toast.success(`Đã tạo NM ${v.name} (demo)`);
          setAdding(false);
        }}
      />
      <EntityFormDialog
        open={!!editing}
        mode="edit"
        entityName="nhà máy"
        fields={SUPPLIER_FIELDS}
        initialValues={editing ? {
          code: editing.code, name: editing.name, region: editing.region,
          ltDays: editing.ltDays, sigmaLt: editing.sigmaLt,
          moqM2: editing.moqM2, capacityM2Month: editing.capacityM2Month,
          honoringPct: editing.honoringPct,
          priceTier1: editing.priceTier1, priceTier2: editing.priceTier2,
        } : undefined}
        onClose={() => setEditing(null)}
        onSave={(v) => {
          toast.success(`Đã cập nhật NM ${v.name} (demo)`);
          setEditing(null);
        }}
      />
      <DeleteConfirmDialog
        open={!!deleting}
        entityLabel={deleting ? `NM ${deleting.name}` : ""}
        description={
          deleting
            ? `NM ${deleting.name} đang gắn với mã hàng và PO. Xóa sẽ làm gãy data link — cân nhắc kỹ.`
            : undefined
        }
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          toast.success(`Đã xóa NM ${deleting?.name} (demo)`);
          setDeleting(null);
        }}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAB 3 — CN (12 branches) with region, lat/lng, z-factor, SS               */
/* ────────────────────────────────────────────────────────────────────────── */
const BRANCH_FIELDS: FormField[] = [
  { key: "code",    label: "Mã CN", type: "text", required: true, mono: true, placeholder: "VD: CN-HCM", readOnlyOnEdit: true, span: 1 },
  { key: "name",    label: "Tên chi nhánh", type: "text", required: true, placeholder: "CN Hồ Chí Minh", span: 1 },
  { key: "region",  label: "Vùng", type: "select", required: true, span: 1,
    options: [
      { value: "Bắc",   label: "Bắc" },
      { value: "Trung", label: "Trung" },
      { value: "Nam",   label: "Nam" },
    ],
  },
  { key: "manager", label: "Quản lý", type: "text", placeholder: "Nguyễn Văn A", span: 1 },
  { key: "lat",     label: "Lat", type: "number", placeholder: "10.7769", span: 1, hint: "Vĩ độ" },
  { key: "lng",     label: "Lng", type: "number", placeholder: "106.7009", span: 1, hint: "Kinh độ" },
  { key: "zFactor", label: "z-factor", type: "number", placeholder: "1.65", span: 2, hint: "1.65 ≈ 95% mức phục vụ" },
];

function BranchesTab() {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<typeof BRANCHES[number] | null>(null);
  const [deleting, setDeleting] = useState<typeof BRANCHES[number] | null>(null);

  const rows = BRANCHES.filter(
    (b) => b.name.toLowerCase().includes(search.toLowerCase()) || b.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <CrudToolbar
        search={search}
        onSearchChange={setSearch}
        onAdd={() => setAdding(true)}
        onImport={(src) => toast.success(`Nhập CN từ ${src} (demo)`)}
        onExport={() =>
          exportToCsv(
            "chi_nhanh",
            rows.map((b) => ({
              ma_cn: b.code, ten: b.name, vung: b.region,
              lat: b.lat, lng: b.lng, z_factor: b.zFactor, quan_ly: b.manager,
            })),
          )
        }
        addLabel="Thêm CN"
        importTitle="Nhập danh sách chi nhánh"
        importDescription="Chọn nguồn nhập CN hàng loạt"
        placeholder="Tìm theo mã, tên CN..."
      />
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <table className="w-full text-table">
          <thead>
            <tr className="bg-surface-1">
              {["Mã CN", "Tên chi nhánh", "Vùng", "Lat", "Lng", "z-factor", "Mức phục vụ", "Quản lý"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 font-medium">{h}</th>
              ))}
              <th className="px-4 py-2.5 text-right text-table-header uppercase text-text-3 font-medium w-[88px]">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b, i) => {
              const sl = b.zFactor >= 1.96 ? "97.5%" : b.zFactor >= 1.65 ? "95%" : b.zFactor >= 1.5 ? "93.3%" : "90%";
              return (
                <tr key={b.code} className={`group ${i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"} hover:bg-surface-3 transition-colors`}>
                  <td className="px-4 py-2.5 font-mono font-medium text-text-1">{b.code}</td>
                  <td className="px-4 py-2.5 text-text-2">{b.name}</td>
                  <td className="px-4 py-2.5"><span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-1 border border-surface-3 text-text-2 text-table-sm">{b.region}</span></td>
                  <td className="px-4 py-2.5 text-text-2 tabular-nums">{b.lat.toFixed(4)}</td>
                  <td className="px-4 py-2.5 text-text-2 tabular-nums">{b.lng.toFixed(4)}</td>
                  <td className="px-4 py-2.5 text-text-2 tabular-nums">{b.zFactor.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-text-2">{sl}</td>
                  <td className="px-4 py-2.5 text-text-2">{b.manager}</td>
                  <td className="px-4 py-2.5">
                    <RowActions onEdit={() => setEditing(b)} onDelete={() => setDeleting(b)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-table-sm text-text-3">{rows.length} / {BRANCHES.length} chi nhánh</p>

      <EntityFormDialog
        open={adding}
        mode="create"
        entityName="chi nhánh"
        fields={BRANCH_FIELDS}
        onClose={() => setAdding(false)}
        onSave={(v) => {
          toast.success(`Đã tạo CN ${v.name} (demo)`);
          setAdding(false);
        }}
      />
      <EntityFormDialog
        open={!!editing}
        mode="edit"
        entityName="chi nhánh"
        fields={BRANCH_FIELDS}
        initialValues={editing ? {
          code: editing.code, name: editing.name, region: editing.region,
          manager: editing.manager, lat: editing.lat, lng: editing.lng, zFactor: editing.zFactor,
        } : undefined}
        onClose={() => setEditing(null)}
        onSave={(v) => {
          toast.success(`Đã cập nhật CN ${v.name} (demo)`);
          setEditing(null);
        }}
      />
      <DeleteConfirmDialog
        open={!!deleting}
        entityLabel={deleting ? `CN ${deleting.name}` : ""}
        description={
          deleting
            ? `Xóa CN ${deleting.name} sẽ ảnh hưởng allocation, transit LT và tồn kho liên quan.`
            : undefined
        }
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          toast.success(`Đã xóa CN ${deleting?.name} (demo)`);
          setDeleting(null);
        }}
      />
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

const CONTAINER_FIELDS: FormField[] = [
  { key: "code",          label: "Mã loại", type: "text", required: true, mono: true, placeholder: "VD: 20FT", readOnlyOnEdit: true, span: 1 },
  { key: "name",          label: "Tên loại", type: "text", required: true, placeholder: "Container 20ft", span: 1 },
  { key: "capacityM2",    label: "Sức chứa (m²)", type: "number", required: true, span: 1 },
  { key: "palletLimit",   label: "Số pallet tối đa", type: "number", required: true, span: 1 },
  { key: "weightLimitKg", label: "Tải trọng (kg)", type: "number", required: true, span: 1 },
  { key: "costPerKm",     label: "Cước (VND/km)", type: "number", required: true, span: 1 },
  { key: "note",          label: "Ghi chú", type: "textarea", placeholder: "Đường dài, fill ≥ 60%...", span: 2 },
];

function ContainersTab() {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<typeof CONTAINER_TYPES[number] | null>(null);
  const [deleting, setDeleting] = useState<typeof CONTAINER_TYPES[number] | null>(null);

  const rows = CONTAINER_TYPES.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <CrudToolbar
        search={search}
        onSearchChange={setSearch}
        onAdd={() => setAdding(true)}
        onImport={(src) => toast.success(`Nhập loại container từ ${src} (demo)`)}
        onExport={() =>
          exportToCsv(
            "container",
            rows.map((c) => ({
              ma: c.code, ten: c.name, suc_chua_m2: c.capacityM2,
              pallet_limit: c.palletLimit, tai_trong_kg: c.weightLimitKg,
              cuoc_vnd_km: c.costPerKm, ghi_chu: c.note,
            })),
          )
        }
        addLabel="Thêm loại container"
        importTitle="Nhập loại container"
        importDescription="Chọn nguồn nhập danh mục container"
        placeholder="Tìm theo mã, tên..."
      />
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <table className="w-full text-table">
          <thead>
            <tr className="bg-surface-1">
              {["Mã", "Tên", "Sức chứa (m²)", "Pallet limit", "Tải trọng (kg)", "Cước (VND/km)", "Ghi chú"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 font-medium">{h}</th>
              ))}
              <th className="px-4 py-2.5 text-right text-table-header uppercase text-text-3 font-medium w-[88px]">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={c.code} className={`group ${i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"} hover:bg-surface-3 transition-colors`}>
                <td className="px-4 py-2.5 font-mono font-medium text-text-1">{c.code}</td>
                <td className="px-4 py-2.5 text-text-2">{c.name}</td>
                <td className="px-4 py-2.5 text-text-2 tabular-nums">{c.capacityM2.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2.5 text-text-2 tabular-nums">{c.palletLimit}</td>
                <td className="px-4 py-2.5 text-text-2 tabular-nums">{c.weightLimitKg.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2.5 text-text-2 tabular-nums">{c.costPerKm.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2.5 text-text-3">{c.note}</td>
                <td className="px-4 py-2.5">
                  <RowActions onEdit={() => setEditing(c)} onDelete={() => setDeleting(c)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-table-sm text-text-3">{rows.length} / {CONTAINER_TYPES.length} loại container</p>

      <EntityFormDialog
        open={adding}
        mode="create"
        entityName="loại container"
        fields={CONTAINER_FIELDS}
        onClose={() => setAdding(false)}
        onSave={(v) => {
          toast.success(`Đã tạo loại container ${v.code} (demo)`);
          setAdding(false);
        }}
      />
      <EntityFormDialog
        open={!!editing}
        mode="edit"
        entityName="loại container"
        fields={CONTAINER_FIELDS}
        initialValues={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSave={(v) => {
          toast.success(`Đã cập nhật ${v.code} (demo)`);
          setEditing(null);
        }}
      />
      <DeleteConfirmDialog
        open={!!deleting}
        entityLabel={deleting ? `loại ${deleting.code}` : ""}
        description={
          deleting
            ? `Xóa loại ${deleting.code} sẽ ảnh hưởng tính cước & gom hàng các tuyến đang dùng.`
            : undefined
        }
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          toast.success(`Đã xóa ${deleting?.code} (demo)`);
          setDeleting(null);
        }}
      />
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
const PRICE_SOURCES: DataSource[] = [
  {
    key: "api_sync",
    icon: <Zap />,
    title: "Tích hợp ERP NM",
    description: "Đồng bộ bảng giá từ SAP / Oracle NM. Cần thiết lập connector.",
    badge: "Sắp có",
    badgeColor: "gray",
    disabled: true,
    configurable: true,
    configRoute: "/config?tab=integration",
  },
  {
    key: "excel_upload",
    icon: <FileSpreadsheet />,
    title: "Upload Excel bảng giá",
    description: "Upload file bảng giá NM theo template. Cột: NM, SKU, MOQ breaks, Hiệu lực, Phụ phí.",
    badge: "Khuyến nghị",
    badgeColor: "green",
  },
  {
    key: "manual_input",
    icon: <PenLine />,
    title: "Nhập tay",
    description: "Nhập từng dòng giá trực tiếp. Phù hợp khi NM gửi báo giá qua Zalo/email.",
  },
];

const FREIGHT_SOURCES: DataSource[] = [
  {
    key: "excel_upload",
    icon: <FileSpreadsheet />,
    title: "Upload Excel cước vận chuyển",
    description: "Upload bảng cước theo template. Cột: Tuyến, Loại xe, Cước/chuyến, Phụ phí.",
    badge: "Khuyến nghị",
    badgeColor: "green",
  },
  {
    key: "manual_input",
    icon: <PenLine />,
    title: "Nhập tay",
    description: "Nhập từng tuyến/cước trực tiếp.",
  },
];

export default function MasterDataPage() {
  const { conflict: mdConflict, clearConflict: clearMdConflict } = useVersionConflict();
  const [activeTab, setActiveTab] = useState("items");
  const [importerOpen, setImporterOpen] = useState<null | "price" | "freight">(null);

  const importerLabel: Record<string, { title: string; sources: DataSource[] }> = {
    price: { title: "Nhập bảng giá NM", sources: PRICE_SOURCES },
    freight: { title: "Nhập cước vận chuyển", sources: FREIGHT_SOURCES },
  };
  const current = importerOpen ? importerLabel[importerOpen] : null;

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

      {current && (
        <DataSourceSelector
          open={importerOpen !== null}
          onClose={() => setImporterOpen(null)}
          title={current.title}
          description="Chọn nguồn nhập dữ liệu. Mỗi lần tạo 1 entry trong nhật ký."
          sources={current.sources}
          onSelect={(key) => {
            setImporterOpen(null);
            toast.success(`Đã chọn: ${key}`);
          }}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4 gap-3">
          <TabsList className="bg-surface-1 border border-surface-3 flex flex-wrap h-auto">
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

          {activeTab === "pricelists" && (
            <Button size="sm" onClick={() => setImporterOpen("price")} className="h-8 gap-1.5 shrink-0">
              <Inbox className="h-3.5 w-3.5" />
              Nhập bảng giá
            </Button>
          )}
          {activeTab === "routes" && (
            <Button size="sm" onClick={() => setImporterOpen("freight")} className="h-8 gap-1.5 shrink-0">
              <Inbox className="h-3.5 w-3.5" />
              Nhập cước
            </Button>
          )}
        </div>

        <TabsContent value="items"><ItemsTab /></TabsContent>
        <TabsContent value="suppliers"><SuppliersTab /></TabsContent>
        <TabsContent value="pricelists"><PriceListsTab /></TabsContent>
        <TabsContent value="branches"><BranchesTab /></TabsContent>
        <TabsContent value="routes"><RoutesTab /></TabsContent>
        <TabsContent value="carriers"><CarriersTab /></TabsContent>
        <TabsContent value="distances"><DistancesTab /></TabsContent>
        <TabsContent value="containers"><ContainersTab /></TabsContent>
        <TabsContent value="quality"><QualityTab /></TabsContent>
      </Tabs>

      <ScreenFooter actionCount={5} />
    </AppLayout>
  );
}
