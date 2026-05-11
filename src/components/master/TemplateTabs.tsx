/**
 * Template Tabs — 5 tabs CRUD mới cho Master Data dùng useEntityCrud.
 * Mỗi tab: SmartTable + EntityFormDialog + soft-delete confirm.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CrudToolbar, EntityFormDialog, DeleteConfirmDialog, RowActions, type FormField } from "./CrudPrimitives";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import { useEntityList, useEntityCrud, type CrudTable } from "@/hooks/useEntityCrud";
import { useUserTenantId } from "@/hooks/useUserTenantId";

type Row = Record<string, any> & { id: string };

interface GenericTabConfig {
  table: CrudTable;
  entityName: string;
  codeField: string;
  addLabel: string;
  searchKeys: string[];
  fields: FormField[];
  columns: (rows: Row[]) => SmartTableColumn<Row>[];
  /** Map form values -> insert payload */
  toPayload: (v: Record<string, string>) => Record<string, unknown>;
  /** Optional row-level validation; throw Error to block save */
  validate?: (v: Record<string, string>) => string | null;
}

function useGenericCrudTab(cfg: GenericTabConfig) {
  const { data: tenantId } = useUserTenantId();
  const { data: rows = [], isLoading } = useEntityList(cfg.table, tenantId);
  const { create, update, softDelete } = useEntityCrud({
    table: cfg.table, tenantId, codeField: cfg.codeField, entityName: cfg.entityName,
  });

  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) =>
      cfg.searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(q))
    );
  }, [rows, search, cfg.searchKeys]);

  const cols = useMemo(() => {
    const base = cfg.columns(filtered);
    return [
      ...base,
      {
        key: "_actions", label: "Thao tác", width: 100, align: "right" as const, hideable: false,
        render: (r: Row) => (
          <div onClick={(e) => e.stopPropagation()}>
            <RowActions onEdit={() => setEditing(r)} onDelete={() => setDeleting(r)} />
          </div>
        ),
      },
    ];
  }, [filtered, cfg]);

  return (
    <div className="space-y-3">
      <CrudToolbar
        search={search} onSearchChange={setSearch}
        onAdd={() => setAdding(true)}
        addLabel={cfg.addLabel}
        placeholder="Tìm kiếm..."
      />
      <SmartTable
        screenId={`master-${cfg.table}`}
        exportFilename={cfg.table}
        columns={cols as SmartTableColumn<Row>[]}
        data={filtered}
        defaultDensity="compact"
        getRowId={(r) => r.id}
      />
      <p className="text-table-sm text-text-3">
        {filtered.length} bản ghi {isLoading && "(đang tải...)"}
      </p>

      <EntityFormDialog
        open={adding}
        mode="create"
        entityName={cfg.entityName}
        fields={cfg.fields}
        onClose={() => setAdding(false)}
        onSave={async (v) => {
          const err = cfg.validate?.(v);
          if (err) { toast.error(err); return; }
          await create.mutateAsync(cfg.toPayload(v));
          toast.success(`Đã tạo ${cfg.entityName}`);
          setAdding(false);
        }}
      />

      <EntityFormDialog
        open={!!editing}
        mode="edit"
        entityName={cfg.entityName}
        fields={cfg.fields}
        initialValues={editing
          ? Object.fromEntries(cfg.fields.map((f) => [f.key, String(editing[f.key] ?? "")]))
          : undefined}
        onClose={() => setEditing(null)}
        onSave={async (v) => {
          const err = cfg.validate?.(v);
          if (err) { toast.error(err); return; }
          if (!editing) return;
          await update.mutateAsync({ id: editing.id, patch: cfg.toPayload(v) });
          toast.success("Đã cập nhật");
          setEditing(null);
        }}
      />

      <DeleteConfirmDialog
        open={!!deleting}
        entityLabel={deleting ? `${cfg.entityName} ${String(deleting[cfg.codeField] ?? deleting.id)}` : ""}
        description="Soft-delete: bản ghi sẽ bị ẩn (is_active=false). Có thể khôi phục từ Audit log."
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await softDelete.mutateAsync({ id: deleting.id });
          } finally {
            setDeleting(null);
          }
        }}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/* TAB — Giá CN×SKU                                                          */
