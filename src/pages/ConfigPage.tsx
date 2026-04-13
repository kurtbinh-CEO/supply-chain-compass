import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader } from "@/components/ScreenShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

/* ── Config data types ── */
interface ConfigKey {
  key: string;
  value: string;
  desc: string;
  type: "text" | "number" | "toggle" | "select";
  options?: string[];
}

interface NotifType {
  type: string;
  channel: string;
  urgency: string;
  recipients: string;
}

interface FeatureToggle {
  feature: string;
  unis: boolean;
  ttc: boolean;
  mdlz: boolean;
}

interface RbacRow {
  screen: string;
  cn_manager: string;
  sc_manager: string;
  sales: string;
  buyer: string;
  viewer: string;
}

const planningKeys: ConfigKey[] = [
  { key: "sop.lock_day", value: "7", desc: "Ngày lock consensus trong tháng", type: "number" },
  { key: "sop.compare_versions", value: "4", desc: "Số versions so sánh (v0-v3)", type: "number" },
  { key: "booking.moq_round_policy", value: "ceil", desc: "Cách round MOQ", type: "select", options: ["ceil", "nearest", "manual"] },
  { key: "booking.poq_weeks", value: "2", desc: "Gộp mấy tuần cho POQ", type: "number" },
  { key: "booking.container_optimization", value: "true", desc: "Tối ưu container capacity", type: "toggle" },
  { key: "cn_adjust.cutoff_time", value: "18:00", desc: "Deadline CN nhập điều chỉnh", type: "text" },
  { key: "cn_adjust.tolerance_default", value: "30", desc: "Tolerance mặc định per CN (%)", type: "number" },
  { key: "cn_adjust.auto_approve_threshold", value: "10", desc: "Dưới % → auto-approve", type: "number" },
];

const drpKeys: ConfigKey[] = [
  { key: "drp.run_time", value: "23:00", desc: "Thời gian DRP chạy nightly", type: "text" },
  { key: "drp.horizon_weeks", value: "6", desc: "Horizon netting", type: "number" },
  { key: "nm_atp.stale_threshold_hours", value: "24", desc: "NM data > X giờ = stale", type: "number" },
  { key: "nm_atp.confidence_weight_api", value: "0.95", desc: "Confidence cho data API", type: "number" },
  { key: "nm_atp.confidence_weight_manual", value: "0.60", desc: "Confidence cho data manual", type: "number" },
  { key: "gap.shortage_handling", value: "request_supply", desc: "Khi shortage: lost_sales / request / partial", type: "select", options: ["lost_sales", "request_supply", "partial_fill"] },
];

const lateralKeys: ConfigKey[] = [
  { key: "lcnb.enabled", value: "true", desc: "Bật/tắt LCNB", type: "toggle" },
  { key: "lcnb.priority_rule", value: "HYBRID", desc: "nearest / most-excess / hybrid", type: "select", options: ["nearest", "most-excess", "HYBRID"] },
  { key: "lcnb.min_excess", value: "50", desc: "Minimum excess để trigger lateral (m²)", type: "number" },
  { key: "lcnb.max_transfer_pct", value: "80", desc: "Max % excess được chuyển", type: "number" },
  { key: "lcnb.require_approval", value: "true", desc: "Cần duyệt trước khi chuyển", type: "toggle" },
  { key: "lcnb.cost_threshold", value: "70", desc: "Chỉ lateral nếu cost < X% vs PO mới", type: "number" },
];

const feedforwardKeys: ConfigKey[] = [
  { key: "feedback.honoring_discount_enabled", value: "true", desc: "Auto-discount ATP khi NM honoring thấp", type: "toggle" },
  { key: "feedback.honoring_threshold", value: "80", desc: "Dưới → auto-discount (%)", type: "number" },
  { key: "feedback.trust_score_auto_adjust", value: "true", desc: "CN trust tự giảm khi gap > 15%", type: "toggle" },
  { key: "feedback.ss_auto_increase_on_stockout", value: "true", desc: "SS +15% khi stockout > 2x/month", type: "toggle" },
  { key: "pod.overdue_hours", value: "24", desc: "Quá X giờ → POD_OVERDUE alert", type: "number" },
  { key: "pod.auto_remind", value: "true", desc: "Tự nhắc CN upload POD", type: "toggle" },
];

