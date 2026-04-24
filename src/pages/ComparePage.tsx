/**
 * ComparePage — trung tâm so sánh phiên bản.
 *
 * Cho phép so sánh:
 *   • S&OP versions: v0/v1/v2/v3/v4
 *   • Planning periods: T5 vs T6
 *   • DRP runs: lịch sử batch
 *
 * Mỗi loại có pre-set source data từ enterprise dataset.
 */
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VersionDiffView, type DiffRow } from "@/components/VersionDiffView";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitCompare, Calendar, Layers, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRANCHES, SKU_BASES, DEMAND_VERSIONS, AOP_PLAN } from "@/data/unis-enterprise-dataset";

type CompareMode = "sop" | "period" | "drp";

const MODES: { id: CompareMode; label: string; icon: typeof GitCompare; desc: string }[] = [
  { id: "sop",    label: "S&OP Versions",   icon: Layers,        desc: "v0 → v4 trong consensus tháng" },
  { id: "period", label: "Kỳ kế hoạch",     icon: Calendar,      desc: "Plan T5 vs Plan T6" },
  { id: "drp",    label: "DRP Runs",        icon: ArrowLeftRight, desc: "Batch hôm trước vs hôm nay" },
];

type Vk = "v0" | "v1" | "v2" | "v3" | "v4";

const VK_LABELS: Record<Vk, { label: string; owner: string }> = {
  v0: { label: "v0", owner: "FC gốc — Thống kê tự động" },
  v1: { label: "v1", owner: "Sales nhập — sau review demand" },
  v2: { label: "v2", owner: "CN Manager nhập — bottom-up" },
  v3: { label: "v3", owner: "SC Manager đồng thuận — Day 5" },
  v4: { label: "v4", owner: "Locked — Day 7 final" },
};

export default function ComparePage() {
  const [mode, setMode] = useState<CompareMode>("sop");

  return (
    <AppLayout>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <GitCompare className="h-5 w-5 text-primary" />
          <h1 className="text-h2 font-display font-bold text-text-1">So sánh phiên bản</h1>
        </div>
        <p className="text-table-sm text-text-3">
          Side-by-side compare 2 phiên bản — highlight thay đổi tự động ±5%
        </p>
      </div>

      {/* Mode selector */}
      <div className="flex flex-wrap gap-2 mb-5">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "rounded-card border px-4 py-3 text-left transition-all min-w-[200px]",
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-surface-3 bg-surface-1 hover:border-surface-4",
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-text-3")} />
                <span className={cn("font-semibold text-table-sm", active ? "text-primary" : "text-text-1")}>
                  {m.label}
                </span>
              </div>
              <div className="text-caption text-text-3">{m.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Compare view */}
      <div className="rounded-card border border-surface-3 bg-surface-0 p-5">
        {mode === "sop"    && <SopCompare />}
        {mode === "period" && <PeriodCompare />}
        {mode === "drp"    && <DrpCompare />}
      </div>
    </AppLayout>
  );
}

/* ═════════════════════════════════════════════════════════════════
   S&OP Version Compare
   ═════════════════════════════════════════════════════════════════ */
function SopCompare() {
  const [leftV, setLeftV] = useState<Vk>("v2");
  const [rightV, setRightV] = useState<Vk>("v3");

  const rows = useMemo<DiffRow[]>(() => {
    return DEMAND_VERSIONS.map((r) => ({
      id: r.cnCode,
      label: r.cnCode,
      group: BRANCHES.find(b => b.code === r.cnCode)?.region,
      left: r[leftV],
      right: r[rightV],
      unit: "m²",
    }));
  }, [leftV, rightV]);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <VersionPicker label="Phiên A" value={leftV} onChange={setLeftV} />
        <span className="text-text-3 pb-2 mt-auto">↔</span>
        <VersionPicker label="Phiên B" value={rightV} onChange={setRightV} />
        <Button variant="outline" size="sm" className="ml-auto"
          onClick={() => { const t = leftV; setLeftV(rightV); setRightV(t); }}>
          ⇄ Đổi chiều
        </Button>
      </div>

      <VersionDiffView
        leftLabel={`${VK_LABELS[leftV].label} — ${VK_LABELS[leftV].owner.split(" — ")[0]}`}
        leftSubtitle={VK_LABELS[leftV].owner}
        rightLabel={`${VK_LABELS[rightV].label} — ${VK_LABELS[rightV].owner.split(" — ")[0]}`}
        rightSubtitle={VK_LABELS[rightV].owner}
        rows={rows}
      />
    </div>
  );
}