/* ════════════════════════════════════════════════════════════════════════ */
export function CnSkuPricingTab() {
  return useGenericCrudTab({
    table: "cn_sku_pricing",
    entityName: "Giá CN×SKU",
    codeField: "sku_code",
    addLabel: "Thêm giá",
    searchKeys: ["cn_code", "sku_code"],
    fields: [
      { key: "cn_code", label: "Mã CN", type: "text", required: true, mono: true, span: 1 },
      { key: "sku_code", label: "Mã SKU", type: "text", required: true, mono: true, span: 1 },
      { key: "price_list", label: "Giá list (VND)", type: "number", required: true, span: 1 },
      { key: "price_promo", label: "Giá promo (VND)", type: "number", span: 1 },
      { key: "discount_max_pct", label: "Discount max %", type: "number", placeholder: "0-50", span: 1 },
      { key: "currency", label: "Currency", type: "text", placeholder: "VND", span: 1 },
      { key: "effective_from", label: "Hiệu lực từ", type: "text", placeholder: "YYYY-MM-DD", required: true, span: 1 },
      { key: "effective_to", label: "Hiệu lực đến", type: "text", placeholder: "YYYY-MM-DD", span: 1 },
    ],
    validate: (v) => {
      const p = Number(v.price_list);
      if (!(p > 0)) return "Giá list phải > 0";
      const d = v.discount_max_pct ? Number(v.discount_max_pct) : 0;
      if (d < 0 || d > 50) return "Discount max % phải trong khoảng 0-50";
      return null;
    },
    toPayload: (v) => ({
      cn_code: v.cn_code, sku_code: v.sku_code,
      price_list: Number(v.price_list),
      price_promo: v.price_promo ? Number(v.price_promo) : null,
      discount_max_pct: v.discount_max_pct ? Number(v.discount_max_pct) : null,
      currency: v.currency || "VND",
      effective_from: v.effective_from,
      effective_to: v.effective_to || null,
    }),
    columns: () => [
      { key: "cn_code", label: "CN", width: 100, sortable: true, render: (r) => <span className="font-mono text-text-1">{r.cn_code}</span> },
      { key: "sku_code", label: "SKU", width: 140, sortable: true, render: (r) => <span className="font-mono text-text-1">{r.sku_code}</span> },
      { key: "price_list", label: "Giá list", width: 130, numeric: true, align: "right", render: (r) => <span className="tabular-nums text-text-2">{Number(r.price_list).toLocaleString("vi-VN")}</span> },
      { key: "price_promo", label: "Giá promo", width: 130, numeric: true, align: "right", render: (r) => <span className="tabular-nums text-text-3">{r.price_promo ? Number(r.price_promo).toLocaleString("vi-VN") : "—"}</span> },
      { key: "discount_max_pct", label: "Disc. max", width: 100, numeric: true, align: "right", render: (r) => <span className="tabular-nums text-text-2">{r.discount_max_pct ?? "—"}{r.discount_max_pct ? "%" : ""}</span> },
      { key: "effective_from", label: "Từ", width: 110, render: (r) => <span className="text-text-2">{r.effective_from}</span> },
      { key: "effective_to", label: "Đến", width: 110, render: (r) => <span className="text-text-3">{r.effective_to ?? "—"}</span> },
    ],
  });
}

/* ════════════════════════════════════════════════════════════════════════ */
/* TAB — Quy đổi đơn vị                                                      */
/* ════════════════════════════════════════════════════════════════════════ */
const UOM_OPTIONS = ["M2", "BOX", "PALLET", "PIECE", "KG", "TON"];
export function SkuUnitConversionTab() {
  return useGenericCrudTab({
    table: "sku_unit_conversion",
    entityName: "Quy đổi ĐV",
    codeField: "sku_code",
    addLabel: "Thêm quy đổi",
    searchKeys: ["sku_code"],
    fields: [
      { key: "sku_code", label: "Mã SKU", type: "text", required: true, mono: true, span: 1 },
      { key: "from_uom", label: "Từ ĐV", type: "select", required: true, span: 1, options: UOM_OPTIONS.map((u) => ({ value: u, label: u })) },
      { key: "to_uom", label: "Sang ĐV", type: "select", required: true, span: 1, options: UOM_OPTIONS.map((u) => ({ value: u, label: u })) },
      { key: "conversion_factor", label: "Hệ số quy đổi", type: "number", required: true, span: 1 },
      { key: "pcs_per_box", label: "Pcs/Box", type: "number", span: 1 },
      { key: "boxes_per_pallet", label: "Boxes/Pallet", type: "number", span: 1 },
    ],
    validate: (v) => {
      if (!(Number(v.conversion_factor) > 0)) return "Hệ số phải > 0";
      return null;
    },
    toPayload: (v) => ({
      sku_code: v.sku_code,
      from_uom: v.from_uom, to_uom: v.to_uom,
      conversion_factor: Number(v.conversion_factor),
      pcs_per_box: v.pcs_per_box ? Number(v.pcs_per_box) : null,
      boxes_per_pallet: v.boxes_per_pallet ? Number(v.boxes_per_pallet) : null,
    }),
    columns: () => [
      { key: "sku_code", label: "SKU", width: 140, sortable: true, render: (r) => <span className="font-mono text-text-1">{r.sku_code}</span> },
      { key: "from_uom", label: "Từ", width: 80, render: (r) => <span className="text-text-2">{r.from_uom}</span> },
      { key: "to_uom", label: "Sang", width: 80, render: (r) => <span className="text-text-2">{r.to_uom}</span> },
      { key: "conversion_factor", label: "Hệ số", width: 110, numeric: true, align: "right", render: (r) => <span className="tabular-nums text-text-1">{Number(r.conversion_factor).toLocaleString("vi-VN")}</span> },
      { key: "pcs_per_box", label: "Pcs/Box", width: 100, numeric: true, align: "right", render: (r) => <span className="tabular-nums text-text-2">{r.pcs_per_box ?? "—"}</span> },
      { key: "boxes_per_pallet", label: "Boxes/Pallet", width: 110, numeric: true, align: "right", render: (r) => <span className="tabular-nums text-text-2">{r.boxes_per_pallet ?? "—"}</span> },
    ],
  });
}

