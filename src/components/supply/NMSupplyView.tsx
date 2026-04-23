import { useState, useCallback, useMemo } from "react";
import { useTenant } from "@/components/TenantContext";
import { NMSummary, NMSkuRow } from "./supplyData";
import { useInventoryData } from "@/hooks/useInventoryData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, Upload, Download, Pencil, Bell, FileSpreadsheet, Loader2, PackageOpen, ShieldAlert } from "lucide-react";
import { ClickableNumber } from "@/components/ClickableNumber";
import { LogicTooltip } from "@/components/LogicTooltip";
import { useVersionConflict, VersionConflictDialog } from "@/components/VersionConflict";
import { FACTORIES, NM_INVENTORY, type NmId } from "@/data/unis-enterprise-dataset";
import { NmCommitmentResponses } from "./NmCommitmentResponses";
import { NmSupplyHeader } from "./NmSupplyHeader";
import { NmUploadPreviewDialog } from "./NmUploadPreviewDialog";

/* ─── Upload Zone ─── */
function UploadZone() {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) toast.success(`Đã nhận file "${file.name}"`, { description: "Preview & validate trước khi import." });
  }, []);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "rounded-card border-2 border-dashed p-6 text-center transition-colors cursor-pointer",
        dragging ? "border-primary bg-primary/5" : "border-surface-3 bg-surface-1/50 hover:border-primary/50"
      )}
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".xlsx,.xls,.csv";
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) toast.success(`Đã nhận file "${file.name}"`, { description: "Preview & validate trước khi import." });
        };
        input.click();
      }}
    >
      <FileSpreadsheet className="h-8 w-8 mx-auto text-text-3 mb-2" />
      <p className="text-table text-text-2">
        Kéo thả file Excel NM vào đây — Template: <span className="font-medium text-text-1">NM | Item | Variant | Tồn kho | Ghi chú</span>
      </p>
      <p className="text-caption text-text-3 mt-1">Chấp nhận .xlsx, .xls, .csv</p>
    </div>
  );
}