function VersionPicker({ label, value, onChange }: { label: string; value: Vk; onChange: (v: Vk) => void }) {
  return (
    <div>
      <div className="text-caption text-text-3 mb-1 font-semibold uppercase tracking-wide">{label}</div>
      <Select value={value} onValueChange={(v) => onChange(v as Vk)}>
        <SelectTrigger className="w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(VK_LABELS) as Vk[]).map((vk) => (
            <SelectItem key={vk} value={vk}>
              <span className="font-mono font-semibold mr-2">{VK_LABELS[vk].label}</span>
              <span className="text-text-3 text-caption">{VK_LABELS[vk].owner.split(" — ")[0]}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   Planning Period Compare (T5 vs T6)
   ═════════════════════════════════════════════════════════════════ */
function PeriodCompare() {
  const months = [4, 5, 6, 7];
  const [leftM, setLeftM] = useState(5);
  const [rightM, setRightM] = useState(6);

  const rows = useMemo<DiffRow[]>(() => {
    const monthLeft = AOP_PLAN.totalTarget * (AOP_PLAN.monthlyWeights[leftM - 1] / 100);
    const monthRight = AOP_PLAN.totalTarget * (AOP_PLAN.monthlyWeights[rightM - 1] / 100);
    // Phân bổ tháng × region weight × CN-share trong region
    const regionCnCount: Record<string, number> = {};
    BRANCHES.forEach(cn => { regionCnCount[cn.region] = (regionCnCount[cn.region] ?? 0) + 1; });
    return BRANCHES.map((cn) => {
      const regionW = (AOP_PLAN.regionWeights[cn.region] ?? 0) / 100;
      const cnShare = 1 / Math.max(1, regionCnCount[cn.region]);
      return {
        id: cn.code,
        label: cn.code,
        group: cn.region,
        left: Math.round(monthLeft * regionW * cnShare),
        right: Math.round(monthRight * regionW * cnShare),
        unit: "m²",
      };
    });
  }, [leftM, rightM]);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <MonthPicker label="Kỳ A" value={leftM} onChange={setLeftM} months={months} />
        <span className="text-text-3 pb-2 mt-auto">↔</span>
        <MonthPicker label="Kỳ B" value={rightM} onChange={setRightM} months={months} />
        <Button variant="outline" size="sm" className="ml-auto"
          onClick={() => { const t = leftM; setLeftM(rightM); setRightM(t); }}>
          ⇄ Đổi chiều
        </Button>
      </div>

      <VersionDiffView
        leftLabel={`Plan T${leftM}/2026`}
        leftSubtitle="Phân bổ AOP × seasonal weight"
        rightLabel={`Plan T${rightM}/2026`}
        rightSubtitle="Phân bổ AOP × seasonal weight"
        rows={rows}
      />
    </div>
  );
}

function MonthPicker({ label, value, onChange, months }: { label: string; value: number; onChange: (v: number) => void; months: number[] }) {
  return (
    <div>
      <div className="text-caption text-text-3 mb-1 font-semibold uppercase tracking-wide">{label}</div>
      <Select value={String(value)} onValueChange={(v) => onChange(parseInt(v, 10))}>
        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {months.map(m => (
            <SelectItem key={m} value={String(m)}>Tháng {m}/2026</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   DRP Run Compare (mock 2 batches)
   ═════════════════════════════════════════════════════════════════ */
function DrpCompare() {
  const rows = useMemo<DiffRow[]>(() => {
    // Mock 2 batches: hôm qua vs hôm nay
    return BRANCHES.slice(0, 12).map((cn, i) => {
      const base = 2000 + (i * 350);
      const left = base + Math.round(Math.sin(i) * 200);
      const right = base + Math.round(Math.cos(i * 1.3) * 350) + (i === 2 ? 800 : 0); // CN-HCM tăng đột biến
      return {
        id: cn.code,
        label: cn.code,
        group: cn.region,
        left,
        right,
        unit: "m²",
      };
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded border border-info/30 bg-info-bg p-3 text-table-sm text-text-2">
        <strong className="text-info">So sánh 2 batch DRP gần nhất</strong> — hôm qua (W19) vs hôm nay (W20). Highlight các CN có nhu cầu thay đổi đột biến.
      </div>

      <VersionDiffView
        leftLabel="DRP-W19 (22/04 23:02)"
        leftSubtitle="142 dòng · 3 ngoại lệ · 5 PO"
        rightLabel="DRP-W20 (23/04 23:01)"
        rightSubtitle="148 dòng · 6 ngoại lệ · 9 PO"
        rows={rows}
      />
    </div>
  );
}
