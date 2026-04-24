/**
 * InventoryPage (/inventory) — Tồn kho NM + CN.
 *
 * 2 tabs: Nhà máy (5 NM)  |  Chi nhánh (12 CN)
 *  - Bảng SmartTable với drill-down per SKU
 *  - Auto-expand CN nguy hiểm (HSTK < 2d)
 *  - Header status: Bravo sync + summary chip
 *  - Upload zone cuối trang (NM + CN templates)
 *
 * Giữ NextStepBanner / ChangeLogPanel cũ để không phá workflow context.
 * WorkflowFooter mount tự động qua AppLayout.
 */
import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Bell,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Eye,
  RefreshCw,
  Package,
  MapPin,
  Inbox,
  Zap,
  PenLine,
  Link2,
} from "lucide-react";
import { DataSourceSelector, type DataSource } from "@/components/DataSourceSelector";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { ChangeLogPanel } from "@/components/ChangeLogPanel";
import { NextStepBanner } from "@/components/NextStepBanner";
import { useTenant } from "@/components/TenantContext";
import { ClickableNumber } from "@/components/ClickableNumber";
import { TermTooltip } from "@/components/TermTooltip";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FACTORIES,
  BRANCHES,
  NM_INVENTORY,
  INVENTORY_CN,
  DEMAND_FC,
  SKU_VARIANTS,
  type NmId,
} from "@/data/unis-enterprise-dataset";

const NOW = new Date("2026-05-13T10:00:00+07:00").getTime();

type FreshnessTone = "fresh" | "watch" | "block";

const TONE_BADGE: Record<FreshnessTone, { icon: string; label: string; cls: string }> = {
  fresh: { icon: "🟢", label: "Mới",      cls: "bg-success-bg text-success border-success/30" },
  watch: { icon: "🟡", label: "Cũ",       cls: "bg-warning-bg text-warning border-warning/40" },
  block: { icon: "🔴", label: "Chặn DRP", cls: "bg-danger-bg text-danger border-danger/40" },
};

/* ─────────────────────────── Tab 1: Nhà máy ─────────────────────────── */

interface FactoryRow {
  nmId: NmId;
  name: string;
  region: string;
  hours: number;
  updatedLabel: string;
  tone: FreshnessTone;
  totalOnHand: number;
  capacity: number;
  utilizationPct: number;
  skus: { code: string; onHand: number }[];
}

function buildFactoryRows(scale: number): FactoryRow[] {
  return FACTORIES.map((nm) => {
    const rows = NM_INVENTORY.filter((r) => r.nmId === nm.id);
    const latest = rows.reduce((max, r) => {
      const t = new Date(r.updatedAt).getTime();
      return t > max ? t : max;
    }, 0);
    const hours = latest === 0 ? 96 : Math.max(1, Math.round((NOW - latest) / 3600000));
    let tone: FreshnessTone = "fresh";
    if (hours >= 48) tone = "block";
    else if (hours >= 24) tone = "watch";
    const updatedLabel =
      hours < 24 ? `${hours}h trước` : hours < 48 ? "Hôm qua" : `${Math.floor(hours / 24)} ngày trước`;
    const totalOnHand = Math.round(rows.reduce((s, r) => s + r.onHandM2, 0) * scale);
    const capacity = Math.round(nm.capacityM2Month * scale);
    const utilizationPct = capacity === 0 ? 0 : Math.round((totalOnHand / capacity) * 100);
    const skus = rows.map((r) => ({ code: r.skuBaseCode, onHand: Math.round(r.onHandM2 * scale) }));
    return {
      nmId: nm.id,
      name: nm.name,
      region: nm.region,
      hours,
      updatedLabel,
      tone,
      totalOnHand,
      capacity,
      utilizationPct,
      skus,
    };
  });
}