/* ─── SKU Drill-down Row ─── */
function SkuTable({ nm, skus, share, onUpdate }: { nm: string; skus: NMSkuRow[]; share: number; onUpdate: (idx: number, val: number) => void }) {
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");

  const startEdit = (idx: number, current: number) => {
    setEditIdx(idx);
    setEditVal(String(current));
  };

  const commitEdit = (idx: number) => {
    const v = parseInt(editVal);
    if (!isNaN(v) && v >= 0) {
      onUpdate(idx, v);
      toast.success(`Đã cập nhật ${skus[idx].item} ${skus[idx].variant}`, { description: `Tồn kho: ${v.toLocaleString()} m²` });
    }
    setEditIdx(null);
  };

  const total = skus.reduce((s, r) => s + r.tonKho, 0);
  const totalUnis = skus.reduce((s, r) => s + r.unisDung, 0);
  const totalDangVe = skus.reduce((s, r) => s + r.dangVe, 0);

  return (
    <tr>
      <td colSpan={7} className="p-0">
        <div className="bg-surface-1/60 border-t border-surface-3 px-6 py-4">
          <p className="text-caption text-text-3 mb-3">Per NM › <span className="text-text-1 font-medium">{nm}</span> (tổng tồn {total.toLocaleString()})</p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-3/50">
                {["Item", "Variant", "Tồn kho (m²)", "UNIS dùng (m²)", "Đang về (ETA)", "Cập nhật", ""].map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left text-table-header uppercase text-text-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {skus.map((sku, idx) => (
                <tr key={idx} className="border-b border-surface-3/30 hover:bg-surface-2/50">
                  <td className="px-3 py-2.5 text-table font-medium text-text-1">{sku.item}</td>
                  <td className="px-3 py-2.5 text-table text-text-2">{sku.variant}</td>
                  <td className="px-3 py-2.5">
                    {editIdx === idx ? (
                      <input
                        autoFocus
                        type="number"
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        onBlur={() => commitEdit(idx)}
                        onKeyDown={(e) => e.key === "Enter" && commitEdit(idx)}
                        className="w-24 rounded border border-primary bg-surface-0 px-2 py-1 text-table tabular-nums text-text-1 outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => startEdit(idx, sku.tonKho)}
                        className="tabular-nums text-table text-primary font-medium hover:underline cursor-pointer"
                      >
                        {sku.tonKho.toLocaleString()}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-table tabular-nums text-text-2">
                    <ClickableNumber
                      value={sku.unisDung}
                      label={`UNIS dùng ${sku.item} ${sku.variant}`}
                      color="text-text-2"
                      formula={`On-hand ${sku.tonKho.toLocaleString()} × share ${Math.round(share * 100)}% = ${Math.round(sku.tonKho * share).toLocaleString()} − reserved = ${sku.unisDung.toLocaleString()}`}
                      links={[{ label: "Sửa share% → /master-data", to: "/master-data" }]}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-table text-text-2">
                    {sku.dangVe > 0 ? (
                      <span className={cn(sku.dangVeEta.includes("trễ") && "text-danger font-medium")}>
                        {sku.dangVe.toLocaleString()} ({sku.dangVeEta})
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-caption text-text-3">{sku.updatedAt}</td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => startEdit(idx, sku.tonKho)} className="text-text-3 hover:text-primary">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-surface-2/30 font-semibold">
                <td className="px-3 py-2 text-table text-text-1">TOTAL</td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2 text-table tabular-nums text-text-1">{total.toLocaleString()}</td>
                <td className="px-3 py-2 text-table tabular-nums text-text-2">{totalUnis.toLocaleString()}</td>
                <td className="px-3 py-2 text-table tabular-nums text-text-2">{totalDangVe > 0 ? totalDangVe.toLocaleString() : "—"}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
          <div className="flex items-center gap-2 mt-3">
            <p className="text-caption text-text-3 italic">Nguồn: Upload Excel {skus[0]?.updatedAt || ""} hôm nay bởi Thúy</p>
            <LogicTooltip
              title="Share% Logic"
              content={`Share% ${nm} = % tồn kho dành cho UNIS.\nNghĩa: UNIS được sử dụng ${Math.round(share * 100)}% tồn kho ${nm}.\nPhần còn lại (${Math.round((1 - share) * 100)}%) dành cho khách khác.\n\nSửa share% → /master-data → NM/Suppliers → ${nm} → field Share%\nShare% thay đổi → UNIS dùng tự recalculate → /sop Cân đối update.`}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}

/** Map UI NM display name → dataset NmId for cross-referencing freshness/commitments. */
const NM_NAME_TO_ID: Record<string, NmId> = {
  "Mikado": "MIKADO",
  "Toko": "TOKO",
  "Đồng Tâm": "DONGTAM",
  "Vigracera": "VIGRACERA",
  "Phú Mỹ": "PHUMY",
};

function resolveNmId(nm: NMSummary): NmId | null {
  return NM_NAME_TO_ID[nm.nm] ?? null;
}

/** Returns true when the worst staleness across that NM's inventory rows is "stale". */
function isNmStale(nmId: NmId | null): boolean {
  if (!nmId) return false;
  const rows = NM_INVENTORY.filter((r) => r.nmId === nmId);
  return rows.length > 0 && rows.every((r) => r.staleness === "stale");
}

/** Triggers a download of a synthetic per-NM Excel template via Blob. */
function downloadNmTemplate(nmId: NmId, nmName: string) {
  const allowed = FACTORIES.find((f) => f.id === nmId);
  if (!allowed) return;
  const skus = NM_INVENTORY.filter((r) => r.nmId === nmId);
  const header = "Mã hàng,Tên,Tồn kho (m²),Đang SX (m²),Ghi chú\n";
  const body = skus
    .map((s) => `${s.skuBaseCode},,${s.onHandM2},${s.inProductionM2},`)
    .join("\n");
  const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `template-${nmId.toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Đã tải mẫu cho ${nmName}`, {
    description: `${skus.length} mã hàng sẵn có để cập nhật tồn kho.`,
  });
}

/* ─── Main View ─── */
export function NMSupplyView() {
  const { tenant } = useTenant();
  const { data: inventoryData, loading: inventoryLoading } = useInventoryData();
  const [localEdits, setLocalEdits] = useState<Record<string, NMSummary>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reminded, setReminded] = useState<Set<string>>(new Set());
  const { conflict: supplyConflict, triggerConflict: triggerSupplyConflict, clearConflict: clearSupplyConflict } = useVersionConflict();

  // Per-NM dialog state for the 7-step Excel preview workflow.
  const [previewState, setPreviewState] = useState<{ nmId: NmId; nmName: string; fileName: string } | null>(null);

  // Merge DB data with local edits
  const nmData = inventoryData.map(nm => localEdits[nm.id] || nm);

  // Identify NMs blocked by freshness gate (stale ≥ 72h).
  const staleNmIds = useMemo(() => {
    const set = new Set<NmId>();
    nmData.forEach((nm) => {
      const id = resolveNmId(nm);
      if (id && isNmStale(id)) set.add(id);
    });
    return set;
  }, [nmData]);

  const staleNames = useMemo(
    () =>
      [...staleNmIds]
        .map((id) => FACTORIES.find((f) => f.id === id)?.name ?? id)
        .filter(Boolean) as string[],
    [staleNmIds]
  );

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleRemind = (nm: string, id: string) => {
    setReminded(p => new Set(p).add(id));
    toast.success(`Đã nhắc ${nm}`, { description: "Notification qua Supplier Portal + Zalo đã gửi." });
  };

  const handleSkuUpdate = (nmId: string, skuIdx: number, newVal: number) => {
    const base = inventoryData.find(n => n.id === nmId);
    if (!base) return;
    const edited = localEdits[nmId] || base;
    const newSkus = [...edited.skus];
    const oldSku = newSkus[skuIdx];
    const newUnis = Math.round(newVal * edited.share);
    newSkus[skuIdx] = { ...oldSku, tonKho: newVal, unisDung: newUnis, updatedAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) };
    const newTongTon = newSkus.reduce((s, r) => s + r.tonKho, 0);
    const newUnisDung = newSkus.reduce((s, r) => s + r.unisDung, 0);
    setLocalEdits(prev => ({
      ...prev,
      [nmId]: { ...edited, tongTon: newTongTon, unisDung: newUnisDung, skus: newSkus, updatedAt: `Hôm nay ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`, updatedAgo: "today" as const },
    }));
  };

  const openUploadFor = (nmId: NmId, nmName: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls,.csv";
    input.onchange = (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (file) setPreviewState({ nmId, nmName, fileName: file.name });
    };
    input.click();
  };

  const totalTon = nmData.reduce((s, n) => s + (n.tongTon || 0), 0);
  const totalUnis = nmData.reduce((s, n) => s + n.unisDung, 0);
  const totalDangVe = nmData.reduce((s, n) => s + n.dangVe, 0);

  const updatedColor = (ago: string) => {
    if (ago === "today") return "text-text-1";
    if (ago === "yesterday") return "text-warning";
    return "text-danger";
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {inventoryLoading && (
        <div className="flex items-center gap-2 text-text-3 text-table-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu tồn kho...
        </div>
      )}
      {/* Version Conflict */}
      {supplyConflict && (
        <VersionConflictDialog
          conflict={supplyConflict}
          onReload={clearSupplyConflict}
          onForceUpdate={() => { clearSupplyConflict(); toast.success("Đã ghi đè. Audit logged."); }}
          onClose={clearSupplyConflict}
        />
      )}
      {/* Header actions */}
      <div className="flex items-center gap-3" data-tour="supply-upload">
        <button className="rounded-button bg-gradient-primary text-primary-foreground px-4 py-2 text-table-sm font-medium flex items-center gap-2">
          <Upload className="h-4 w-4" /> Upload Excel
        </button>
        <button className="rounded-button border border-surface-3 bg-surface-2 text-text-1 px-4 py-2 text-table-sm font-medium flex items-center gap-2 hover:bg-surface-1">
          <Download className="h-4 w-4" /> Download template
        </button>
      </div>

      {/* Upload zone */}
      <UploadZone />

      {/* Empty state */}
      {!inventoryLoading && nmData.length === 0 ? (
        <div className="rounded-card border border-surface-3 bg-surface-2 py-16 flex flex-col items-center gap-4">
          <div className="rounded-full bg-surface-1 p-4">
            <PackageOpen className="h-10 w-10 text-text-3" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-body font-semibold text-text-1">Chưa có dữ liệu tồn kho</p>
            <p className="text-table text-text-3 max-w-md">
              Upload file Excel từ nhà máy hoặc nhập tay để bắt đầu theo dõi tồn kho. Dữ liệu sẽ tự động đồng bộ lên hệ thống.
            </p>
          </div>
          <button
            className="rounded-button bg-gradient-primary text-primary-foreground px-5 py-2.5 text-table-sm font-medium flex items-center gap-2 mt-2"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".xlsx,.xls,.csv";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) toast.success(`Đã nhận file "${file.name}"`, { description: "Preview & validate trước khi import." });
              };
              input.click();
            }}
          >
            <Upload className="h-4 w-4" /> Upload Excel ngay
          </button>
        </div>
      ) : (
      /* NM Table */
      <div className="rounded-card border border-surface-3 bg-surface-2" data-tour="supply-nm-table">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-1/50">
                <th className="w-10 px-3 py-2.5"></th>
                {["NM", "Tổng tồn (m²)", "UNIS dùng (m²)", "Đang về", "Cập nhật", "Action"].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nmData.map((nm) => (
                <>
                  <tr
                    key={nm.id}
                    className={cn(
                      "border-b border-surface-3/50 transition-colors cursor-pointer",
                      expandedId === nm.id ? "bg-surface-1/50" : "hover:bg-surface-1/30",
                      nm.updatedAgo === "stale" && "bg-danger-bg/30"
                    )}
                    onClick={() => nm.skus.length > 0 && toggleExpand(nm.id)}
                  >
                    <td className="px-3 py-3 text-text-3">
                      {nm.skus.length > 0 ? (
                        expandedId === nm.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-table font-medium text-text-1">{nm.nm}</td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-1">
                      {nm.tongTon !== null ? nm.tongTon.toLocaleString() : <span className="text-danger font-medium">Chưa có</span>}
                    </td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-2">
                      {nm.unisDung > 0 ? (
                        <ClickableNumber
                          value={nm.unisDung}
                          label={`UNIS dùng ${nm.nm} tổng`}
                          color="text-text-2"
                          breakdown={nm.skus.map(s => ({
                            label: `${s.item} ${s.variant}`,
                            value: s.unisDung,
                            detail: `${s.tonKho.toLocaleString()} × ${Math.round(nm.share * 100)}%`,
                          }))}
                          note={`Share% UNIS: ${Math.round(nm.share * 100)}% (config /master-data)`}
                          links={[{ label: "Sửa share% → /master-data", to: "/master-data" }]}
                        />
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-table text-text-2">
                      {nm.dangVe > 0 ? (
                        <span className={cn(nm.dangVeNote.includes("trễ") && "text-danger font-medium")}>
                          {nm.dangVeNote}
                        </span>
                      ) : "0"}
                    </td>
                    <td className={cn("px-4 py-3 text-table", updatedColor(nm.updatedAgo))}>
                      {nm.updatedAt}
                      {nm.updatedAgo === "yesterday" && " ⚠"}
                      {nm.updatedAgo === "stale" && " 🔴"}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {nm.tongTon !== null && (
                          <button
                            onClick={() => toggleExpand(nm.id)}
                            className="rounded-button border border-surface-3 px-2.5 py-1 text-caption font-medium text-text-2 hover:text-text-1 hover:bg-surface-1 flex items-center gap-1"
                          >
                            <Pencil className="h-3 w-3" /> Sửa
                          </button>
                        )}
                        {nm.tongTon !== null && nm.skus.length > 0 && (
                          <button
                            onClick={() => {
                              const input = document.createElement("input");
                              input.type = "file";
                              input.accept = ".xlsx,.xls,.csv";
                              input.onchange = (ev) => {
                                const file = (ev.target as HTMLInputElement).files?.[0];
                                if (file) toast.success(`Upload cho ${nm.nm}: "${file.name}"`, { description: "Preview trước khi import." });
                              };
                              input.click();
                            }}
                            className="rounded-button border border-surface-3 px-2.5 py-1 text-caption font-medium text-text-2 hover:text-text-1 hover:bg-surface-1 flex items-center gap-1"
                          >
                            <Upload className="h-3 w-3" /> Upload
                          </button>
                        )}
                        {nm.tongTon === null && (
                          <button
                            onClick={() => {
                              setExpandedId(nm.id);
                              toast.info(`Nhập tay cho ${nm.nm}`, { description: "Vui lòng nhập số tồn kho từng SKU." });
                            }}
                            className="rounded-button bg-gradient-primary text-primary-foreground px-2.5 py-1 text-caption font-medium flex items-center gap-1"
                          >
                            <Pencil className="h-3 w-3" /> Nhập tay
                          </button>
                        )}
                        {(nm.updatedAgo === "yesterday" || nm.updatedAgo === "stale") && (
                          <button
                            onClick={() => handleRemind(nm.nm, nm.id)}
                            disabled={reminded.has(nm.id)}
                            className={cn(
                              "rounded-button px-2.5 py-1 text-caption font-medium flex items-center gap-1",
                              reminded.has(nm.id)
                                ? "border border-surface-3 text-text-3 cursor-not-allowed"
                                : "border border-warning text-warning hover:bg-warning/10"
                            )}
                          >
                            <Bell className="h-3 w-3" /> {reminded.has(nm.id) ? "Đã nhắc" : "Nhắc NM"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === nm.id && nm.skus.length > 0 && (
                    <SkuTable
                      key={`sku-${nm.id}`}
                      nm={nm.nm}
                      skus={nm.skus}
                      share={nm.share}
                      onUpdate={(idx, val) => handleSkuUpdate(nm.id, idx, val)}
                    />
                  )}
                </>
              ))}
              {/* TOTAL row */}
              <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
                <td className="px-3 py-3"></td>
                <td className="px-4 py-3 text-table text-text-1">TOTAL</td>
                <td className="px-4 py-3 text-table tabular-nums text-text-1">{totalTon.toLocaleString()}</td>
                <td className="px-4 py-3 text-table tabular-nums text-text-2">{totalUnis.toLocaleString()}</td>
                <td className="px-4 py-3 text-table tabular-nums text-text-2">{totalDangVe > 0 ? totalDangVe.toLocaleString() : "0"}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