const notifTypes: NotifType[] = [
  { type: "SHORTAGE", channel: "Push + Email", urgency: "High", recipients: "Planner, SC Manager" },
  { type: "PO_OVERDUE", channel: "Push + Email", urgency: "Medium", recipients: "Buyer, Planner" },
  { type: "FC_DRIFT", channel: "Push", urgency: "Low", recipients: "Planner" },
  { type: "POD_OVERDUE", channel: "Push", urgency: "Medium", recipients: "CN Manager" },
  { type: "APPROVAL_NEEDED", channel: "Push + Email", urgency: "High", recipients: "Approver (per type)" },
  { type: "SS_BREACH", channel: "Push", urgency: "Medium", recipients: "Planner" },
  { type: "NM_STALE", channel: "Push", urgency: "Low", recipients: "Planner" },
  { type: "LCNB_TRIGGER", channel: "Push", urgency: "Medium", recipients: "SC Manager" },
  { type: "FC_LOCK", channel: "Email", urgency: "Low", recipients: "All stakeholders" },
];

const rbacMatrix: RbacRow[] = [
  { screen: "/cn-portal Tab 1 Điều chỉnh", cn_manager: "✅ Sửa CN mình", sc_manager: "✅ Sửa all + duyệt", sales: "👁 Read-only", buyer: "❌", viewer: "❌" },
  { screen: "/cn-portal Tab 2 Tồn kho", cn_manager: "👁 CN mình", sc_manager: "👁 All CN", sales: "❌", buyer: "👁 All", viewer: "❌" },
  { screen: "/cn-portal Tab 3 Trao đổi", cn_manager: "✅ CN mình", sc_manager: "✅ All", sales: "✅ Threads mình", buyer: "👁", viewer: "❌" },
  { screen: "/demand", cn_manager: "❌", sc_manager: "✅ Full", sales: "✅ B2B tab only", buyer: "❌", viewer: "👁" },
  { screen: "/sop", cn_manager: "❌", sc_manager: "✅ Full", sales: "👁 Tab 1 only", buyer: "❌", viewer: "👁" },
  { screen: "/hub", cn_manager: "❌", sc_manager: "✅ Full", sales: "❌", buyer: "✅ Full", viewer: "👁" },
  { screen: "/supply", cn_manager: "❌", sc_manager: "✅ Full", sales: "❌", buyer: "✅ Full", viewer: "❌" },
  { screen: "/orders", cn_manager: "❌", sc_manager: "✅ Full", sales: "❌", buyer: "✅ Full", viewer: "👁" },
  { screen: "/drp", cn_manager: "❌", sc_manager: "✅ Full", sales: "❌", buyer: "❌", viewer: "👁" },
  { screen: "/monitoring", cn_manager: "👁 CN mình", sc_manager: "✅ Full", sales: "❌", buyer: "❌", viewer: "👁" },
  { screen: "/supplier-portal", cn_manager: "❌", sc_manager: "✅ Full", sales: "❌", buyer: "❌", viewer: "❌" },
  { screen: "/config", cn_manager: "❌", sc_manager: "✅ Full", sales: "❌", buyer: "❌", viewer: "❌" },
];

const featureToggles: FeatureToggle[] = [
  { feature: "LCNB Lateral", unis: true, ttc: false, mdlz: false },
  { feature: "B2B Pipeline", unis: true, ttc: false, mdlz: true },
  { feature: "FC Commitment Tiers", unis: true, ttc: true, mdlz: false },
  { feature: "Container Optimization", unis: true, ttc: false, mdlz: false },
  { feature: "CN Mobile Adjust", unis: true, ttc: true, mdlz: true },
];

