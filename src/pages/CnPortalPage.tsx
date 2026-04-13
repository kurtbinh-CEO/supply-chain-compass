import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useRbac, AppUser } from "@/components/RbacContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronDown, Clock, Check, X as XIcon, AlertTriangle, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LogicLink } from "@/components/LogicLink";

/* ═══ DATA ═══ */
const allCns = ["CN-BD", "CN-ĐN", "CN-HN", "CN-CT"];

interface SkuRow {
  item: string; variant: string; forecast: number;
  adjust: number | null; // null = chưa adjust
  reason: string;
  status: "approved" | "pending" | "blocked" | "no_change" | "not_adjusted";
}

interface CnInventory {
  item: string; variant: string; ton: number; dangVe: string; available: number;
  ssTarget: number; ssGap: number; hstk: number; status: string;
}

const baseDemandData: Record<string, SkuRow[]> = {
  "CN-BD": [
    { item: "GA-300", variant: "A4", forecast: 524, adjust: 568, reason: "Nhà thầu mới Q2, tăng 10%", status: "approved" },
    { item: "GA-300", variant: "B2", forecast: 151, adjust: 151, reason: "", status: "no_change" },
    { item: "GA-400", variant: "A4", forecast: 294, adjust: 264, reason: "Dự án delay sang Th6", status: "pending" },
    { item: "GA-600", variant: "A4", forecast: 748, adjust: 828, reason: "Vingroup tăng 2 block", status: "approved" },
    { item: "GA-600", variant: "B2", forecast: 425, adjust: null, reason: "", status: "not_adjusted" },
  ],
  "CN-ĐN": [
    { item: "GA-300", variant: "A4", forecast: 412, adjust: null, reason: "", status: "not_adjusted" },
    { item: "GA-300", variant: "B2", forecast: 188, adjust: null, reason: "", status: "not_adjusted" },
    { item: "GA-400", variant: "A4", forecast: 350, adjust: null, reason: "", status: "not_adjusted" },
    { item: "GA-600", variant: "A4", forecast: 620, adjust: null, reason: "", status: "not_adjusted" },
    { item: "GA-600", variant: "B2", forecast: 310, adjust: null, reason: "", status: "not_adjusted" },
  ],
  "CN-HN": [
    { item: "GA-300", variant: "A4", forecast: 380, adjust: 400, reason: "Dự báo tăng nhẹ", status: "approved" },
    { item: "GA-400", variant: "A4", forecast: 250, adjust: 250, reason: "", status: "no_change" },
    { item: "GA-600", variant: "A4", forecast: 500, adjust: 520, reason: "Nhu cầu tăng", status: "approved" },
    { item: "GA-600", variant: "B2", forecast: 280, adjust: null, reason: "", status: "not_adjusted" },
    { item: "GA-300", variant: "C1", forecast: 150, adjust: null, reason: "", status: "not_adjusted" },
  ],
  "CN-CT": [
    { item: "GA-300", variant: "A4", forecast: 290, adjust: 290, reason: "", status: "no_change" },
    { item: "GA-400", variant: "A4", forecast: 180, adjust: 200, reason: "Dự án mới", status: "approved" },
    { item: "GA-600", variant: "A4", forecast: 400, adjust: 400, reason: "", status: "no_change" },
    { item: "GA-600", variant: "B2", forecast: 220, adjust: 220, reason: "", status: "no_change" },
    { item: "GA-300", variant: "B2", forecast: 120, adjust: null, reason: "", status: "not_adjusted" },
  ],
};

