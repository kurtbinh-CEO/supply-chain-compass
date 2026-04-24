import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Phone, Plus, Search, Upload, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  CARRIERS,
  TRANSPORT_RATES,
  RATE_VEHICLE_LABELS,
  type Carrier,
  type RateVehicleKind,
} from "@/data/unis-enterprise-dataset";

const VEHICLE_ORDER: RateVehicleKind[] = ["truck_10t", "truck_15t", "20ft", "40ft"];

const fmtVnd = (v: number) =>
  v <= 0 ? "—" : v.toLocaleString("vi-VN");

function statusOf(c: Carrier) {
  return c.status ?? (c.available ? "Hoạt động" : "Tạm ngưng");
}

export function CarriersTab() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return CARRIERS.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.code ?? "").toLowerCase().includes(q) ||
        c.region.join(",").toLowerCase().includes(q) ||
        (c.contactName ?? "").toLowerCase().includes(q)
      );
    });
  }, [search]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nhà xe, mã NVT, vùng, người liên hệ..."
            className="w-full h-9 pl-9 pr-3 rounded-button border border-surface-3 bg-surface-0 text-table text-text-1 placeholder:text-text-3"
          />
        </div>
        <button
          onClick={() => toast("Thêm nhà xe (demo)")}
          className="h-9 px-3 rounded-button bg-gradient-primary text-primary-foreground text-table-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" /> Thêm nhà xe
        </button>
        <button
          onClick={() => toast("Upload bảng nhà xe (demo)")}
          className="h-9 px-3 rounded-button border border-surface-3 bg-surface-2 text-text-2 text-table-sm font-medium flex items-center gap-1.5 hover:bg-surface-1 transition-colors"
        >
          <Upload className="h-3.5 w-3.5" /> Nhập Excel
        </button>
      </div>

      {/* Table */}
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <table className="w-full text-table">
          <thead>
            <tr className="bg-surface-1">
              <th className="w-8" />
              {[
                "Mã NVT",
                "Tên nhà xe",
                "Loại",
                "Vùng phục vụ",
                "Liên hệ",
                "SLA đúng hẹn",
                "Trạng thái",
                "Ghi chú",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2.5 text-table-header uppercase text-text-3 font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => {
              const isOpen = expanded === c.id;
              const status = statusOf(c);
              const rateRows = TRANSPORT_RATES.filter((r) => r.carrierId === c.id);
              const routes = Array.from(
                new Map(rateRows.map((r) => [r.routeKey, r.routeLabel])).entries(),
              );

              return (
                <>
                  <tr
                    key={c.id}
                    className={`${
                      i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"
                    } hover:bg-surface-3 cursor-pointer transition-colors`}
                    onClick={() => setExpanded(isOpen ? null : c.id)}
                  >
                    <td className="px-2 py-2.5 text-text-3">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-medium text-text-1">
                      {c.code ?? c.id}
                    </td>
                    <td className="px-3 py-2.5 text-text-1 font-medium">{c.name}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-table-sm font-medium ${
                          c.type === "Đối tác"
                            ? "bg-info-bg text-info"
                            : c.type === "Nội bộ"
                            ? "bg-surface-1 border border-surface-3 text-text-2"
                            : "bg-warning-bg text-warning"
                        }`}
                      >
                        {c.type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-text-2">
                      {c.region.join(", ")}
                    </td>
                    <td className="px-3 py-2.5 text-text-2">
                      <div className="flex flex-col">
                        {c.contactName && (
                          <span className="text-text-1">{c.contactName}</span>
                        )}
                        <span className="inline-flex items-center gap-1 text-table-sm text-text-3">
                          <Phone className="h-3 w-3" />
                          {c.phone}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-table-sm font-medium ${
                          c.slaOnTimePct >= 90
                            ? "bg-success-bg text-success"
                            : c.slaOnTimePct >= 80
                            ? "bg-warning-bg text-warning"
                            : "bg-danger-bg text-danger"
                        }`}
                      >
                        {c.slaOnTimePct}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-table-sm font-medium ${
                          status === "Hoạt động"
                            ? "bg-success-bg text-success"
                            : "bg-surface-1 border border-surface-3 text-text-3"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-text-3 max-w-[260px] truncate">
                      {c.note}
                    </td>
                  </tr>

                  {isOpen && (
                    <tr className="bg-surface-1/60">
                      <td colSpan={9} className="px-6 py-5 border-t border-surface-3">
                        <CarrierRateDetails
                          carrier={c}
                          routes={routes}
                          rateRows={rateRows}
                        />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-text-3 text-table">
                  Không tìm thấy nhà xe.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-table-sm text-text-3">
        {rows.length} / {CARRIERS.length} nhà xe
      </p>
    </div>
  );
}

function CarrierRateDetails({
  carrier,
  routes,
  rateRows,
}: {
  carrier: Carrier;
  routes: [string, string][];
  rateRows: { routeKey: string; vehicleKind: RateVehicleKind; ratePerTrip: number }[];
}) {
  const surcharge = { loadUnload: 500_000, bot: 200_000, port: 800_000, returnEmpty: 1_500_000 };
  const validRange = "01/01/2026 → 30/06/2026";

  if (routes.length === 0) {
    return (
      <div className="text-table-sm text-text-3">
        Chưa có bảng cước cho <span className="font-medium text-text-2">{carrier.name}</span>.{" "}
        <button
          onClick={() => toast("Tạo bảng cước (demo)")}
          className="text-primary hover:underline"
        >
          Tạo bảng cước mới
        </button>
      </div>
    );
  }

  const rateOf = (routeKey: string, kind: RateVehicleKind) =>
    rateRows.find((r) => r.routeKey === routeKey && r.vehicleKind === kind)?.ratePerTrip ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-display text-section-header text-text-1">
            Cước vận chuyển — {carrier.name}
          </h4>
          <p className="text-table-sm text-text-3 mt-0.5">
            Hiệu lực: <span className="text-text-2 font-medium">{validRange}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toast("Sửa cước (demo)")}
            className="h-8 px-3 rounded-button border border-surface-3 bg-surface-2 text-text-2 text-table-sm font-medium flex items-center gap-1.5 hover:bg-surface-1 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" /> Sửa cước
          </button>
          <button
            onClick={() => toast("Upload bảng cước Excel (demo)")}
            className="h-8 px-3 rounded-button border border-surface-3 bg-surface-2 text-text-2 text-table-sm font-medium flex items-center gap-1.5 hover:bg-surface-1 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" /> Upload Excel
          </button>
          <button
            onClick={() => toast("Tạo bảng cước mới (demo)")}
            className="h-8 px-3 rounded-button bg-gradient-primary text-primary-foreground text-table-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" /> Bảng cước mới
          </button>
        </div>
      </div>

      {/* Rate table per route × vehicle */}
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-x-auto">
        <table className="w-full text-table">
          <thead>
            <tr className="bg-surface-1">
              <th className="text-left px-3 py-2.5 text-table-header uppercase text-text-3 font-medium">
                Tuyến
              </th>
              {VEHICLE_ORDER.map((v) => (
                <th
                  key={v}
                  className="text-right px-3 py-2.5 text-table-header uppercase text-text-3 font-medium"
                >
                  {RATE_VEHICLE_LABELS[v]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {routes.map(([key, label], i) => (
              <tr
                key={key}
                className={`${i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"} transition-colors`}
              >
                <td className="px-3 py-2.5 text-text-1 font-medium">{label}</td>
                {VEHICLE_ORDER.map((v) => {
                  const r = rateOf(key, v);
                  return (
                    <td
                      key={v}
                      className="px-3 py-2.5 text-right tabular-nums text-text-2"
                    >
                      {r > 0 ? `${fmtVnd(r)} ₫` : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Surcharges */}
      <div className="rounded-card border border-surface-3 bg-surface-2 p-4">
        <div className="text-table-sm text-text-3 uppercase tracking-wide mb-3 font-medium">
          Phụ phí áp dụng cho mọi tuyến
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SurchargeField label="Bốc dỡ" value={surcharge.loadUnload} unit="/chuyến" />
          <SurchargeField label="Phí BOT" value={surcharge.bot} unit="/chuyến" />
          <SurchargeField label="Phí cảng" value={surcharge.port} unit="(chỉ container)" />
          <SurchargeField label="Xe quay đầu rỗng" value={surcharge.returnEmpty} unit="/chuyến" />
        </div>
      </div>
    </div>
  );
}

function SurchargeField({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div>
      <label className="text-table-sm text-text-3 uppercase tracking-wide font-medium block mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          defaultValue={value.toLocaleString("vi-VN")}
          onBlur={(e) => toast(`${label}: ${e.target.value} ₫ (lưu demo)`)}
          className="flex-1 h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table tabular-nums text-text-1 hover:border-primary focus:border-primary focus:outline-none"
        />
        <span className="text-table-sm text-text-3 whitespace-nowrap">{unit}</span>
      </div>
    </div>
  );
}