/* ── Inline editable value cell ── */
function EditableValue({ config, onChange }: { config: ConfigKey; onChange: (v: string) => void }) {
  if (config.type === "toggle") {
    const on = config.value === "true";
    return (
      <button
        onClick={() => onChange(on ? "false" : "true")}
        className={`w-10 h-5 rounded-full transition-colors relative ${on ? "bg-primary" : "bg-surface-3"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface-2 shadow transition-transform ${on ? "left-5" : "left-0.5"}`} />
      </button>
    );
  }
  if (config.type === "select" && config.options) {
    return (
      <select
        value={config.value}
        onChange={e => onChange(e.target.value)}
        className="h-8 rounded-button border border-surface-3 bg-surface-0 px-2 text-table text-text-1"
      >
        {config.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return (
    <input
      type={config.type === "number" ? "number" : "text"}
      value={config.value}
      onChange={e => onChange(e.target.value)}
      className="w-24 h-8 rounded-button border border-surface-3 bg-surface-0 px-2 text-table text-text-1 tabular-nums"
    />
  );
}

/* ── Config table for key-value tabs ── */
function ConfigTable({ keys, setKeys }: { keys: ConfigKey[]; setKeys: (k: ConfigKey[]) => void }) {
  const update = (idx: number, val: string) => {
    const next = [...keys];
    next[idx] = { ...next[idx], value: val };
    setKeys(next);
    toast.success(`${next[idx].key} = ${val}`);
  };

  return (
    <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
      <table className="w-full text-table">
        <thead>
          <tr className="bg-surface-1">
            <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 w-[280px]">Key</th>
            <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 w-[140px]">Giá trị</th>
            <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3">Mô tả</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k, i) => (
            <tr key={k.key} className={i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"}>
              <td className="px-4 py-2.5 font-mono text-table-sm text-text-1">{k.key}</td>
              <td className="px-4 py-2.5"><EditableValue config={k} onChange={v => update(i, v)} /></td>
              <td className="px-4 py-2.5 text-text-2">{k.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ConfigPage() {
  const [planning, setPlanning] = useState(planningKeys);
  const [drp, setDrp] = useState(drpKeys);
  const [lateral, setLateral] = useState(lateralKeys);
  const [feedforward, setFeedforward] = useState(feedforwardKeys);
  const [toggles, setToggles] = useState(featureToggles);

  const toggleFeature = (idx: number, tenant: "unis" | "ttc" | "mdlz") => {
    const next = [...toggles];
    next[idx] = { ...next[idx], [tenant]: !next[idx][tenant] };
    setToggles(next);
    toast.success(`${next[idx].feature} ${tenant.toUpperCase()}: ${next[idx][tenant] ? "ON" : "OFF"}`);
  };

  return (
    <AppLayout>
      <ScreenHeader title="Config" subtitle="Cấu hình hệ thống và tham số" />
      <Tabs defaultValue="planning">
        <TabsList className="bg-surface-1 border border-surface-3 mb-4 flex-wrap">
          {[
            { v: "planning", l: "Planning" },
            { v: "drp", l: "DRP & Allocation" },
            { v: "lateral", l: "Lateral & LCNB" },
            { v: "feedforward", l: "Feed-forward" },
            { v: "notifications", l: "Notifications" },
            { v: "toggles", l: "Feature Toggles" },
          ].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-surface-2 data-[state=active]:text-text-1 text-text-2 text-table">
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="planning"><ConfigTable keys={planning} setKeys={setPlanning} /></TabsContent>
        <TabsContent value="drp"><ConfigTable keys={drp} setKeys={setDrp} /></TabsContent>
        <TabsContent value="lateral"><ConfigTable keys={lateral} setKeys={setLateral} /></TabsContent>
        <TabsContent value="feedforward"><ConfigTable keys={feedforward} setKeys={setFeedforward} /></TabsContent>

        <TabsContent value="notifications">
          <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
            <table className="w-full text-table">
              <thead>
                <tr className="bg-surface-1">
                  <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3">Type</th>
                  <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3">Channel</th>
                  <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3">Urgency</th>
                  <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3">Recipients</th>
                </tr>
              </thead>
              <tbody>
                {notifTypes.map((n, i) => (
                  <tr key={n.type} className={i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"}>
                    <td className="px-4 py-2.5 font-medium text-text-1">{n.type}</td>
                    <td className="px-4 py-2.5 text-text-2">{n.channel}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-caption font-medium px-1.5 py-0.5 rounded-sm ${
                        n.urgency === "High" ? "bg-danger-bg text-danger" : n.urgency === "Medium" ? "bg-warning-bg text-warning" : "bg-info-bg text-info"
                      }`}>{n.urgency}</span>
                    </td>
                    <td className="px-4 py-2.5 text-text-2">{n.recipients}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="toggles">
          <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
            <table className="w-full text-table">
              <thead>
                <tr className="bg-surface-1">
                  <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3">Feature</th>
                  <th className="text-center px-4 py-2.5 text-table-header uppercase text-text-3">UNIS</th>
                  <th className="text-center px-4 py-2.5 text-table-header uppercase text-text-3">TTC</th>
                  <th className="text-center px-4 py-2.5 text-table-header uppercase text-text-3">MDLZ</th>
                </tr>
              </thead>
              <tbody>
                {toggles.map((t, i) => (
                  <tr key={t.feature} className={i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"}>
                    <td className="px-4 py-2.5 font-medium text-text-1">{t.feature}</td>
                    {(["unis", "ttc", "mdlz"] as const).map(tenant => (
                      <td key={tenant} className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => toggleFeature(i, tenant)}
                          className={`w-10 h-5 rounded-full transition-colors relative inline-block ${t[tenant] ? "bg-primary" : "bg-surface-3"}`}
                        >
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface-2 shadow transition-transform ${t[tenant] ? "left-5" : "left-0.5"}`} />
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