function FactoriesTab({ rows }: { rows: FactoryRow[] }) {
  const handleRemind = useCallback((name: string) => {
    toast.success(`Đã gửi nhắc ${name}`, {
      description: "Notification qua Zalo + email — yêu cầu cập nhật tồn trong 4h.",
    });
  }, []);

  const totals = useMemo(() => {
    const t = rows.reduce((s, r) => s + r.totalOnHand, 0);
    const c = rows.reduce((s, r) => s + r.capacity, 0);
    return { t, c, pct: c === 0 ? 0 : Math.round((t / c) * 100) };
  }, [rows]);

  const columns: SmartTableColumn<FactoryRow>[] = [
    {
      key: "name", label: "Nhà máy", sortable: true, hideable: false, priority: "high",
      filter: "text", width: 160,
      render: (r) => <span className="font-medium text-text-1">{r.name}</span>,
    },
    {
      key: "region", label: "Vùng", sortable: true, hideable: true, priority: "medium",
      filter: "enum",
      filterOptions: [
        { value: "Bắc",   label: "Bắc" },
        { value: "Trung", label: "Trung" },
        { value: "Nam",   label: "Nam" },
      ],
      width: 90,
    },
    {
      key: "updatedLabel", label: "Cập nhật", sortable: true, hideable: true, priority: "medium",
      width: 110, accessor: (r) => r.hours,
      render: (r) => (
        <span className={cn(
          "text-table-sm",
          r.tone === "block" && "text-danger font-medium",
          r.tone === "watch" && "text-warning",
          r.tone === "fresh" && "text-text-2",
        )}>
          {r.updatedLabel}
        </span>
      ),
    },
    {
      key: "tone", label: "Trạng thái", sortable: true, hideable: false, priority: "high",
      width: 130, accessor: (r) => r.tone,
      filter: "enum",
      filterOptions: [
        { value: "fresh", label: "🟢 Mới" },
        { value: "watch", label: "🟡 Cũ" },
        { value: "block", label: "🔴 Chặn DRP" },
      ],
      render: (r) => {
        const b = TONE_BADGE[r.tone];
        return (
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            b.cls,
          )}>
            <span>{b.icon}</span>{b.label}
          </span>
        );
      },
    },
    {
      key: "totalOnHand", label: "Tồn tổng (m²)", sortable: true, hideable: true,
      numeric: true, align: "right", priority: "high", width: 130,
      render: (r) => (
        <ClickableNumber
          value={r.totalOnHand.toLocaleString("vi-VN")}
          label={`${r.name} — Tồn tổng`}
          color="text-text-1 font-medium tabular-nums"
          breakdown={r.skus.map((s) => ({ label: s.code, value: `${s.onHand.toLocaleString("vi-VN")} m²` }))}
          note="Tổng tồn on-hand toàn bộ SKU bases tại NM"
        />
      ),
    },
    {
      key: "capacity", label: "Capacity", sortable: true, hideable: true,
      numeric: true, align: "right", priority: "low", width: 110,
      render: (r) => (
        <span className="tabular-nums text-text-2">{r.capacity.toLocaleString("vi-VN")}</span>
      ),
    },
    {
      key: "utilizationPct", label: "% sử dụng", sortable: true, hideable: true,
      numeric: true, align: "right", priority: "medium", width: 100,
      render: (r) => {
        const overUse = r.utilizationPct > 95;
        return (
          <div className="flex items-center justify-end gap-2">
            <div className="h-1.5 w-12 rounded-full bg-surface-3 overflow-hidden">
              <div
                className={cn("h-full", overUse ? "bg-danger" : r.utilizationPct > 80 ? "bg-warning" : "bg-success")}
                style={{ width: `${Math.min(100, r.utilizationPct)}%` }}
              />
            </div>
            <span className={cn(
              "tabular-nums text-table-sm",
              overUse ? "text-danger font-semibold" : "text-text-2",
            )}>
              {r.utilizationPct}%
            </span>
          </div>
        );
      },
    },
    {
      key: "actions", label: "Hành động", sortable: false, hideable: false,
      align: "right", priority: "high", width: 130,
      render: (r) => (
        r.tone === "fresh" ? (
          <span className="inline-flex items-center gap-1 text-success text-table-sm">
            <CheckCircle2 className="h-3.5 w-3.5" /> OK
          </span>
        ) : (
          <Button
            variant={r.tone === "block" ? "destructive" : "outline"}
            size="sm"
            onClick={() => handleRemind(r.name)}
            className="h-7 px-2.5 text-[11px]"
          >
            <Bell className="h-3 w-3 mr-1" /> Nhắc NM
          </Button>
        )
      ),
    },
  ];

  return (
    <SmartTable<FactoryRow>
      screenId="inventory-factories"
      title="Nhà máy"
      exportFilename="ton-kho-nha-may"
      columns={columns}
      data={rows}
      defaultDensity="normal"
      rowSeverity={(r) => r.tone === "block" ? "shortage" : r.tone === "watch" ? "watch" : "ok"}
      getRowId={(r) => r.nmId}
      drillDown={(r) => (
        <div className="text-table-sm text-text-2 leading-relaxed">
          <span className="text-text-3 mr-2">SKU bases:</span>
          {r.skus.length === 0 ? (
            <span className="italic text-text-3">— chưa có dữ liệu</span>
          ) : (
            r.skus.map((s, i) => (
              <span key={s.code}>
                <span className="text-text-1 font-medium">{s.code}</span>{" "}
                <span className="tabular-nums">{s.onHand.toLocaleString("vi-VN")}</span>
                {i < r.skus.length - 1 && <span className="text-text-3 mx-1.5">·</span>}
              </span>
            ))
          )}
        </div>
      )}
      summaryRow={{
        name: "Tổng",
        totalOnHand: <span className="tabular-nums font-semibold">{totals.t.toLocaleString("vi-VN")}</span>,
        capacity:    <span className="tabular-nums font-semibold">{totals.c.toLocaleString("vi-VN")}</span>,
        utilizationPct: <span className="tabular-nums font-semibold">{totals.pct}%</span>,
      }}
      emptyState={{
        icon: <Package />,
        title: "Chưa có dữ liệu nhà máy",
        description: "Upload tồn kho NM hoặc chờ Bravo sync.",
        action: { label: "Upload tồn kho →", onClick: () => document.getElementById("inventory-upload-zone")?.scrollIntoView({ behavior: "smooth" }) },
      }}
    />
  );
}