/* ════════════════════════════════════════════════════════════════════════ */
/* TAB — NM × SKU constraint                                                 */
/* ════════════════════════════════════════════════════════════════════════ */
export function NmSkuConstraintTab() {
  return useGenericCrudTab({
    table: "nm_sku_constraint",
    entityName: "NM×SKU",
    codeField: "sku_code",
    addLabel: "Thêm constraint",
    searchKeys: ["nm_code", "sku_code"],
    fields: [
      { key: "nm_code", label: "Mã NM", type: "text", required: true, mono: true, span: 1 },
      { key: "sku_code", label: "Mã SKU", type: "text", required: true, mono: true, span: 1 },
      { key: "moq_base_uom", label: "MOQ", type: "number", required: true, span: 1 },
      { key: "moq_uom", label: "MOQ ĐV", type: "select", span: 1, options: UOM_OPTIONS.map((u) => ({ value: u, label: u })) },
      { key: "price_tier1", label: "Giá tier 1", type: "number", span: 1 },
      { key: "price_tier1_min_qty", label: "Tier 1 min qty", type: "number", span: 1 },
      { key: "price_tier2", label: "Giá tier 2", type: "number", span: 1 },
      { key: "price_tier2_min_qty", label: "Tier 2 min qty", type: "number", span: 1 },
      { key: "production_lot_size", label: "Lot size SX", type: "number", span: 1 },
      { key: "notes", label: "Ghi chú", type: "textarea", span: 2 },
    ],
    validate: (v) => (Number(v.moq_base_uom) > 0 ? null : "MOQ phải > 0"),
    toPayload: (v) => ({
      nm_code: v.nm_code, sku_code: v.sku_code,
      moq_base_uom: Number(v.moq_base_uom),
      moq_uom: v.moq_uom || "M2",
      price_tier1: v.price_tier1 ? Number(v.price_tier1) : null,
      price_tier1_min_qty: v.price_tier1_min_qty ? Number(v.price_tier1_min_qty) : 0,
      price_tier2: v.price_tier2 ? Number(v.price_tier2) : null,
      price_tier2_min_qty: v.price_tier2_min_qty ? Number(v.price_tier2_min_qty) : null,
      production_lot_size: v.production_lot_size ? Number(v.production_lot_size) : null,
      notes: v.notes || null,
    }),
    columns: () => [
      { key: "nm_code", label: "NM", width: 100, sortable: true, render: (r) => <span className="font-mono text-text-1">{r.nm_code}</span> },
      { key: "sku_code", label: "SKU", width: 140, sortable: true, render: (r) => <span className="font-mono text-text-1">{r.sku_code}</span> },
      { key: "moq_base_uom", label: "MOQ", width: 100, numeric: true, align: "right", render: (r) => <span className="tabular-nums text-text-1">{Number(r.moq_base_uom).toLocaleString("vi-VN")} {r.moq_uom}</span> },
      { key: "price_tier1", label: "Tier 1", width: 110, numeric: true, align: "right", render: (r) => <span className="tabular-nums text-text-2">{r.price_tier1 ? Number(r.price_tier1).toLocaleString("vi-VN") : "—"}</span> },
      { key: "price_tier2", label: "Tier 2", width: 110, numeric: true, align: "right", render: (r) => <span className="tabular-nums text-text-2">{r.price_tier2 ? Number(r.price_tier2).toLocaleString("vi-VN") : "—"}</span> },
      { key: "production_lot_size", label: "Lot SX", width: 100, numeric: true, align: "right", render: (r) => <span className="tabular-nums text-text-2">{r.production_lot_size ?? "—"}</span> },
      { key: "notes", label: "Ghi chú", width: 200, render: (r) => <span className="text-text-3">{r.notes ?? "—"}</span> },
    ],
  });
}

