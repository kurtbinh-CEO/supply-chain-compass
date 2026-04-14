import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useRbac, AppUser } from "@/components/RbacContext";
import { useWorkspace } from "@/components/WorkspaceContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronDown, Clock, Check, X as XIcon, AlertTriangle, Info, Paperclip, AtSign, MessageSquare, Volume2, History, Filter } from "lucide-react";
import { VoiceInput } from "@/components/VoiceInput";
import { VoiceMessage, AudioPlayerInline } from "@/components/VoiceMessage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LogicLink } from "@/components/LogicLink";

/* ═══ DATA ═══ */
const allCns = ["CN-BD", "CN-ĐN", "CN-HN", "CN-CT"];

interface SkuRow {
  item: string; variant: string; forecast: number;
  adjust: number | null;
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
interface Message {
  id: string; from: string; role: string; time: string; text: string;
  sku?: string; attachment?: { name: string; type: string };
  mentions?: string[];
}

const baseMessages: Record<string, Message[]> = {
  "CN-BD": [
    { id: "m1", from: "Minh Trần", role: "CN_MANAGER", time: "09:15", text: "GA-300 A4: nhà thầu mới Hòa Bình Group ký Th5, tăng ~44m²/tuần", sku: "GA-300 A4" },
    { id: "m2", from: "Thúy Nguyễn", role: "SC_MANAGER", time: "10:30", text: "OK noted. Nhà thầu nào? Có PO chưa?", sku: "GA-300 A4", mentions: ["Minh Trần"] },
    { id: "m3", from: "Minh Trần", role: "CN_MANAGER", time: "10:45", text: "Hòa Bình Group, PO 500m²/tháng. File đính kèm.", sku: "GA-300 A4", attachment: { name: "HBG_PO_Th5.pdf", type: "pdf" } },
    { id: "m4", from: "Tuấn Phạm", role: "SALES", time: "11:00", text: "Confirm: deal HBG pipeline 85% confidence. Đã nhập /demand tab 2.", sku: "GA-300 A4" },
    { id: "m5", from: "Thúy Nguyễn", role: "SC_MANAGER", time: "09:42", text: "Đã duyệt GA-300 A4. GA-400 A4 giảm 30 — cần xác nhận lại với Sales.", sku: "GA-400 A4", mentions: ["Tuấn Phạm"] },
    { id: "m6", from: "Tuấn Phạm", role: "SALES", time: "10:05", text: "GA-400 A4: xác nhận dự án Sunrise delay sang tháng 6. Demand giảm hợp lý.", sku: "GA-400 A4" },
  ],
  "CN-ĐN": [
    { id: "m7", from: "Hà Lê", role: "CN_MANAGER", time: "08:30", text: "Chưa adjust — chờ data từ Sales team ĐN." },
  ],
  "CN-HN": [],
  "CN-CT": [],
};

/* ═══ AUDIT LOG DATA ═══ */
interface AuditEntry {
  id: string;
  time: string;
  date: string;
  week: string;
  who: string;
  role: string;
  action: "adjust" | "approve" | "reject" | "submit" | "revert" | "auto_approve";
  sku: string;
  variant: string;
  detail: string;
  oldValue?: number;
  newValue?: number;
  reason?: string;
}

const baseAuditLog: Record<string, AuditEntry[]> = {
  "CN-BD": [
    { id: "a1", time: "14:32", date: "12/05", week: "W17", who: "Minh Trần", role: "CN_MANAGER", action: "adjust", sku: "GA-300", variant: "A4", detail: "Điều chỉnh demand", oldValue: 524, newValue: 568, reason: "Nhà thầu mới Q2, tăng 10%" },
    { id: "a2", time: "15:10", date: "12/05", week: "W17", who: "Thúy Nguyễn", role: "SC_MANAGER", action: "approve", sku: "GA-300", variant: "A4", detail: "Duyệt điều chỉnh +44 (+8.4%)", reason: "Có PO xác nhận" },
    { id: "a3", time: "14:45", date: "12/05", week: "W17", who: "Minh Trần", role: "CN_MANAGER", action: "adjust", sku: "GA-400", variant: "A4", detail: "Điều chỉnh demand", oldValue: 294, newValue: 264, reason: "Dự án delay sang Th6" },
    { id: "a4", time: "16:00", date: "12/05", week: "W17", who: "System", role: "SYSTEM", action: "auto_approve", sku: "GA-600", variant: "A4", detail: "Auto-approve (delta < 10%)", oldValue: 748, newValue: 828 },
    { id: "a5", time: "09:30", date: "11/05", week: "W17", who: "Minh Trần", role: "CN_MANAGER", action: "submit", sku: "GA-300", variant: "A4", detail: "Gửi batch 3 SKU điều chỉnh" },
    { id: "a6", time: "10:15", date: "05/05", week: "W16", who: "Minh Trần", role: "CN_MANAGER", action: "adjust", sku: "GA-300", variant: "A4", detail: "Điều chỉnh demand", oldValue: 510, newValue: 530, reason: "Tăng nhẹ theo trend" },
    { id: "a7", time: "11:00", date: "05/05", week: "W16", who: "Thúy Nguyễn", role: "SC_MANAGER", action: "approve", sku: "GA-300", variant: "A4", detail: "Duyệt điều chỉnh +20 (+3.9%)" },
    { id: "a8", time: "14:00", date: "05/05", week: "W16", who: "Minh Trần", role: "CN_MANAGER", action: "adjust", sku: "GA-600", variant: "A4", detail: "Điều chỉnh demand", oldValue: 700, newValue: 740, reason: "Deal Vingroup phase 1" },
    { id: "a9", time: "14:30", date: "05/05", week: "W16", who: "Thúy Nguyễn", role: "SC_MANAGER", action: "reject", sku: "GA-600", variant: "B2", detail: "Từ chối điều chỉnh +80 (+22%)", oldValue: 360, newValue: 440, reason: "Không có PO" },
    { id: "a10", time: "15:00", date: "05/05", week: "W16", who: "Minh Trần", role: "CN_MANAGER", action: "revert", sku: "GA-600", variant: "B2", detail: "Revert về forecast gốc", oldValue: 440, newValue: 360 },
    { id: "a11", time: "09:00", date: "28/04", week: "W15", who: "Minh Trần", role: "CN_MANAGER", action: "adjust", sku: "GA-300", variant: "A4", detail: "Điều chỉnh demand", oldValue: 500, newValue: 510, reason: "Micro adjust" },
    { id: "a12", time: "09:30", date: "28/04", week: "W15", who: "System", role: "SYSTEM", action: "auto_approve", sku: "GA-300", variant: "A4", detail: "Auto-approve (delta < 5%)", oldValue: 500, newValue: 510 },
  ],
  "CN-ĐN": [
    { id: "a20", time: "08:30", date: "12/05", week: "W17", who: "Hà Lê", role: "CN_MANAGER", action: "submit", sku: "—", variant: "—", detail: "Chưa adjust — chờ data từ Sales team ĐN" },
    { id: "a21", time: "10:00", date: "05/05", week: "W16", who: "Hà Lê", role: "CN_MANAGER", action: "adjust", sku: "GA-300", variant: "A4", detail: "Điều chỉnh demand", oldValue: 400, newValue: 420, reason: "Tăng nhẹ" },
    { id: "a22", time: "11:00", date: "05/05", week: "W16", who: "Thúy Nguyễn", role: "SC_MANAGER", action: "approve", sku: "GA-300", variant: "A4", detail: "Duyệt +20 (+5%)" },
  ],
  "CN-HN": [
    { id: "a30", time: "09:00", date: "12/05", week: "W17", who: "Phong Vũ", role: "SALES", action: "adjust", sku: "GA-300", variant: "A4", detail: "Điều chỉnh demand", oldValue: 380, newValue: 400, reason: "Dự báo tăng nhẹ" },
    { id: "a31", time: "10:00", date: "12/05", week: "W17", who: "Thúy Nguyễn", role: "SC_MANAGER", action: "approve", sku: "GA-300", variant: "A4", detail: "Duyệt +20 (+5.3%)" },
    { id: "a32", time: "11:00", date: "12/05", week: "W17", who: "Phong Vũ", role: "SALES", action: "adjust", sku: "GA-600", variant: "A4", detail: "Điều chỉnh demand", oldValue: 500, newValue: 520, reason: "Nhu cầu tăng" },
    { id: "a33", time: "11:30", date: "12/05", week: "W17", who: "System", role: "SYSTEM", action: "auto_approve", sku: "GA-600", variant: "A4", detail: "Auto-approve (delta < 5%)", oldValue: 500, newValue: 520 },
  ],
  "CN-CT": [
    { id: "a40", time: "08:00", date: "12/05", week: "W17", who: "Tuấn Phạm", role: "SALES", action: "adjust", sku: "GA-400", variant: "A4", detail: "Điều chỉnh demand", oldValue: 180, newValue: 200, reason: "Dự án mới" },
    { id: "a41", time: "09:00", date: "12/05", week: "W17", who: "Thúy Nguyễn", role: "SC_MANAGER", action: "approve", sku: "GA-400", variant: "A4", detail: "Duyệt +20 (+11.1%)" },
  ],
};

/* Mentionable users */
const mentionableUsers = [
  { id: "u1", name: "Thúy Nguyễn", role: "SC_MANAGER" },
  { id: "u2", name: "Minh Trần", role: "CN_MANAGER" },
  { id: "u3", name: "Hà Lê", role: "CN_MANAGER" },
  { id: "u4", name: "Tuấn Phạm", role: "SALES" },
  { id: "u5", name: "Phong Vũ", role: "SALES" },
];

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

function Avatar({ name, role }: { name: string; role: string }) {
  const initial = name.charAt(0).toUpperCase();
  const colors: Record<string, string> = {
    SC_MANAGER: "bg-primary text-primary-foreground",
    CN_MANAGER: "bg-info text-primary-foreground",
    SALES: "bg-success text-primary-foreground",
    VIEWER: "bg-surface-3 text-text-2",
  };
  return (
    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-caption font-bold shrink-0", colors[role] || "bg-surface-3 text-text-2")}>
      {initial}
    </div>
  );
}

/* ═══ MAIN ═══ */
export default function CnPortalPage() {
  const { user, setUser, users, canEdit, canApprove, canViewAllCn, filterCnId } = useRbac();
  const { addApproval, addNotification } = useWorkspace();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("adjust");
  const [selectedCn, setSelectedCn] = useState(filterCnId || "CN-BD");
  const [demandData, setDemandData] = useState<Record<string, SkuRow[]>>(() => JSON.parse(JSON.stringify(baseDemandData)));
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => JSON.parse(JSON.stringify(baseMessages)));
  const [newMsg, setNewMsg] = useState("");
  const [focusRow, setFocusRow] = useState<string | null>(null);
  const focusRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [threadFilter, setThreadFilter] = useState("all");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const cutoff = getCutoffInfo();
  const activeCn = filterCnId || selectedCn;
  const rows = demandData[activeCn] || [];
  const inv = baseInvData[activeCn] || [];