const baseInvData: Record<string, CnInventory[]> = {
  "CN-BD": [
    { item: "GA-300", variant: "A4", ton: 120, dangVe: "557 (17/05)", available: 200, ssTarget: 900, ssGap: -700, hstk: 1.2, status: "Dưới SS ⚠" },
    { item: "GA-300", variant: "B2", ton: 380, dangVe: "—", available: 300, ssTarget: 700, ssGap: -400, hstk: 3.5, status: "Thấp" },
    { item: "GA-400", variant: "A4", ton: 800, dangVe: "—", available: 600, ssTarget: 600, ssGap: 0, hstk: 7, status: "OK" },
    { item: "GA-600", variant: "A4", ton: 2100, dangVe: "—", available: 1800, ssTarget: 1000, ssGap: 800, hstk: 12, status: "Thừa" },
    { item: "GA-600", variant: "B2", ton: 650, dangVe: "—", available: 520, ssTarget: 500, ssGap: 20, hstk: 7.5, status: "OK" },
  ],
  "CN-ĐN": [
    { item: "GA-300", variant: "A4", ton: 890, dangVe: "200 (19/05)", available: 750, ssTarget: 500, ssGap: 250, hstk: 11, status: "OK" },
    { item: "GA-300", variant: "B2", ton: 450, dangVe: "—", available: 400, ssTarget: 300, ssGap: 100, hstk: 14, status: "Thừa" },
    { item: "GA-400", variant: "A4", ton: 600, dangVe: "—", available: 520, ssTarget: 400, ssGap: 120, hstk: 10, status: "OK" },
    { item: "GA-600", variant: "A4", ton: 1500, dangVe: "—", available: 1300, ssTarget: 800, ssGap: 500, hstk: 15, status: "Thừa" },
    { item: "GA-600", variant: "B2", ton: 380, dangVe: "—", available: 320, ssTarget: 250, ssGap: 70, hstk: 9, status: "OK" },
  ],
  "CN-HN": [
    { item: "GA-300", variant: "A4", ton: 500, dangVe: "300 (20/05)", available: 400, ssTarget: 450, ssGap: -50, hstk: 6, status: "Thấp" },
    { item: "GA-400", variant: "A4", ton: 350, dangVe: "—", available: 300, ssTarget: 300, ssGap: 0, hstk: 8, status: "OK" },
    { item: "GA-600", variant: "A4", ton: 700, dangVe: "—", available: 600, ssTarget: 500, ssGap: 100, hstk: 9, status: "OK" },
    { item: "GA-600", variant: "B2", ton: 280, dangVe: "—", available: 240, ssTarget: 200, ssGap: 40, hstk: 7, status: "OK" },
    { item: "GA-300", variant: "C1", ton: 200, dangVe: "—", available: 180, ssTarget: 100, ssGap: 80, hstk: 12, status: "Thừa" },
  ],
  "CN-CT": [
    { item: "GA-300", variant: "A4", ton: 400, dangVe: "150 (18/05)", available: 350, ssTarget: 350, ssGap: 0, hstk: 8, status: "OK" },
    { item: "GA-400", variant: "A4", ton: 250, dangVe: "—", available: 220, ssTarget: 200, ssGap: 20, hstk: 9, status: "OK" },
    { item: "GA-600", variant: "A4", ton: 550, dangVe: "—", available: 480, ssTarget: 400, ssGap: 80, hstk: 10, status: "OK" },
    { item: "GA-600", variant: "B2", ton: 300, dangVe: "—", available: 260, ssTarget: 200, ssGap: 60, hstk: 9, status: "OK" },
    { item: "GA-300", variant: "B2", ton: 180, dangVe: "—", available: 150, ssTarget: 150, ssGap: 0, hstk: 7, status: "OK" },
  ],
};

/* Messages */
interface Message { id: string; from: string; role: string; time: string; text: string; sku?: string }