/* ─────────────────────────── Tab 2: Chi nhánh ─────────────────────────── */

interface BranchRow {
  cnCode: string;
  cnName: string;
  region: string;
  totalOnHand: number;
  hstk: number;          // ngày
  tone: FreshnessTone;
  variants: { variant: string; base: string; onHand: number }[];
}

function buildBranchRows(scale: number): BranchRow[] {
  return BRANCHES.map((cn) => {
    const inv = INVENTORY_CN.filter((r) => r.cnCode === cn.code);
    const totalOnHand = Math.round(inv.reduce((s, r) => s + r.onHandM2, 0) * scale);
    const fcRows = DEMAND_FC.filter((r) => r.cnCode === cn.code);
    const monthlyFc = Math.round(fcRows.reduce((s, r) => s + r.fcM2, 0) * scale);
    const dailyFc = monthlyFc / 30;
    const hstkRaw = dailyFc > 0 ? totalOnHand / dailyFc : 99;
    const hstk = Math.round(hstkRaw * 10) / 10;
    let tone: FreshnessTone = "fresh";
    if (hstk < 2) tone = "block";
    else if (hstk <= 5) tone = "watch";
    const variants = inv
      .map((r) => {
        const v = SKU_VARIANTS.find((sv) => sv.code === r.skuVariantCode);
        return {
          variant: v?.variantTag ?? "?",
          base: r.skuBaseCode,
          onHand: Math.round(r.onHandM2 * scale),
        };
      })
      .filter((r) => r.onHand > 0)
      .sort((a, b) => b.onHand - a.onHand);
    return {
      cnCode: cn.code,
      cnName: cn.name,
      region: cn.region,
      totalOnHand,
      hstk,
      tone,
      variants,
    };
  });
}