  useEffect(() => {
    if (focusRow && focusRef.current) {
      focusRef.current.focus();
      setFocusRow(null);
    }
  }, [focusRow, activeTab]);

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeCn, threadFilter]);

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

    const pendingRows = edited.filter((r) => r.status === "pending");
    pendingRows.forEach((r) => {
      const delta = r.adjust! - r.forecast;
      const pct = ((delta / r.forecast) * 100).toFixed(1);
      const sign = delta > 0 ? "+" : "";
      addApproval({
        id: `APR-CN-${Date.now()}-${r.item}-${r.variant}`,
        type: "CN Adjust",
        typeColor: "warning",
        description: `${activeCn} ${sign}${delta} (${sign}${pct}%) ${r.item} ${r.variant} — "${r.reason.slice(0, 40)}"`,
        submitter: user.name,
        timeAgo: "vừa xong",
      });
    });

    addNotification({
      id: `NTF-CN-${Date.now()}`,
      type: "CN_ADJUST",
      typeColor: pending > 0 ? "warning" : "success",
      message: `${user.name} (${activeCn}) gửi điều chỉnh ${edited.length} SKU. ${approved} auto-approved, ${pending} chờ duyệt.`,
      timeAgo: "vừa xong",
      read: false,
      url: "/cn-portal",
    });

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

  const sendMessage = (skuTag?: string) => {
    if (!newMsg.trim()) return;
    const msg: Message = {
      id: `m${Date.now()}`, from: user.name, role: user.role,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      text: newMsg.trim(),
      sku: skuTag || (threadFilter !== "all" ? threadFilter : undefined),
    };
    setMessages((prev) => ({ ...prev, [activeCn]: [...(prev[activeCn] || []), msg] }));
    setNewMsg("");
    setShowMentions(false);
  };

  const handleAttach = () => {
    toast.info("Đính kèm file", { description: "Chọn PDF, Excel, hoặc ảnh (max 10MB)" });
  };

  const handleMentionInsert = (name: string) => {
    setNewMsg((prev) => prev.replace(/@\w*$/, `@${name} `));
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleMsgInput = (val: string) => {
    setNewMsg(val);
    const atMatch = val.match(/@(\w*)$/);
    if (atMatch) {
      setShowMentions(true);
      setMentionSearch(atMatch[1].toLowerCase());
    } else {
      setShowMentions(false);
    }
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

  // Thread SKUs
  const allMsgs = messages[activeCn] || [];
  const threadSkus = Array.from(new Set(allMsgs.filter((m) => m.sku).map((m) => m.sku!)));
  const filteredMsgs = threadFilter === "all" ? allMsgs : allMsgs.filter((m) => threadFilter === "general" ? !m.sku : m.sku === threadFilter);

  // Count messages per thread
  const getSkuMsgCount = (sku: string) => allMsgs.filter((m) => m.sku === sku).length;
  const generalCount = allMsgs.filter((m) => !m.sku).length;

  // Edited count for mobile submit
  const editedCount = rows.filter((r) => r.adjust !== null && r.adjust !== r.forecast).length;

  const tabs = [
    { key: "adjust", label: "Điều chỉnh demand" },
    { key: "inv", label: "Tồn kho CN" },
    { key: "chat", label: "Trao đổi" },
    { key: "history", label: "Lịch sử" },
  ];

  // Audit log state — stateful so actions can add entries
  const [auditLog, setAuditLog] = useState<Record<string, AuditEntry[]>>(() => JSON.parse(JSON.stringify(baseAuditLog)));
  const auditEntries = auditLog[activeCn] || [];

  const addAuditEntry = (entry: Omit<AuditEntry, "id" | "time" | "date" | "week">) => {
    const now = new Date();
    const newEntry: AuditEntry = {
      ...entry,
      id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      time: now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      date: `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}`,
      week: `W${Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7)}`,
    };
    setAuditLog(prev => ({
      ...prev,
      [activeCn]: [newEntry, ...(prev[activeCn] || [])],
    }));
  };
  const [auditWeekFilter, setAuditWeekFilter] = useState("all");
  const [auditSkuFilter, setAuditSkuFilter] = useState("all");
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const auditWeeks = Array.from(new Set(auditEntries.map(e => e.week))).sort().reverse();
  const auditSkus = Array.from(new Set(auditEntries.filter(e => e.sku !== "—").map(e => `${e.sku} ${e.variant}`)));
  const filteredAudit = auditEntries.filter(e => {
    if (auditWeekFilter !== "all" && e.week !== auditWeekFilter) return false;
    if (auditSkuFilter !== "all" && `${e.sku} ${e.variant}` !== auditSkuFilter) return false;
    if (auditActionFilter !== "all" && e.action !== auditActionFilter) return false;
    return true;
  });

  const cnLabel: Record<string, string> = {
    "CN-BD": "CN Bình Dương", "CN-ĐN": "CN Đà Nẵng", "CN-HN": "CN Hà Nội", "CN-CT": "CN Cần Thơ",
  };

  // Get inv data for a SKU
  const getInv = (item: string, variant: string) => inv.find((r) => r.item === item && r.variant === variant);

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
          <span className={cn("rounded-full px-3 py-1 text-table-sm font-medium flex items-center gap-1.5",
            cutoff.pastCutoff ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning"
          )}>
            <Clock className="h-3.5 w-3.5" />
            {cutoff.label}
          </span>
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
            {tab.key === "chat" && allMsgs.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5">
                {allMsgs.length}
              </span>
            )}
            {tab.key === "history" && auditEntries.length > 0 && (
              <span className="ml-1.5 rounded-full bg-info/10 text-info text-[10px] font-bold px-1.5 py-0.5">
                {auditEntries.length}
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

          {/* Desktop Table */}
          <div className="rounded-card border border-surface-3 bg-surface-2 hidden sm:block">
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
                            <input ref={isFocused ? focusRef : undefined} type="number"
                              value={row.adjust ?? ""} onChange={(e) => updateRow(idx, "adjust", e.target.value)}
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
                          ) : <span className="text-text-3">0</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          {isEditable ? (
                            <div className="flex items-center gap-1">
                              <input type="text" value={row.reason} onChange={(e) => updateRow(idx, "reason", e.target.value.slice(0, 100))}
                                placeholder={Math.abs(pct) > 5 ? "Bắt buộc..." : "—"} maxLength={100}
                                className={cn("w-36 h-7 rounded border bg-surface-0 px-2 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary",
                                  needReason ? "border-danger" : "border-surface-3"
                                )}
                              />
                              <VoiceInput onTranscript={(t) => updateRow(idx, "reason", (row.reason ? row.reason + " " : "") + t)} />
                            </div>
                          ) : (
                            <span className="text-table text-text-2 truncate max-w-[160px] block">{row.reason || "—"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium whitespace-nowrap", badge.cls)}>{badge.label}</span>
                        </td>
                        {canApprove && (
                          <td className="px-3 py-2.5">
                            {row.status === "pending" && (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleApprove(idx)} className="rounded-md bg-success-bg text-success p-1 hover:bg-success/20">
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

          {/* Mobile Card Layout */}
          <div className="sm:hidden space-y-3 pb-20">
            {rows.map((row, idx) => {
              const adj = row.adjust ?? row.forecast;
              const delta = adj - row.forecast;
              const pct = row.forecast > 0 ? (delta / row.forecast * 100) : 0;
              const badge = statusBadge(row.status);
              const isEditable = canEdit && !cutoff.pastCutoff && (user.role !== "SALES");
              const isFocused = focusRow === `${row.item}-${row.variant}`;
              const invRow = getInv(row.item, row.variant);
              const skuMsgCount = allMsgs.filter((m) => m.sku === `${row.item} ${row.variant}`).length;

              return (
                <div key={`${row.item}-${row.variant}`} className={cn(
                  "rounded-card border border-surface-3 bg-surface-2 p-4 space-y-3",
                  row.status === "blocked" && "border-danger/30 bg-danger-bg/10",
                )}>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-body font-semibold text-text-1">{row.item} {row.variant}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium", badge.cls)}>{badge.label}</span>
                  </div>
                  <div className="text-table-sm text-text-3">Dự kiến: {row.forecast.toLocaleString()} m²</div>
                  {isEditable ? (
                    <input ref={isFocused ? focusRef : undefined} type="number"
                      value={row.adjust ?? ""} onChange={(e) => updateRow(idx, "adjust", e.target.value)}
                      placeholder={String(row.forecast)}
                      className="w-full h-12 rounded-lg border border-surface-3 bg-surface-0 px-4 text-body tabular-nums text-text-1 focus:outline-none focus:ring-2 focus:ring-primary text-center font-semibold"
                    />
                  ) : (
                    <div className="text-center text-body font-semibold text-text-1 py-2">{row.adjust ?? "—"}</div>
                  )}
                  {row.adjust !== null && delta !== 0 && (
                    <div className="text-table-sm">
                      Delta: <span className={cn("font-medium", delta > 0 ? "text-success" : "text-danger")}>
                        {delta > 0 ? "+" : ""}{delta} ({pct > 0 ? "+" : ""}{pct.toFixed(1)}%)
                      </span>
                      {" "}
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", badge.cls)}>{row.status === "approved" ? "Auto" : row.status}</span>
                    </div>
                  )}
                  {isEditable && (
                    <div className="flex items-center gap-2">
                      <input type="text" value={row.reason} onChange={(e) => updateRow(idx, "reason", e.target.value.slice(0, 100))}
                        placeholder={Math.abs(pct) > 5 ? "Lý do (bắt buộc)..." : "Lý do..."} maxLength={100}
                        className="flex-1 h-9 rounded-lg border border-surface-3 bg-surface-0 px-3 text-table-sm text-text-1 placeholder:text-text-3"
                      />
                      <VoiceInput size="md" onTranscript={(t) => updateRow(idx, "reason", (row.reason ? row.reason + " " : "") + t)} />
                    </div>
                  )}
                  {invRow && (
                    <div className={cn("text-[11px] px-2 py-1 rounded bg-surface-1 flex items-center gap-2",
                      invRow.hstk < 5 && "bg-danger-bg/30"
                    )}>
                      <span>Tồn: {invRow.ton.toLocaleString()}</span>
                      <span className="text-text-3">|</span>
                      <span>SS: {invRow.ssTarget.toLocaleString()}</span>
                      <span className="text-text-3">|</span>
                      <span className={hstkColor(invRow.hstk)}>HSTK: {invRow.hstk}d {invRow.hstk < 5 ? "⚠" : ""}</span>
                    </div>
                  )}
                  {skuMsgCount > 0 && (
                    <button onClick={() => { setActiveTab("chat"); setThreadFilter(`${row.item} ${row.variant}`); }}
                      className="flex items-center gap-1.5 text-[11px] text-primary font-medium">
                      <MessageSquare className="h-3 w-3" /> {skuMsgCount} comments
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile fixed bottom bar */}
          {canEdit && user.role !== "SALES" && (
            <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-surface-2 border-t border-surface-3 z-50">
              <Button disabled={cutoff.pastCutoff} onClick={handleSubmit}
                className="w-full h-12 bg-gradient-primary text-primary-foreground text-body font-semibold">
                {cutoff.pastCutoff ? "Đã qua cutoff ⏰" : `Gửi điều chỉnh (${editedCount} SKU)`}
              </Button>
            </div>
          )}

          {/* Desktop submit */}
          {canEdit && user.role !== "SALES" && (
            <div className="hidden sm:flex justify-end">
              <Button disabled={cutoff.pastCutoff} onClick={handleSubmit}
                className="bg-gradient-primary text-primary-foreground px-6">
                {cutoff.pastCutoff ? "Đã qua cutoff ⏰" : "Gửi điều chỉnh"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 2: Tồn kho CN ═══ */}
      {activeTab === "inv" && (
        <div className="space-y-4 animate-fade-in">
          {inv.filter((r) => r.hstk < 5).length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning-bg/50 px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div className="text-table-sm text-text-1 space-y-0.5">
                {inv.filter((r) => r.hstk < 5).map((r) => (
                  <p key={`${r.item}-${r.variant}`}>
                    <strong>{r.item} {r.variant}</strong>: HSTK {r.hstk} ngày! Cân nhắc{" "}
                    <button onClick={() => { setActiveTab("adjust"); setFocusRow(`${r.item}-${r.variant}`); }}
                      className="text-primary underline font-medium">tăng demand tuần này</button>
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

      {/* ═══ TAB 3: Trao đổi (Thread system) ═══ */}
      {activeTab === "chat" && (
        <div className="space-y-4 animate-fade-in max-w-3xl">
          {/* Thread filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setThreadFilter("all")}
              className={cn("rounded-full px-3 py-1.5 text-caption font-medium transition-colors border",
                threadFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-surface-3 text-text-2 hover:bg-surface-1"
              )}>
              Tất cả ({allMsgs.length})
            </button>
            {threadSkus.map((sku) => (
              <button key={sku} onClick={() => setThreadFilter(sku)}
                className={cn("rounded-full px-3 py-1.5 text-caption font-medium transition-colors border",
                  threadFilter === sku ? "border-primary bg-primary/10 text-primary" : "border-surface-3 text-text-2 hover:bg-surface-1"
                )}>
                {sku} ({getSkuMsgCount(sku)})
              </button>
            ))}
            <button onClick={() => setThreadFilter("general")}
              className={cn("rounded-full px-3 py-1.5 text-caption font-medium transition-colors border",
                threadFilter === "general" ? "border-primary bg-primary/10 text-primary" : "border-surface-3 text-text-2 hover:bg-surface-1"
              )}>
              General ({generalCount})
            </button>
          </div>

          <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
            {/* Messages */}
            <div className="max-h-[420px] overflow-y-auto p-4 space-y-4">
              {filteredMsgs.length === 0 ? (
                <p className="text-table-sm text-text-3 text-center py-8">
                  {threadFilter === "all" ? `Chưa có tin nhắn cho ${activeCn}.` : `Chưa có tin nhắn trong thread "${threadFilter}".`}
                </p>
              ) : (
                filteredMsgs.map((msg) => (
                  <div key={msg.id} className={cn("flex gap-3", msg.from === user.name && "flex-row-reverse")}>
                    <Avatar name={msg.from} role={msg.role} />
                    <div className={cn("rounded-xl px-4 py-2.5 max-w-[75%]",
                      msg.from === user.name ? "bg-primary/10 border border-primary/20" : "bg-surface-1 border border-surface-3"
                    )}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-caption font-semibold text-text-1">{msg.from}</span>
                        <RoleBadge role={msg.role} />
                        <span className="text-[10px] text-text-3">{msg.time}</span>
                      </div>
                      <p className="text-table-sm text-text-1 leading-relaxed">
                        {msg.text.split(/(@\w+\s?\w*)/g).map((part, i) =>
                          part.startsWith("@") ? <span key={i} className="text-primary font-medium">{part}</span> : part
                        )}
                      </p>
                      {msg.attachment && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-surface-0 border border-surface-3 px-2.5 py-1.5 text-caption text-text-2 w-fit">
                          <Paperclip className="h-3 w-3 text-text-3" />
                          <span className="font-medium">{msg.attachment.name}</span>
                          <span className="text-[10px] text-text-3 uppercase">{msg.attachment.type}</span>
                        </div>
                      )}
                      {msg.sku && (
                        <button
                          onClick={() => { setActiveTab("adjust"); setFocusRow(msg.sku!.replace(" ", "-")); }}
                          className="text-[10px] text-primary font-medium underline mt-1.5 block"
                        >
                          → {msg.sku}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            {(user.role !== "VIEWER") && (
              <div className="border-t border-surface-3 p-3">
                {/* Mention dropdown */}
                {showMentions && (
                  <div className="mb-2 rounded-lg border border-surface-3 bg-surface-0 shadow-lg overflow-hidden">
                    {mentionableUsers
                      .filter((u) => u.name.toLowerCase().includes(mentionSearch))
                      .map((u) => (
                        <button key={u.id} onClick={() => handleMentionInsert(u.name)}
                          className="w-full px-3 py-2 text-left text-table-sm text-text-1 hover:bg-surface-1 flex items-center gap-2">
                          <Avatar name={u.name} role={u.role} />
                          <span className="font-medium">{u.name}</span>
                          <RoleBadge role={u.role} />
                        </button>
                      ))}
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <button onClick={handleAttach}
                    className="h-9 w-9 rounded-lg border border-surface-3 bg-surface-0 flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-surface-1 transition-colors shrink-0">
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <VoiceMessage onRecorded={(audioUrl, transcript) => {
                    const msg: Message = {
                      id: `m${Date.now()}`, from: user.name, role: user.role,
                      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
                      text: `🎙 ${transcript}`,
                      sku: threadFilter !== "all" && threadFilter !== "general" ? threadFilter : undefined,
                    };
                    setMessages((prev) => ({ ...prev, [activeCn]: [...(prev[activeCn] || []), msg] }));
                  }} />
                  <div className="relative flex-1">
                    <input ref={inputRef}
                      value={newMsg}
                      onChange={(e) => handleMsgInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !showMentions) sendMessage(); }}
                      placeholder="Nhập tin nhắn... (@ để mention)"
                      className="w-full h-9 rounded-lg border border-surface-3 bg-surface-0 px-3 pr-8 text-table text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button onClick={() => { setShowMentions(!showMentions); setMentionSearch(""); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-3 hover:text-primary">
                      <AtSign className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <VoiceInput size="md" onTranscript={(t) => setNewMsg((prev) => prev + t)} />
                  <Button onClick={() => sendMessage()} className="bg-gradient-primary text-primary-foreground px-4 shrink-0">
                    Gửi
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ TAB 4: Lịch sử ═══ */}
      {activeTab === "history" && (
        <div className="space-y-4 animate-fade-in">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-table-sm text-text-2">
              <Filter className="h-3.5 w-3.5" />
              <span>Lọc:</span>
            </div>
            <Select value={auditWeekFilter} onValueChange={setAuditWeekFilter}>
              <SelectTrigger className="w-28 h-8 text-table-sm bg-surface-0 border-surface-3">
                <SelectValue placeholder="Tuần" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả tuần</SelectItem>
                {auditWeeks.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={auditSkuFilter} onValueChange={setAuditSkuFilter}>
              <SelectTrigger className="w-32 h-8 text-table-sm bg-surface-0 border-surface-3">
                <SelectValue placeholder="SKU" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả SKU</SelectItem>
                {auditSkus.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={auditActionFilter} onValueChange={setAuditActionFilter}>
              <SelectTrigger className="w-32 h-8 text-table-sm bg-surface-0 border-surface-3">
                <SelectValue placeholder="Hành động" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="adjust">Điều chỉnh</SelectItem>
                <SelectItem value="approve">Duyệt</SelectItem>
                <SelectItem value="reject">Từ chối</SelectItem>
                <SelectItem value="auto_approve">Auto-approve</SelectItem>
                <SelectItem value="submit">Gửi batch</SelectItem>
                <SelectItem value="revert">Revert</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-caption text-text-3 ml-auto">{filteredAudit.length} bản ghi</span>
          </div>

          {/* Timeline */}
          <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
            {(() => {
              // Group by date
              const grouped: Record<string, AuditEntry[]> = {};
              filteredAudit.forEach(e => {
                const key = `${e.date} (${e.week})`;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(e);
              });

              const actionConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
                adjust: { icon: <span className="text-[11px]">✏️</span>, color: "text-info", bgColor: "bg-info/10 border-info/30", label: "Điều chỉnh" },
                approve: { icon: <Check className="h-3.5 w-3.5" />, color: "text-success", bgColor: "bg-success/10 border-success/30", label: "Duyệt" },
                reject: { icon: <XIcon className="h-3.5 w-3.5" />, color: "text-danger", bgColor: "bg-danger/10 border-danger/30", label: "Từ chối" },
                auto_approve: { icon: <Check className="h-3.5 w-3.5" />, color: "text-success", bgColor: "bg-success/5 border-success/20", label: "Auto ✓" },
                submit: { icon: <span className="text-[11px]">📤</span>, color: "text-primary", bgColor: "bg-primary/10 border-primary/30", label: "Gửi" },
                revert: { icon: <History className="h-3.5 w-3.5" />, color: "text-warning", bgColor: "bg-warning/10 border-warning/30", label: "Revert" },
              };

              return Object.entries(grouped).map(([dateLabel, entries]) => (
                <div key={dateLabel}>
                  {/* Date header */}
                  <div className="px-5 py-2.5 bg-surface-1/50 border-b border-surface-3 sticky top-0 z-10">
                    <span className="text-table-sm font-semibold text-text-1">{dateLabel}</span>
                    <span className="text-caption text-text-3 ml-2">{entries.length} thay đổi</span>
                  </div>

                  {/* Timeline entries */}
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-[29px] top-0 bottom-0 w-[2px] bg-surface-3/60" />

                    {entries.map((entry, idx) => {
                      const cfg = actionConfig[entry.action] || actionConfig.adjust;
                      return (
                        <div key={entry.id} className="relative px-5 py-3 flex items-start gap-3 hover:bg-surface-1/20 transition-colors">
                          {/* Timeline dot */}
                          <div className={cn(
                            "relative z-10 h-[22px] w-[22px] rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                            cfg.bgColor
                          )}>
                            <span className={cfg.color}>{cfg.icon}</span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold border", cfg.bgColor, cfg.color)}>
                                {cfg.label}
                              </span>
                              {entry.sku !== "—" && (
                                <span className="text-table-sm font-mono font-medium text-text-1 bg-surface-1 rounded px-1.5 py-0.5">
                                  {entry.sku} {entry.variant}
                                </span>
                              )}
                              <span className="text-caption text-text-3">{entry.time}</span>
                            </div>

                            <p className="text-table text-text-1 mt-1">{entry.detail}</p>

                            {/* Value change */}
                            {entry.oldValue !== undefined && entry.newValue !== undefined && (
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-table-sm text-text-3 tabular-nums">{entry.oldValue.toLocaleString()}</span>
                                <span className="text-text-3">→</span>
                                <span className={cn(
                                  "text-table-sm font-semibold tabular-nums",
                                  entry.newValue > entry.oldValue ? "text-success" : entry.newValue < entry.oldValue ? "text-danger" : "text-text-1"
                                )}>
                                  {entry.newValue.toLocaleString()}
                                </span>
                                {(() => {
                                  const delta = entry.newValue - entry.oldValue;
                                  const pct = entry.oldValue > 0 ? ((delta / entry.oldValue) * 100).toFixed(1) : "0";
                                  return (
                                    <span className={cn(
                                      "text-caption font-medium px-1.5 py-0.5 rounded",
                                      delta > 0 ? "bg-success/10 text-success" : delta < 0 ? "bg-danger/10 text-danger" : ""
                                    )}>
                                      {delta > 0 ? "+" : ""}{delta} ({delta > 0 ? "+" : ""}{pct}%)
                                    </span>
                                  );
                                })()}
                              </div>
                            )}

                            {/* Reason */}
                            {entry.reason && (
                              <p className="text-caption text-text-2 mt-1 italic">"{entry.reason}"</p>
                            )}

                            {/* Who */}
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Avatar name={entry.who} role={entry.role} />
                              <span className="text-caption text-text-2">{entry.who}</span>
                              <RoleBadge role={entry.role} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}

            {filteredAudit.length === 0 && (
              <div className="px-5 py-12 text-center text-text-3">
                <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>Chưa có lịch sử điều chỉnh cho bộ lọc này.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