/* ════════════════════════════════════════════════════════════════════════ */
/* TAB — Substitution lists                                                  */
/* ════════════════════════════════════════════════════════════════════════ */
export function SubstitutionListsTab() {
  return useGenericCrudTab({
    table: "substitution_lists",
    entityName: "Thay thế SKU",
    codeField: "original_sku",
    addLabel: "Thêm thay thế",
    searchKeys: ["original_sku", "substitute_sku", "cn_code"],
    fields: [
      { key: "original_sku", label: "SKU gốc", type: "text", required: true, mono: true, span: 1 },
      { key: "substitute_sku", label: "SKU thay thế", type: "text", required: true, mono: true, span: 1 },
      { key: "cn_code", label: "CN (rỗng = ALL)", type: "text", mono: true, span: 1 },
      { key: "priority", label: "Ưu tiên (1-3)", type: "number", required: true, span: 1 },
      { key: "max_depth", label: "Max depth", type: "number", placeholder: "3", span: 1 },
    ],
    validate: (v) => {
      const p = Number(v.priority);
      if (p < 1 || p > 3) return "Ưu tiên phải 1, 2, hoặc 3";
      if (v.original_sku === v.substitute_sku) return "SKU gốc và thay thế phải khác nhau";
      return null;
    },
    toPayload: (v) => ({
      original_sku: v.original_sku,
      substitute_sku: v.substitute_sku,
      cn_code: v.cn_code || null,
      priority: Number(v.priority),
      max_depth: v.max_depth ? Number(v.max_depth) : 3,
    }),
    columns: () => [
      { key: "original_sku", label: "SKU gốc", width: 140, sortable: true, render: (r) => <span className="font-mono text-text-1">{r.original_sku}</span> },
      { key: "substitute_sku", label: "→ Thay thế", width: 140, render: (r) => <span className="font-mono text-info">{r.substitute_sku}</span> },
      { key: "cn_code", label: "CN", width: 100, render: (r) => <span className="text-text-2">{r.cn_code ?? "ALL"}</span> },
      { key: "priority", label: "Ưu tiên", width: 90, numeric: true, align: "center", render: (r) => <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-warning-bg text-warning text-table-sm tabular-nums">P{r.priority}</span> },
      { key: "max_depth", label: "Max depth", width: 100, numeric: true, align: "right", render: (r) => <span className="tabular-nums text-text-2">{r.max_depth}</span> },
    ],
  });
}

/* ════════════════════════════════════════════════════════════════════════ */
/* TAB — Stock policies                                                      */
/* ════════════════════════════════════════════════════════════════════════ */
export function StockPoliciesTab() {
  return useGenericCrudTab({
    table: "stock_policies",
    entityName: "Chính sách tồn",
    codeField: "sku_code",
    addLabel: "Thêm policy",
    searchKeys: ["sku_code", "location_code"],
    fields: [
      { key: "sku_code", label: "Mã SKU", type: "text", required: true, mono: true, span: 1 },
      { key: "location_code", label: "Mã location", type: "text", required: true, mono: true, span: 1 },
      { key: "stock_days_min", label: "Tồn min (ngày)", type: "number", required: true, span: 1 },
      { key: "stock_days_target", label: "Tồn target (ngày)", type: "number", required: true, span: 1 },
      { key: "stock_days_max", label: "Tồn max (ngày)", type: "number", required: true, span: 1 },
    ],
    validate: (v) => {
      const mn = Number(v.stock_days_min), tg = Number(v.stock_days_target), mx = Number(v.stock_days_max);
      if (!(mn < tg && tg < mx)) return "Phải đảm bảo: min < target < max";
      return null;
    },
    toPayload: (v) => ({
      sku_code: v.sku_code,
      location_code: v.location_code,
      stock_days_min: Number(v.stock_days_min),
      stock_days_target: Number(v.stock_days_target),
      stock_days_max: Number(v.stock_days_max),
    }),
    columns: () => [
      { key: "sku_code", label: "SKU", width: 140, sortable: true, render: (r) => <span className="font-mono text-text-1">{r.sku_code}</span> },
      { key: "location_code", label: "Location", width: 110, render: (r) => <span className="font-mono text-text-2">{r.location_code}</span> },
      { key: "stock_days_min", label: "Min", width: 80, numeric: true, align: "right", render: (r) => <span className="tabular-nums text-warning">{r.stock_days_min}d</span> },
      { key: "stock_days_target", label: "Target", width: 90, numeric: true, align: "right", render: (r) => <span className="tabular-nums text-success font-medium">{r.stock_days_target}d</span> },
      { key: "stock_days_max", label: "Max", width: 80, numeric: true, align: "right", render: (r) => <span className="tabular-nums text-info">{r.stock_days_max}d</span> },
    ],
  });
}
