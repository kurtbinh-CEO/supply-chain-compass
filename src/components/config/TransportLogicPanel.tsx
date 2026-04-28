/* ════════════════════════════════════════════════════════════════════════════
   §  TransportLogicPanel — 4 ma trận logic vận tải
   §  Hiển thị trong ConfigPage > Tab "Vận tải" (trên các keys hiện có)
   §  ① Route-Vehicle constraint (read-only matrix)
   §  ② Drop consolidation eligibility (read-only matrix per NM)
   §  ③ Fill-up decision tree (read-only flowchart text)
   §  ④ Manual edit thresholds (editable inputs, persist localStorage)
   ════════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState, useMemo } from "react";
import {
  Route, Combine, GitBranch, SlidersHorizontal,
  RotateCcw, Check, X, AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { ROUTE_CONSTRAINTS, ROUTE_TYPE_LABELS } from "@/data/route-constraints";
import { DROP_ELIGIBILITY } from "@/data/drop-eligibility";
import { VEHICLE_CATALOG } from "@/data/vehicle-types";
import {
  TRANSPORT_CONFIG_KEYS,
  TRANSPORT_DEFAULTS,
  type TransportConfig,
  type TransportConfigKeyMeta,
  getTransportConfig,
  setTransportValue,
  resetAllTransportConfig,
} from "@/data/transport-config";

/* ── Hook đọc transport config + listen storage event ── */
function useTransportConfig() {
  const [config, setConfig] = useState<TransportConfig>(() => getTransportConfig());
  useEffect(() => {
    const handler = () => setConfig(getTransportConfig());
    window.addEventListener("transport-config-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("transport-config-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return config;
}

/* ════════════════════════════════════════════════════════════════════════
   ① Route-Vehicle constraint matrix
   ════════════════════════════════════════════════════════════════════════ */
function RouteConstraintMatrix() {
  return (
    <div className="rounded-md border border-surface-3 overflow-hidden">
      <table className="w-full text-table-sm">
        <thead className="bg-surface-1 text-text-2 text-caption uppercase tracking-wide">
          <tr>
            <th className="text-left px-3 py-2 font-semibold w-[200px]">Tuyến</th>
            <th className="text-left px-3 py-2 font-semibold w-[120px]">Loại</th>
            <th className="text-left px-3 py-2 font-semibold">Xe được phép</th>
            <th className="text-center px-3 py-2 font-semibold w-[80px]">Cont bắt buộc</th>
            <th className="text-right px-3 py-2 font-semibold w-[100px]">Detour max</th>
            <th className="text-left px-3 py-2 font-semibold">Ghi chú</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-3">
          {ROUTE_CONSTRAINTS.map((r) => (
            <tr key={r.id} className="hover:bg-surface-1/50">
              <td className="px-3 py-2 text-text-1 font-medium">{r.routeLabel}</td>
              <td className="px-3 py-2 text-text-2">{ROUTE_TYPE_LABELS[r.routeType]}</td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {r.allowedVehicles.map((v) => {
                    const isPreferred = v === r.preferredVehicle;
                    return (
                      <Badge
                        key={v}
                        variant={isPreferred ? "default" : "outline"}
                        className={cn(
                          "text-[10px] px-1.5 py-0 h-5",
                          isPreferred && "bg-primary text-primary-foreground",
                        )}
                      >
                        {VEHICLE_CATALOG[v]?.label ?? v}
                        {isPreferred && " ★"}
                      </Badge>
                    );
                  })}
                </div>
              </td>
              <td className="px-3 py-2 text-center">
                {r.containerRequired ? (
                  <Check className="h-4 w-4 text-success inline" aria-label="Bắt buộc container" />
                ) : (
                  <X className="h-4 w-4 text-text-3 inline" aria-label="Không bắt buộc" />
                )}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-mono text-text-2">
                {r.maxDetourKm}km
              </td>
              <td className="px-3 py-2 text-text-3 text-caption">{r.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ② Drop consolidation eligibility per NM
   ════════════════════════════════════════════════════════════════════════ */
function DropEligibilityMatrix() {
  return (
    <Accordion type="multiple" className="space-y-2">
      {DROP_ELIGIBILITY.map((nm) => {
        const eligibleCount = nm.pairs.filter((p) => p.eligible).length;
        return (
          <AccordionItem
            key={nm.nmId}
            value={nm.nmId}
            className="border border-surface-3 rounded-md bg-surface-0 overflow-hidden"
          >
            <AccordionTrigger className="px-3 py-2 hover:bg-surface-1/50 hover:no-underline">
              <div className="flex items-center gap-2 flex-1 text-left">
                <span className="text-table-sm font-medium text-text-1">{nm.nmName}</span>
                <Badge variant="outline" className="text-[10px] h-5">
                  {eligibleCount}/{nm.pairs.length} cặp ghép được
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0 pb-0">
              <table className="w-full text-table-sm border-t border-surface-3">
                <thead className="bg-surface-1 text-text-2 text-caption uppercase">
                  <tr>
                    <th className="text-left px-3 py-1.5 font-semibold w-[120px]">CN A</th>
                    <th className="text-left px-3 py-1.5 font-semibold w-[120px]">CN B</th>
                    <th className="text-right px-3 py-1.5 font-semibold w-[90px]">Detour</th>
                    <th className="text-center px-3 py-1.5 font-semibold w-[100px]">Ghép được</th>
                    <th className="text-left px-3 py-1.5 font-semibold">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-3">
                  {nm.pairs.map((p, i) => (
                    <tr key={`${nm.nmId}-${i}`} className="hover:bg-surface-1/50">
                      <td className="px-3 py-1.5 font-mono text-text-1">{p.cn1}</td>
                      <td className="px-3 py-1.5 font-mono text-text-1">{p.cn2}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-mono text-text-2">
                        {p.detourKm}km
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {p.eligible ? (
                          <Badge className="bg-success/15 text-success border-success/30 text-[10px] h-5">
                            ✅ Có
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-text-3 text-[10px] h-5">
                            ❌ Không
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-caption text-text-3">
                        {p.eligible
                          ? `${p.direction ?? ""} · Tiết kiệm ~${((p.estSavingVnd ?? 0) / 1_000_000).toFixed(1)}M₫`
                          : (p.reason ?? "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ③ Fill-up decision tree (visual flow)
   ════════════════════════════════════════════════════════════════════════ */
function FillUpDecisionTree() {
  const cfg = useTransportConfig();
  return (
    <div className="rounded-md border border-surface-3 bg-surface-0 p-4 space-y-2 text-table-sm">
      <p className="text-text-2 mb-3">
        Khi container fill &lt; 100%, hệ thống tự chọn chiến lược theo cây quyết định sau (farmer review):
      </p>

      <div className="font-mono text-caption space-y-1 leading-relaxed text-text-1">
        <div className="text-primary font-semibold">Container fill &lt; 100%</div>
        <div className="pl-4">│</div>
        <div className="pl-4">├── Có CN ghép được? <span className="text-success">YES</span></div>
        <div className="pl-8">├── Ghép xong ≥ 80%? → <span className="text-success">CONSOLIDATION</span> (ưu tiên #1)</div>
        <div className="pl-8">└── Vẫn &lt; 80%? → <span className="text-success">CONSOLIDATION + ROUND-UP</span></div>
        <div className="pl-4">│</div>
        <div className="pl-4">├── Không ghép được + gap MOQ ≤ <span className="text-warning">{cfg.round_up_max_gap_pct_of_moq}%</span> → <span className="text-success">ROUND-UP</span></div>
        <div className="pl-4">│</div>
        <div className="pl-4">├── Gap &gt; {cfg.round_up_max_gap_pct_of_moq}% + có PO tuần sau + HSTK &gt; <span className="text-warning">{cfg.hold_safe_hstk_days}d</span> → <span className="text-info">HOLD</span> (max {cfg.hold_max_days}d)</div>
        <div className="pl-4">│</div>
        <div className="pl-4">├── CN urgent (HSTK &lt; {cfg.hold_safe_hstk_days}d) → <span className="text-danger">SHIP AS-IS</span> (bắt buộc)</div>
        <div className="pl-4">│</div>
        <div className="pl-4">└── Fill ≥ 80% → <span className="text-text-2">OK, không xử lý thêm</span></div>
      </div>

      <div className="mt-4 pt-3 border-t border-surface-3">
        <p className="text-caption text-text-3 mb-2 font-semibold uppercase tracking-wide">Thứ tự ưu tiên</p>
        <ol className="text-caption text-text-2 space-y-1 list-decimal pl-5">
          <li><span className="font-semibold text-success">CONSOLIDATION</span> — ghép CN, free fill, không tốn vốn</li>
          <li><span className="font-semibold text-text-1">ROUND-UP</span> — thêm hàng đạt MOQ + fill cao</li>
          <li><span className="font-semibold text-info">HOLD</span> — chờ gom, delay 1-2d nhưng fill tốt</li>
          <li><span className="font-semibold text-danger">SHIP AS-IS</span> — fill thấp, cước/m² cao, cho CN urgent</li>
        </ol>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ④ Manual edit thresholds (editable)
   ════════════════════════════════════════════════════════════════════════ */
function ThresholdRow({
  meta, value, onCommit, isOverridden,
}: {
  meta: TransportConfigKeyMeta;
  value: TransportConfig[keyof TransportConfig];
  onCommit: (v: TransportConfig[keyof TransportConfig]) => void;
  isOverridden: boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);

  const ringClass = isOverridden ? "ring-2 ring-warning/40 ring-offset-1 ring-offset-background" : "";

  return (
    <tr className="hover:bg-surface-1/50">
      <td className="px-3 py-2 align-top">
        <div className="flex items-center gap-1.5">
          <span className="text-table-sm font-medium text-text-1">{meta.label}</span>
          {isOverridden && (
            <Badge className="bg-warning-bg text-warning border-warning/30 text-[9px] h-4 px-1.5 uppercase">
              sửa
            </Badge>
          )}
        </div>
        <p className="text-caption text-text-3 mt-0.5">{meta.description}</p>
      </td>
      <td className="px-3 py-2 align-top">
        {meta.inputType === "select" && meta.options ? (
          <Select value={String(value)} onValueChange={(v) => onCommit(v as TransportConfig[keyof TransportConfig])}>
            <SelectTrigger className={cn("h-8 w-[200px] text-table-sm", ringClass)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meta.options.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-table-sm">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className={cn("inline-flex items-center gap-1.5 rounded-md", ringClass)}>
            <Input
              type="number"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                const num = Number(draft);
                if (Number.isNaN(num)) {
                  setDraft(String(value));
                  toast.error("Giá trị phải là số");
                  return;
                }
                if (num !== value) onCommit(num as TransportConfig[keyof TransportConfig]);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setDraft(String(value));
              }}
              className="h-8 w-24 text-table-sm tabular-nums text-right font-mono"
            />
            {meta.unit && <span className="text-caption text-text-3">{meta.unit}</span>}
          </div>
        )}
      </td>
      <td className="px-3 py-2 align-top text-right">
        <code className="text-[11px] font-mono text-text-3">
          {String(TRANSPORT_DEFAULTS[meta.key])}
        </code>
      </td>
    </tr>
  );
}

function ThresholdGroup({
  title, group, config,
}: {
  title: string;
  group: TransportConfigKeyMeta["group"];
  config: TransportConfig;
}) {
  const items = TRANSPORT_CONFIG_KEYS.filter((k) => k.group === group);
  return (
    <div className="rounded-md border border-surface-3 bg-surface-0 overflow-hidden">
      <div className="px-3 py-2 bg-surface-1 border-b border-surface-3">
        <h4 className="text-table-sm font-semibold text-text-1 uppercase tracking-wide">{title}</h4>
      </div>
      <table className="w-full">
        <thead className="bg-surface-1/50 text-caption uppercase text-text-3">
          <tr>
            <th className="text-left px-3 py-1.5 font-semibold">Tham số</th>
            <th className="text-left px-3 py-1.5 font-semibold w-[260px]">Giá trị</th>
            <th className="text-right px-3 py-1.5 font-semibold w-[100px]">Mặc định</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-3">
          {items.map((meta) => (
            <ThresholdRow
              key={meta.key}
              meta={meta}
              value={config[meta.key]}
              isOverridden={config[meta.key] !== TRANSPORT_DEFAULTS[meta.key]}
              onCommit={(v) => {
                setTransportValue(meta.key, v);
                toast.success(`Đã lưu ${meta.label}`, { description: `Giá trị mới: ${v}` });
              }}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Main panel
   ════════════════════════════════════════════════════════════════════════ */
export function TransportLogicPanel() {
  const config = useTransportConfig();
  const overriddenCount = useMemo(
    () => TRANSPORT_CONFIG_KEYS.filter((k) => config[k.key] !== TRANSPORT_DEFAULTS[k.key]).length,
    [config],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-table-sm text-text-2">
          <span className="font-semibold text-text-1">4 ma trận logic vận tải</span> — quy tắc
          hệ thống dùng khi xếp container, ghép tuyến và validate thao tác farmer.
          {overriddenCount > 0 && (
            <span className="ml-2">
              <Badge className="bg-warning-bg text-warning border-warning/30 text-[10px] h-5">
                {overriddenCount} ngưỡng đang ghi đè
              </Badge>
            </span>
          )}
        </div>
        {overriddenCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => {
              resetAllTransportConfig();
              toast.success("Đã khôi phục mặc định", {
                description: `${overriddenCount} ngưỡng được reset`,
              });
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Khôi phục mặc định
          </Button>
        )}
      </div>

      <Accordion type="multiple" defaultValue={["m1", "m4"]} className="space-y-3">
        {/* ① */}
        <AccordionItem value="m1" className="border border-surface-3 rounded-md bg-surface-0">
          <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-surface-1/50">
            <div className="flex items-center gap-2 flex-1 text-left">
              <Route className="h-4 w-4 text-primary" />
              <span className="text-table-sm font-semibold text-text-1">① Ma trận tuyến — phương tiện</span>
              <span className="text-caption text-text-3">({ROUTE_CONSTRAINTS.length} tuyến)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 pt-0">
            <RouteConstraintMatrix />
          </AccordionContent>
        </AccordionItem>

        {/* ② */}
        <AccordionItem value="m2" className="border border-surface-3 rounded-md bg-surface-0">
          <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-surface-1/50">
            <div className="flex items-center gap-2 flex-1 text-left">
              <Combine className="h-4 w-4 text-primary" />
              <span className="text-table-sm font-semibold text-text-1">② Ma trận ghép tuyến (drop eligibility)</span>
              <span className="text-caption text-text-3">({DROP_ELIGIBILITY.length} NM)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 pt-0">
            <DropEligibilityMatrix />
          </AccordionContent>
        </AccordionItem>

        {/* ③ */}
        <AccordionItem value="m3" className="border border-surface-3 rounded-md bg-surface-0">
          <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-surface-1/50">
            <div className="flex items-center gap-2 flex-1 text-left">
              <GitBranch className="h-4 w-4 text-primary" />
              <span className="text-table-sm font-semibold text-text-1">③ Cây quyết định fill container</span>
              <span className="text-caption text-text-3">(round-up vs ghép vs hold)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 pt-0">
            <FillUpDecisionTree />
          </AccordionContent>
        </AccordionItem>

        {/* ④ */}
        <AccordionItem value="m4" className="border border-surface-3 rounded-md bg-surface-0">
          <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-surface-1/50">
            <div className="flex items-center gap-2 flex-1 text-left">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <span className="text-table-sm font-semibold text-text-1">④ Ngưỡng chỉnh tay (editable)</span>
              <span className="text-caption text-text-3">({TRANSPORT_CONFIG_KEYS.length} tham số)</span>
              {overriddenCount > 0 && (
                <Badge className="bg-warning text-warning-foreground text-[10px] h-5 px-1.5">
                  {overriddenCount}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 pt-0 space-y-3">
            <div className="rounded-md bg-info/10 border border-info/30 px-3 py-2 flex items-start gap-2 text-caption text-text-2">
              <AlertTriangle className="h-4 w-4 text-info shrink-0 mt-0.5" />
              <p>
                Các ngưỡng này áp dụng khi farmer chỉnh PO trong container hoặc khi hệ thống
                quyết định ghép/hold/round-up. Thay đổi lưu vào trình duyệt
                (<code className="font-mono text-[10px]">localStorage</code>) — chưa đồng bộ server.
              </p>
            </div>
            <ThresholdGroup title="Edit qty (sửa số lượng PO)" group="edit" config={config} />
            <ThresholdGroup title="Ghép tuyến (consolidation)" group="consolidation" config={config} />
            <ThresholdGroup title="Round-up (đạt MOQ)" group="round_up" config={config} />
            <ThresholdGroup title="Hold (giữ chờ gom)" group="hold" config={config} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