const baseMessages: Record<string, Message[]> = {
  "CN-BD": [
    { id: "m1", from: "Minh Trần", role: "CN_MANAGER", time: "09:15", text: "GA-300 A4 tăng 44 do nhà thầu mới xác nhận Q2. Có PO minh chứng.", sku: "GA-300 A4" },
    { id: "m2", from: "Thúy Nguyễn", role: "SC_MANAGER", time: "09:42", text: "Đã duyệt GA-300 A4. GA-400 A4 giảm 30 — cần xác nhận lại với Sales.", sku: "GA-400 A4" },
    { id: "m3", from: "Phong Vũ", role: "SALES", time: "10:05", text: "GA-400 A4: xác nhận dự án Sunrise delay sang tháng 6. Demand giảm hợp lý." },
  ],
  "CN-ĐN": [
    { id: "m4", from: "Hà Lê", role: "CN_MANAGER", time: "08:30", text: "Chưa adjust — chờ data từ Sales team ĐN." },
  ],
  "CN-HN": [],
  "CN-CT": [],
};

function hstkColor(d: number) { return d < 5 ? "text-danger" : d < 10 ? "text-warning" : "text-success"; }

function statusBadge(s: string) {
  switch (s) {
    case "approved": return { label: "Approved ✅", cls: "bg-success-bg text-success" };
    case "pending": return { label: "Pending 🟡", cls: "bg-warning-bg text-warning" };
    case "blocked": return { label: "Blocked 🔴", cls: "bg-danger-bg text-danger" };
    case "no_change": return { label: "No change", cls: "bg-surface-1 text-text-3" };
    case "not_adjusted": return { label: "Chưa adjust ⏳", cls: "bg-surface-1 text-text-3" };
    default: return { label: s, cls: "" };
  }
}

function getAutoStatus(forecast: number, adjust: number | null): string {
  if (adjust === null) return "not_adjusted";
  if (adjust === forecast) return "no_change";
  const pct = Math.abs((adjust - forecast) / forecast) * 100;
  if (pct > 30) return "blocked";
  if (pct >= 10) return "pending";
  return "approved";
}

const rejectReasons = ["Không có PO", "Lệch AOP", "Cần thêm data"];

/* ═══ CUTOFF ═══ */
function getCutoffInfo() {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setHours(18, 0, 0, 0);
  const diff = cutoff.getTime() - now.getTime();
  const pastCutoff = diff <= 0;
  const hours = Math.max(0, Math.floor(diff / 3600000));
  const mins = Math.max(0, Math.floor((diff % 3600000) / 60000));
  return { pastCutoff, hours, mins, label: pastCutoff ? "Đã qua cutoff ⏰" : `⏱ Cutoff 18:00 còn ${hours}h${mins > 0 ? `${mins}m` : ""}` };
}

/* ═══ ROLE BADGE ═══ */
function RoleBadge({ role }: { role: string }) {
  const m: Record<string, { label: string; cls: string }> = {
    SC_MANAGER: { label: "SC Manager", cls: "bg-primary/10 text-primary" },
    CN_MANAGER: { label: "CN Manager", cls: "bg-info-bg text-info" },
    SALES: { label: "Sales", cls: "bg-success-bg text-success" },
    VIEWER: { label: "Viewer", cls: "bg-surface-1 text-text-3" },
  };
  const badge = m[role] || { label: role, cls: "" };
  return <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium", badge.cls)}>{badge.label}</span>;
}

