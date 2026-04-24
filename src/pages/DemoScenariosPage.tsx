/**
 * DemoScenariosPage — danh mục các tình huống edge case để team test workflow.
 * Truy cập: /scenarios (chỉ xem, không thay đổi data).
 */
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { DEMO_SCENARIOS, type DemoScenario } from "@/data/demo-scenarios";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Info, ChevronRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const SEVERITY_META = {
  critical: { icon: AlertTriangle, color: "text-danger", bg: "bg-danger-bg", border: "border-danger/40", label: "🔴 Nguy cấp" },
  warn: { icon: AlertCircle, color: "text-warning", bg: "bg-warning-bg", border: "border-warning/40", label: "🟡 Cảnh báo" },
  info: { icon: Info, color: "text-info", bg: "bg-info-bg", border: "border-info/40", label: "🔵 Thông tin" },
} as const;

export default function DemoScenariosPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "critical" | "warn" | "info">("all");
  const [openId, setOpenId] = useState<string | null>(DEMO_SCENARIOS[0]?.id ?? null);

  const filtered = filter === "all" ? DEMO_SCENARIOS : DEMO_SCENARIOS.filter(s => s.severity === filter);
  const counts = {
    critical: DEMO_SCENARIOS.filter(s => s.severity === "critical").length,
    warn: DEMO_SCENARIOS.filter(s => s.severity === "warn").length,
    info: DEMO_SCENARIOS.filter(s => s.severity === "info").length,
  };

  return (
    <AppLayout>
      <div className="mb-4">
        <h1 className="text-h2 font-display font-bold text-text-1">Tình huống Demo — Edge Cases</h1>
        <p className="text-table-sm text-text-3 mt-0.5">
          {DEMO_SCENARIOS.length} kịch bản đã chuẩn bị · Dùng để onboard team mới + test workflow
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <FilterChip label={`Tất cả (${DEMO_SCENARIOS.length})`} active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterChip label={`🔴 Nguy cấp (${counts.critical})`} active={filter === "critical"} onClick={() => setFilter("critical")} tone="danger" />
        <FilterChip label={`🟡 Cảnh báo (${counts.warn})`} active={filter === "warn"} onClick={() => setFilter("warn")} tone="warning" />
        <FilterChip label={`🔵 Info (${counts.info})`} active={filter === "info"} onClick={() => setFilter("info")} tone="info" />
      </div>

      <div className="grid lg:grid-cols-[1fr_2fr] gap-4">
        {/* List */}
        <div className="space-y-2">
          {filtered.map((s) => {
            const meta = SEVERITY_META[s.severity];
            const Icon = meta.icon;
            const isOpen = openId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setOpenId(s.id)}
                className={cn(
                  "w-full text-left rounded-card border p-3 transition-all",
                  isOpen ? `${meta.border} ${meta.bg}` : "border-surface-3 bg-surface-1 hover:border-surface-4",
                )}
              >
                <div className="flex items-start gap-2">
                  <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", meta.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-table-sm font-semibold text-text-1 leading-snug">{s.title}</div>
                    <div className="text-caption text-text-3 mt-1 line-clamp-2">{s.trigger}</div>
                  </div>
                  <ChevronRight className={cn("h-4 w-4 shrink-0 text-text-3 transition-transform", isOpen && "rotate-90")} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail */}
        <div>
          {openId && (() => {
            const s = filtered.find(x => x.id === openId) ?? DEMO_SCENARIOS.find(x => x.id === openId)!;
            if (!s) return null;
            const meta = SEVERITY_META[s.severity];
            return <ScenarioDetail s={s} meta={meta} navigate={navigate} />;
          })()}
        </div>
      </div>
    </AppLayout>
  );
}

function FilterChip({ label, active, onClick, tone }: { label: string; active: boolean; onClick: () => void; tone?: "danger" | "warning" | "info" }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-table-sm font-medium transition-all",
        active
          ? tone === "danger" ? "border-danger bg-danger-bg text-danger"
          : tone === "warning" ? "border-warning bg-warning-bg text-warning"
          : tone === "info" ? "border-info bg-info-bg text-info"
          : "border-primary bg-primary/10 text-primary"
          : "border-surface-3 bg-surface-2 text-text-2 hover:border-surface-4",
      )}
    >
      {label}
    </button>
  );
}

function ScenarioDetail({ s, meta, navigate }: { s: DemoScenario; meta: typeof SEVERITY_META[keyof typeof SEVERITY_META]; navigate: (path: string) => void }) {
  const Icon = meta.icon;
  return (
    <div className={cn("rounded-card border p-5 space-y-4", meta.border, meta.bg)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("h-6 w-6 mt-0.5", meta.color)} />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn("text-caption font-semibold", meta.color, meta.border)}>{meta.label}</Badge>
            <span className="text-caption text-text-3 font-mono">#{s.id}</span>
          </div>
          <h2 className="text-section-header font-display font-bold text-text-1">{s.title}</h2>
        </div>
      </div>

      <Section title="🎬 Trigger" content={s.trigger} />

      <div>
        <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-1.5">📍 Đối tượng ảnh hưởng</div>
        <div className="flex flex-wrap gap-1.5">
          {s.affected.map(a => (
            <Badge key={a} variant="outline" className="font-mono text-caption">{a}</Badge>
          ))}
        </div>
      </div>

      <div>
        <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-1.5">🖥️ UI sẽ hiện</div>
        <ul className="space-y-1">
          {s.expectedUi.map((u, i) => (
            <li key={i} className="text-table-sm text-text-2 flex items-start gap-2">
              <span className="text-primary mt-0.5">▸</span>
              <span>{u}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-1.5">🚨 Bước xử lý (SOP)</div>
        <ol className="space-y-1.5">
          {s.escalation.map((e, i) => (
            <li key={i} className="text-table-sm text-text-2 flex items-start gap-2">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/15 text-primary text-caption font-bold shrink-0">{i + 1}</span>
              <span className="pt-0.5">{e}</span>
            </li>
          ))}
        </ol>
      </div>

      {s.testNote && (
        <div className="rounded border border-info/30 bg-info-bg p-3 flex items-start gap-2">
          <MapPin className="h-4 w-4 text-info mt-0.5 shrink-0" />
          <div className="text-table-sm text-text-2">
            <span className="font-semibold text-info">Test ngay: </span>
            {s.testNote}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-surface-3">
        <button onClick={() => navigate("/drp")} className="text-caption text-primary hover:underline">→ Mở DRP</button>
        <button onClick={() => navigate("/sop")} className="text-caption text-primary hover:underline">→ Mở S&OP</button>
        <button onClick={() => navigate("/hub")} className="text-caption text-primary hover:underline">→ Mở Hub</button>
        <button onClick={() => navigate("/orders")} className="text-caption text-primary hover:underline">→ Mở Đơn hàng</button>
        <button onClick={() => navigate("/inventory")} className="text-caption text-primary hover:underline">→ Mở Tồn kho</button>
      </div>
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-1">{title}</div>
      <p className="text-table-sm text-text-1 leading-relaxed">{content}</p>
    </div>
  );
}