function BranchesTab({ rows }: { rows: BranchRow[] }) {
  const navigate = useNavigate();

  const totals = useMemo(() => {
    const t = rows.reduce((s, r) => s + r.totalOnHand, 0);
    const avg = rows.length === 0 ? 0 : Math.round((rows.reduce((s, r) => s + r.hstk, 0) / rows.length) * 10) / 10;
    return { t, avg };
  }, [rows]);

  const columns: SmartTableColumn<BranchRow>[] = [
    {
      key: "cnName", label: "Chi nhánh", sortable: true, hideable: false, priority: "high",
      filter: "text", width: 180,
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-text-1 text-table-sm">{r.cnName}</span>
          <span className="text-[10px] text-text-3 font-mono">{r.cnCode}</span>
        </div>
      ),
    },
    {
      key: "region", label: "Vùng", sortable: true, hideable: true, priority: "medium",
      filter: "enum",
      filterOptions: [...new Set(BRANCHES.map((b) => b.region))].map((r) => ({ value: r, label: r })),
      width: 110,
    },
    {
      key: "totalOnHand", label: "Tồn tổng (m²)", sortable: true, hideable: false,
      numeric: true, align: "right", priority: "high", width: 130,
      render: (r) => (
        <ClickableNumber
          value={r.totalOnHand.toLocaleString("vi-VN")}
          label={`${r.cnName} — Tồn tổng`}
          color="text-text-1 font-medium tabular-nums"
          note="Tổng tồn on-hand toàn bộ variants tại CN"
        />
      ),
    },
    {
      key: "hstk", label: "HSTK (ngày)", sortable: true, hideable: false,
      numeric: true, align: "right", priority: "high", width: 110,
      render: (r) => (
        <TermTooltip term="HSTK">
          <span className={cn(
            "tabular-nums font-medium cursor-help",
            r.tone === "block" && "text-danger",
            r.tone === "watch" && "text-warning",
            r.tone === "fresh" && "text-success",
          )}>
            {r.hstk.toFixed(1)}d
          </span>
        </TermTooltip>
      ),
    },
    {
      key: "tone", label: "Trạng thái", sortable: true, hideable: false, priority: "high",
      width: 130, accessor: (r) => r.tone,
      filter: "enum",
      filterOptions: [
        { value: "fresh", label: "🟢 Đủ" },
        { value: "watch", label: "🟡 Thấp" },
        { value: "block", label: "🔴 Nguy hiểm" },
      ],
      render: (r) => {
        const labelMap = { fresh: "Đủ", watch: "Thấp", block: "Nguy hiểm" } as const;
        const b = TONE_BADGE[r.tone];
        return (
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            b.cls,
          )}>
            <span>{b.icon}</span>{labelMap[r.tone]}
          </span>
        );
      },
    },
    {
      key: "actions", label: "Hành động", sortable: false, hideable: false,
      align: "right", priority: "high", width: 120,
      render: (r) => (
        r.tone === "block" ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => navigate(`/drp?cn=${r.cnCode}`)}
            className="h-7 px-2.5 text-[11px]"
          >
            <Eye className="h-3 w-3 mr-1" /> Xem DRP
          </Button>
        ) : r.tone === "watch" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/drp?cn=${r.cnCode}`)}
            className="h-7 px-2.5 text-[11px]"
          >
            Xem DRP
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1 text-success text-table-sm">
            <CheckCircle2 className="h-3.5 w-3.5" /> OK
          </span>
        )
      ),
    },
  ];

  return (
    <SmartTable<BranchRow>
      screenId="inventory-branches"
      title="Chi nhánh"
      exportFilename="ton-kho-chi-nhanh"
      columns={columns}
      data={rows}
      defaultDensity="normal"
      rowSeverity={(r) => r.tone === "block" ? "shortage" : r.tone === "watch" ? "watch" : "ok"}
      getRowId={(r) => r.cnCode}
      autoExpandWhen={(r) => r.hstk < 2}
      drillDown={(r) => (
        <div className="text-table-sm text-text-2 leading-relaxed">
          <span className="text-text-3 mr-2">Tồn theo variant:</span>
          {r.variants.length === 0 ? (
            <span className="italic text-text-3">— chưa có dữ liệu</span>
          ) : (
            r.variants.slice(0, 16).map((v, i) => (
              <span key={`${v.base}-${v.variant}-${i}`}>
                <span className="text-text-1 font-medium">{v.base}</span>{" "}
                <span className="text-text-3">{v.variant}</span>{" "}
                <span className="tabular-nums">{v.onHand.toLocaleString("vi-VN")}</span>
                {i < r.variants.length - 1 && <span className="text-text-3 mx-1.5">·</span>}
              </span>
            ))
          )}
        </div>
      )}
      summaryRow={{
        cnName: "Tổng",
        totalOnHand: <span className="tabular-nums font-semibold">{totals.t.toLocaleString("vi-VN")}</span>,
        hstk: <span className="tabular-nums font-semibold">{totals.avg.toFixed(1)}d avg</span>,
      }}
      emptyState={{
        icon: <MapPin />,
        title: "Chưa có dữ liệu chi nhánh",
        description: "Cấu hình Bravo sync hoặc upload CSV.",
        action: { label: "Tải template CN →", onClick: () => document.getElementById("inventory-upload-zone")?.scrollIntoView({ behavior: "smooth" }) },
      }}
    />
  );
}

/* ─────────────────────────── Upload Zone ─────────────────────────── */

function UploadZone() {
  const [dragging, setDragging] = useState(false);

  const pickFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls,.csv";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        toast.success(`Đã nhận file "${file.name}"`, {
          description: "Hệ thống đang preview & validate trước khi import.",
        });
      }
    };
    input.click();
  };

  const downloadTemplate = (kind: "nm" | "cn") => {
    const isNm = kind === "nm";
    const header = isNm
      ? "NM,Mã hàng,Tên,Tồn kho (m²),Đang SX (m²),Ghi chú\n"
      : "CN,Mã hàng,Variant,Tồn kho (m²),Safety Stock (m²),Ghi chú\n";
    const sample = isNm
      ? "Mikado,GA-300,Granite GA 30x30,4800,3200,\nMikado,GA-400,Granite GA 40x40,1500,1200,\n"
      : "CN-HCM,GA-300,A4,200,900,\nCN-BD,GA-300,A4,120,900,\n";
    const blob = new Blob([header + sample], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = isNm ? "template-NM.csv" : "template-CN.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã tải mẫu ${isNm ? "NM" : "CN"}`, {
      description: "Điền vào và kéo lại vào ô upload.",
    });
  };

  return (
    <section id="inventory-upload-zone" className="space-y-3 scroll-mt-24">
      <h3 className="text-section-header font-semibold text-text-1">Cập nhật tồn kho</h3>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) {
            toast.success(`Đã nhận file "${file.name}"`, {
              description: "Hệ thống đang preview & validate trước khi import.",
            });
          }
        }}
        onClick={pickFile}
        className={cn(
          "rounded-card border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
          dragging ? "border-primary bg-primary/5" : "border-surface-3 bg-surface-1/50 hover:border-primary/50",
        )}
      >
        <FileSpreadsheet className="h-9 w-9 mx-auto text-text-3 mb-2" />
        <p className="text-table text-text-1 font-medium mb-1">
          Kéo thả file Excel vào đây
        </p>
        <p className="text-table-sm text-text-3">
          Bravo export hoặc NM/CN template · chấp nhận .xlsx, .xls, .csv
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => downloadTemplate("nm")}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Tải template NM
        </Button>
        <Button variant="outline" size="sm" onClick={() => downloadTemplate("cn")}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Tải template CN
        </Button>
        <Button variant="secondary" size="sm" onClick={pickFile} className="ml-auto">
          <Upload className="h-3.5 w-3.5 mr-1.5" /> Chọn file
        </Button>
      </div>
    </section>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */

/* ─────────────────────────── Data sources per tab ─────────────────────────── */

const NM_SOURCES: DataSource[] = [
  {
    key: "api_sync",
    icon: <Zap />,
    title: "Tích hợp Bravo",
    description: "Tự động đồng bộ tồn NM từ Bravo ERP 2 lần/ngày (06:00, 22:00).",
    badge: "Sắp có",
    badgeColor: "gray",
    disabled: true,
    configurable: true,
    configRoute: "/config?tab=integration",
  },
  {
    key: "excel_upload",
    icon: <FileSpreadsheet />,
    title: "Upload Excel",
    description: "Upload file tồn kho NM theo template. Mỗi NM 1 file hoặc gộp chung.",
    badge: "Khuyến nghị",
    badgeColor: "green",
  },
  {
    key: "manual_input",
    icon: <Link2 />,
    title: "NM tự cập nhật",
    description: "Gửi link cho NM để tự nhập tồn kho trực tiếp. Thay thế cho Cổng NM.",
  },
];

const CN_SOURCES: DataSource[] = [
  {
    key: "api_sync",
    icon: <Zap />,
    title: "Tích hợp Bravo",
    description: "Tự động sync tồn CN từ Bravo. Lịch: 06:00 + 22:00 hàng ngày.",
    badge: "Đang hoạt động",
    badgeColor: "green",
    configurable: true,
    configRoute: "/config?tab=integration",
  },
  {
    key: "excel_upload",
    icon: <FileSpreadsheet />,
    title: "Upload CSV / Excel",
    description: "Upload file Bravo export (.csv). Dùng khi Bravo sync bị lỗi.",
    badge: "Dự phòng",
    badgeColor: "amber",
  },
];