/* ═══ MAIN COMPONENT ═══ */
export default function CnPortalPage() {
  const { user, setUser, users, canEdit, canApprove, canViewAllCn, filterCnId } = useRbac();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("adjust");
  const [selectedCn, setSelectedCn] = useState(filterCnId || "CN-BD");
  const [demandData, setDemandData] = useState<Record<string, SkuRow[]>>(() => JSON.parse(JSON.stringify(baseDemandData)));
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => JSON.parse(JSON.stringify(baseMessages)));
  const [newMsg, setNewMsg] = useState("");
  const [focusRow, setFocusRow] = useState<string | null>(null);
  const focusRef = useRef<HTMLInputElement>(null);
  const cutoff = getCutoffInfo();
  const activeCn = filterCnId || selectedCn;
  const rows = demandData[activeCn] || [];
  const inv = baseInvData[activeCn] || [];

  // Focus input when navigating from tab 2
  useEffect(() => {
    if (focusRow && focusRef.current) {
      focusRef.current.focus();
      setFocusRow(null);
    }
  }, [focusRow, activeTab]);

  const updateRow = (idx: number, field: "adjust" | "reason", value: string | number | null) => {
    setDemandData((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const row = copy[activeCn][idx];
      if (field === "adjust") {
        const num = value === "" || value === null ? null : Number(value);
        row.adjust = num;
        row.status = getAutoStatus(row.forecast, num);
      } else {
        row.reason = String(value);
      }
      return copy;
    });
  };

  const handleSubmit = () => {
    const edited = rows.filter((r) => r.adjust !== null && r.adjust !== r.forecast);
    const needReason = edited.filter((r) => {
      const pct = Math.abs((r.adjust! - r.forecast) / r.forecast) * 100;
      return pct > 5 && !r.reason.trim();
    });
    if (needReason.length > 0) {
      toast.error("Thiếu lý do", { description: `${needReason.map((r) => `${r.item} ${r.variant}`).join(", ")} cần lý do (delta >5%).` });
      return;
    }
    const blocked = edited.filter((r) => r.status === "blocked");
    if (blocked.length > 0) {
      toast.error("Không thể gửi", { description: `${blocked.map((r) => `${r.item} ${r.variant}`).join(", ")} bị blocked (delta >30%).` });
      return;
    }
    const approved = edited.filter((r) => r.status === "approved").length;
    const pending = edited.filter((r) => r.status === "pending").length;
    toast.success("Đã gửi điều chỉnh", {
      description: `${edited.length} SKU. ${approved} auto-approved, ${pending} chờ duyệt.`,
    });
  };

  const handleApprove = (idx: number) => {
    setDemandData((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[activeCn][idx].status = "approved";
      return copy;
    });
    toast.success("Đã duyệt", { description: `${rows[idx].item} ${rows[idx].variant}` });
  };

  const handleReject = (idx: number, reason: string) => {
    setDemandData((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[activeCn][idx].status = "blocked";
      return copy;
    });
    toast.info("Đã từ chối", { description: `${rows[idx].item} ${rows[idx].variant}: ${reason}` });
  };

  const sendMessage = () => {
    if (!newMsg.trim()) return;
    const msg: Message = {
      id: `m${Date.now()}`, from: user.name, role: user.role,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      text: newMsg.trim(),
    };
    setMessages((prev) => ({ ...prev, [activeCn]: [...(prev[activeCn] || []), msg] }));
    setNewMsg("");
  };

  // Stats
  const adjusted = rows.filter((r) => r.status === "approved" || r.status === "no_change").length;
  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const notAdjusted = rows.filter((r) => r.status === "not_adjusted").length;
  const totalFc = rows.reduce((a, r) => a + r.forecast, 0);
  const totalAdj = rows.reduce((a, r) => a + (r.adjust ?? r.forecast), 0);
  const totalDelta = totalAdj - totalFc;
  const totalPct = totalFc > 0 ? (totalDelta / totalFc * 100).toFixed(1) : "0";
  const doneCount = rows.filter((r) => r.status !== "not_adjusted").length;

  const tabs = [
    { key: "adjust", label: "Điều chỉnh demand" },
    { key: "inv", label: "Tồn kho CN" },
    { key: "chat", label: "Trao đổi" },
  ];

  const cnLabel: Record<string, string> = {
    "CN-BD": "CN Bình Dương", "CN-ĐN": "CN Đà Nẵng", "CN-HN": "CN Hà Nội", "CN-CT": "CN Cần Thơ",
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-display text-screen-title text-text-1">
              {cnLabel[activeCn] || activeCn}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-table-sm text-text-2">{user.name}</span>
              <RoleBadge role={user.role} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Cutoff */}
          <span className={cn("rounded-full px-3 py-1 text-table-sm font-medium flex items-center gap-1.5",
            cutoff.pastCutoff ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning"
          )}>
            <Clock className="h-3.5 w-3.5" />
            {cutoff.label}
          </span>
          {/* CN filter for SC_MANAGER */}
          {canViewAllCn && (
            <Select value={selectedCn} onValueChange={setSelectedCn}>
              <SelectTrigger className="w-36 h-8 text-table-sm bg-surface-0 border-surface-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allCns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {/* Role switcher (demo) */}
          <Select value={user.id} onValueChange={(id) => {
            const u = users.find((u) => u.id === id);
            if (u) setUser(u);
          }}>
            <SelectTrigger className="w-44 h-8 text-table-sm bg-surface-0 border-surface-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Period */}
      <div className="text-caption text-text-3 mb-4">Tháng 5 / 2025 — W17 (12-18/05)</div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-surface-3 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-5 py-3 text-body font-medium transition-colors relative whitespace-nowrap",
              activeTab === tab.key ? "text-primary" : "text-text-2 hover:text-text-1"
            )}
          >
            {tab.label}
            {tab.key === "chat" && (messages[activeCn]?.length || 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5">
                {messages[activeCn].length}
              </span>
            )}
            {activeTab === tab.key && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t" />}
          </button>
        ))}
      </div>

      {/* ═══ TAB 1: Điều chỉnh demand ═══ */}
      {activeTab === "adjust" && (
        <div className="space-y-4 animate-fade-in">
          {/* Status strip */}
          <div className="rounded-lg border border-surface-3 bg-surface-1/50 px-4 py-2.5 text-table-sm text-text-2 flex items-center gap-4 flex-wrap">
            <span>{rows.length} SKU:</span>
            {adjusted > 0 && <span className="text-success font-medium">{adjusted} đã adjust ✅</span>}
            {pendingCount > 0 && <span className="text-warning font-medium">{pendingCount} pending duyệt 🟡</span>}
            {notAdjusted > 0 && <span className="text-text-3">{notAdjusted} chưa adjust ⏳</span>}
          </div>

          {/* SC_MANAGER: CN summary strip */}
          {canApprove && (
            <div className="flex items-center gap-3 flex-wrap text-table-sm">
              {allCns.map((c) => {
                const cRows = demandData[c] || [];
                const done = cRows.filter((r) => r.status !== "not_adjusted").length;
                const total = cRows.length;
                const allDone = done === total;
                return (
                  <button key={c} onClick={() => setSelectedCn(c)}
                    className={cn("rounded-lg border px-3 py-1.5 transition-colors",
                      c === activeCn ? "border-primary bg-primary/5 text-primary font-medium" : "border-surface-3 text-text-2 hover:bg-surface-1"
                    )}>
                    {c}: {done}/{total} {allDone ? "✅" : done === 0 ? "⏳" : "🟡"}
                    {done === 0 && (
                      <span className="ml-1 text-primary underline text-[10px]"
                        onClick={(e) => { e.stopPropagation(); toast.info(`Nhắc nhở đã gửi ${c}`); }}>
                        Nhắc
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Table */}
          <div className="rounded-card border border-surface-3 bg-surface-2">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-3 bg-surface-1/50">
                    {["Item", "Variant", "Dự kiến (HQ)", "CN điều chỉnh", "Delta", "Lý do", "Status",
                      ...(canApprove ? ["Action"] : [])
                    ].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const adj = row.adjust ?? row.forecast;
                    const delta = adj - row.forecast;
                    const pct = row.forecast > 0 ? (delta / row.forecast * 100) : 0;
                    const badge = statusBadge(row.status);
                    const needReason = Math.abs(pct) > 5 && !row.reason.trim();
                    const isEditable = canEdit && !cutoff.pastCutoff && (user.role !== "SALES");
                    const isFocused = focusRow === `${row.item}-${row.variant}`;

                    return (
                      <tr key={`${row.item}-${row.variant}`} className={cn(
                        "border-b border-surface-3/50 hover:bg-surface-1/30 transition-colors",
                        row.status === "blocked" && "bg-danger-bg/10",
                      )}>
                        <td className="px-3 py-2.5 text-table font-medium text-text-1">{row.item}</td>
                        <td className="px-3 py-2.5 text-table text-text-2">{row.variant}</td>
                        <td className="px-3 py-2.5 text-table tabular-nums text-text-3">{row.forecast.toLocaleString()}</td>
                        <td className="px-3 py-2.5">
                          {isEditable ? (
                            <input
                              ref={isFocused ? focusRef : undefined}
                              type="number"
                              value={row.adjust ?? ""}
                              onChange={(e) => updateRow(idx, "adjust", e.target.value)}
                              placeholder={String(row.forecast)}
                              className="w-20 h-7 rounded border border-surface-3 bg-surface-0 px-2 text-table tabular-nums text-text-1 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          ) : (
                            <span className="text-table tabular-nums text-text-1">{row.adjust ?? "—"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-table tabular-nums">
                          {row.adjust !== null && delta !== 0 ? (
                            <span className={cn("font-medium", delta > 0 ? "text-success" : "text-danger")}>
                              {delta > 0 ? "+" : ""}{delta} ({pct > 0 ? "+" : ""}{pct.toFixed(1)}%)
                            </span>
                          ) : (
                            <span className="text-text-3">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {isEditable ? (
                            <input
                              type="text"
                              value={row.reason}
                              onChange={(e) => updateRow(idx, "reason", e.target.value.slice(0, 100))}
                              placeholder={Math.abs(pct) > 5 ? "Bắt buộc..." : "—"}
                              maxLength={100}
                              className={cn("w-40 h-7 rounded border bg-surface-0 px-2 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary",
                                needReason ? "border-danger" : "border-surface-3"
                              )}
                            />
                          ) : (
                            <span className="text-table text-text-2 truncate max-w-[160px] block">{row.reason || "—"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium whitespace-nowrap", badge.cls)}>
                            {badge.label}
                          </span>
                        </td>
                        {canApprove && (
                          <td className="px-3 py-2.5">
                            {row.status === "pending" && (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleApprove(idx)}
                                  className="rounded-md bg-success-bg text-success p-1 hover:bg-success/20">
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <Select onValueChange={(reason) => handleReject(idx, reason)}>
                                  <SelectTrigger className="w-7 h-7 p-0 border-0 bg-danger-bg text-danger hover:bg-danger/20">
                                    <XIcon className="h-3.5 w-3.5 mx-auto" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {rejectReasons.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {/* TOTAL row */}
                  <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
                    <td className="px-3 py-2.5 text-table text-text-1">TOTAL</td>
                    <td className="px-3 py-2.5" />
                    <td className="px-3 py-2.5 text-table tabular-nums text-text-1">{totalFc.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-table tabular-nums text-text-1">{totalAdj.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-table tabular-nums">
                      <span className={cn("font-medium", totalDelta > 0 ? "text-success" : totalDelta < 0 ? "text-danger" : "text-text-3")}>
                        {totalDelta > 0 ? "+" : ""}{totalDelta} ({totalPct}%)
                      </span>
                    </td>
                    <td className="px-3 py-2.5" />
                    <td className="px-3 py-2.5 text-table-sm text-text-2">{doneCount}/{rows.length} done</td>
                    {canApprove && <td />}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Submit */}
          {canEdit && user.role !== "SALES" && (
            <div className="flex justify-end">
              <Button
                disabled={cutoff.pastCutoff}
                onClick={handleSubmit}
                className="bg-gradient-primary text-primary-foreground px-6"
              >
                {cutoff.pastCutoff ? "Đã qua cutoff ⏰" : "Gửi điều chỉnh"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 2: Tồn kho CN ═══ */}
      {activeTab === "inv" && (
        <div className="space-y-4 animate-fade-in">
          {/* Alert for critical items */}
          {inv.filter((r) => r.hstk < 5).length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning-bg/50 px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div className="text-table-sm text-text-1 space-y-0.5">
                {inv.filter((r) => r.hstk < 5).map((r) => (
                  <p key={`${r.item}-${r.variant}`}>
                    <strong>{r.item} {r.variant}</strong>: HSTK {r.hstk} ngày! Cân nhắc{" "}
                    <button
                      onClick={() => {
                        setActiveTab("adjust");
                        setFocusRow(`${r.item}-${r.variant}`);
                      }}
                      className="text-primary underline font-medium"
                    >
                      tăng demand tuần này
                    </button>
                    {" "}để DRP đặt thêm NM.
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-card border border-surface-3 bg-surface-2">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-3 bg-surface-1/50">
                    {["Item", "Variant", "Tồn kho", "Đang về (ETA)", "Available", "SS target", "SS gap", "HSTK", "Status"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inv.map((r, i) => (
                    <tr key={i} className={cn("border-b border-surface-3/50 hover:bg-surface-1/30", r.hstk < 5 && "bg-danger-bg/10")}>
                      <td className="px-3 py-2.5 text-table font-medium text-text-1">{r.item}</td>
                      <td className="px-3 py-2.5 text-table text-text-2">{r.variant}</td>
                      <td className="px-3 py-2.5 text-table tabular-nums text-text-1">{r.ton.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-table text-text-2">{r.dangVe}</td>
                      <td className="px-3 py-2.5 text-table tabular-nums text-text-2">{r.available.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-table tabular-nums text-text-3">{r.ssTarget.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-table tabular-nums">
                        <span className={cn("font-medium", r.ssGap < 0 ? "text-danger" : "text-success")}>
                          {r.ssGap >= 0 ? "+" : ""}{r.ssGap.toLocaleString()} {r.ssGap < 0 ? "🔴" : "🟢"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn("text-table-sm font-medium tabular-nums", hstkColor(r.hstk))}>{r.hstk}d</span>
                      </td>
                      <td className="px-3 py-2.5 text-table-sm text-text-2">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-surface-3 bg-surface-1/50 px-4 py-2.5 flex items-center gap-2 text-table-sm text-text-3">
            <Info className="h-3.5 w-3.5 shrink-0" />
            Tồn kho từ WMS, sync 14:32. CN Manager KHÔNG sửa tồn kho (WMS quản lý).
          </div>
        </div>
      )}

      {/* ═══ TAB 3: Trao đổi ═══ */}
      {activeTab === "chat" && (
        <div className="space-y-4 animate-fade-in max-w-2xl">
          <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
            {/* Messages */}
            <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
              {(messages[activeCn] || []).length === 0 ? (
                <p className="text-table-sm text-text-3 text-center py-8">Chưa có tin nhắn cho {activeCn}.</p>
              ) : (
                (messages[activeCn] || []).map((msg) => (
                  <div key={msg.id} className={cn("flex gap-3", msg.from === user.name && "flex-row-reverse")}>
                    <div className={cn("rounded-lg px-3 py-2 max-w-[75%]",
                      msg.from === user.name ? "bg-primary/10 border border-primary/20" : "bg-surface-1 border border-surface-3"
                    )}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-caption font-semibold text-text-1">{msg.from}</span>
                        <RoleBadge role={msg.role} />
                        <span className="text-[10px] text-text-3">{msg.time}</span>
                      </div>
                      <p className="text-table-sm text-text-1 leading-relaxed">{msg.text}</p>
                      {msg.sku && (
                        <button
                          onClick={() => { setActiveTab("adjust"); setFocusRow(msg.sku!.replace(" ", "-")); }}
                          className="text-[10px] text-primary font-medium underline mt-1"
                        >
                          → {msg.sku}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Input */}
            {(user.role !== "VIEWER") && (
              <div className="border-t border-surface-3 p-3 flex gap-2">
                <input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 h-9 rounded-lg border border-surface-3 bg-surface-0 px-3 text-table text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button onClick={sendMessage} className="bg-gradient-primary text-primary-foreground px-4">
                  Gửi
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