export default function InventoryPage() {
  const { tenant } = useTenant();
  const scale = tenant === "TTC Agris" ? 0.75 : tenant === "Mondelez" ? 1.2 : 1;

  const factoryRows = useMemo(() => buildFactoryRows(scale), [scale]);
  const branchRows  = useMemo(() => buildBranchRows(scale),  [scale]);

  const [tab, setTab] = useState<"nm" | "cn">("nm");
  const [importerOpen, setImporterOpen] = useState(false);

  const blockedNm = factoryRows.filter((r) => r.tone === "block").length;
  const dangerCn  = branchRows.filter((r) => r.tone === "block").length;

  const handleSourceSelect = (key: string) => {
    setImporterOpen(false);
    const labels: Record<string, string> = {
      api_sync: "Tích hợp tự động",
      excel_upload: "Upload Excel",
      manual_input: "Nhập tay / Cập nhật từ NM",
    };
    toast.success(`Đã chọn: ${labels[key] ?? key}`, {
      description: tab === "nm"
        ? "Mở wizard 5 bước để nạp tồn kho NM."
        : "Mở wizard 5 bước để nạp tồn kho CN.",
    });
    if (key === "excel_upload") {
      setTimeout(() => {
        document.getElementById("inventory-upload-zone")?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
  };

  return (
    <AppLayout>
      <ScreenHeader
        title="Tồn kho"
        subtitle={`5 nhà máy · 12 chi nhánh · Cập nhật 06:00 sáng nay`}
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-button border border-surface-3 bg-surface-1 px-3 py-1.5 text-table-sm">
              <RefreshCw className="h-3.5 w-3.5 text-success" />
              <span className="text-text-2">Bravo sync v12 — 06:00</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-success-bg text-success px-1.5 py-0.5 text-[10px] font-medium">
                ● Active
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => setImporterOpen(true)}
              className="h-8 gap-1.5"
            >
              <Inbox className="h-3.5 w-3.5" />
              {tab === "nm" ? "Nhập tồn NM" : "Nhập tồn CN"}
            </Button>
          </div>
        }
      />

      <DataSourceSelector
        open={importerOpen}
        onClose={() => setImporterOpen(false)}
        title={tab === "nm" ? "Nhập tồn kho nhà máy" : "Nhập tồn kho chi nhánh"}
        description="Chọn nguồn nhập dữ liệu. Mỗi lần tạo 1 entry trong nhật ký."
        sources={tab === "nm" ? NM_SOURCES : CN_SOURCES}
        onSelect={handleSourceSelect}
      />

      {/* Summary chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setTab("nm")}
          className={cn(
            "rounded-button px-3 py-1.5 text-table-sm border transition-colors flex items-center gap-2",
            tab === "nm"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-surface-1 text-text-1 border-surface-3 hover:bg-surface-2",
          )}
        >
          <span className="font-medium">Nhà máy (5 NM)</span>
          {blockedNm > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-danger text-white px-1.5 py-0.5 text-[10px] font-bold">
              <AlertTriangle className="h-2.5 w-2.5" />{blockedNm}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("cn")}
          className={cn(
            "rounded-button px-3 py-1.5 text-table-sm border transition-colors flex items-center gap-2",
            tab === "cn"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-surface-1 text-text-1 border-surface-3 hover:bg-surface-2",
          )}
        >
          <span className="font-medium">Chi nhánh (12 CN)</span>
          {dangerCn > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-danger text-white px-1.5 py-0.5 text-[10px] font-bold">
              <AlertTriangle className="h-2.5 w-2.5" />{dangerCn}
            </span>
          )}
        </button>
        {blockedNm > 0 && (
          <div className="text-caption text-danger flex items-center gap-1.5 ml-auto">
            <AlertTriangle className="h-3.5 w-3.5" />
            {blockedNm} NM dữ liệu cũ ≥ 48h — CHẶN phát hành PO
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="mb-6">
        {tab === "nm" ? (
          <FactoriesTab rows={factoryRows} />
        ) : (
          <BranchesTab rows={branchRows} />
        )}
      </div>

      {/* Upload zone */}
      <div className="mb-6">
        <UploadZone />
      </div>

      {/* Workflow bridge — đồng bộ với daily steps */}
      <NextStepBanner step="supply.booking-done" />

      <div className="mt-6">
        <ChangeLogPanel entityType="nm_supply" maxItems={6} />
      </div>

      <ScreenFooter actionCount={6} />
    </AppLayout>
  );
}
