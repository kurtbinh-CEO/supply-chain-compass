import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader } from "@/components/ScreenShell";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/TenantContext";
import { ConsensusTab } from "@/components/sop/ConsensusTab";
import { BalanceLockTab } from "@/components/sop/BalanceLockTab";
import { FileText } from "lucide-react";

const tabs = [
  { key: "consensus", label: "Consensus" },
  { key: "balance", label: "Cân đối & Lock" },
];

export interface ConsensusRow {
  cn: string;
  v0: number;
  v1: number;
  v2: number;
  v3: number;
  aop: number;
  fvaBest: string;
  skus: SkuRow[];
}

export interface SkuRow {
  item: string;
  variant: string;
  v0: number;
  v1: number;
  v2: number;
  v3: number;
  aop: number;
  note: string;
}

const baseData: ConsensusRow[] = [
  {
    cn: "CN-BD", v0: 2100, v1: 2800, v2: 2550, v3: 2550, aop: 1716, fvaBest: "v2 CN (MAPE 12%)",
    skus: [
      { item: "GA-300", variant: "A4", v0: 580, v1: 650, v2: 617, v3: 617, aop: 420, note: "Nhà thầu mới Q2" },
      { item: "GA-300", variant: "B2", v0: 120, v1: 140, v2: 130, v3: 130, aop: 100, note: "" },
      { item: "GA-300", variant: "C1", v0: 350, v1: 480, v2: 410, v3: 410, aop: 280, note: "" },
      { item: "GA-400", variant: "A4", v0: 600, v1: 750, v2: 690, v3: 690, aop: 500, note: "" },
      { item: "GA-600", variant: "A4", v0: 350, v1: 540, v2: 500, v3: 500, aop: 300, note: "Vingroup Grand Park" },
      { item: "GA-600", variant: "B2", v0: 100, v1: 240, v2: 203, v3: 203, aop: 116, note: "" },
    ],
  },
  {
    cn: "CN-ĐN", v0: 1650, v1: 2000, v2: 1800, v3: 1800, aop: 1219, fvaBest: "v1 Sales (MAPE 18%)",
    skus: [
      { item: "GA-400", variant: "A4", v0: 800, v1: 950, v2: 870, v3: 870, aop: 600, note: "" },
      { item: "GA-600", variant: "A4", v0: 500, v1: 620, v2: 560, v3: 560, aop: 380, note: "" },
      { item: "GA-600", variant: "B2", v0: 350, v1: 430, v2: 370, v3: 370, aop: 239, note: "" },
    ],
  },
  {
    cn: "CN-HN", v0: 1900, v1: 2400, v2: 2100, v3: 2100, aop: 1326, fvaBest: "v0 Stat (MAPE 8%)",
    skus: [
      { item: "GA-300", variant: "A4", v0: 600, v1: 780, v2: 680, v3: 680, aop: 430, note: "" },
      { item: "GA-300", variant: "C1", v0: 450, v1: 570, v2: 500, v3: 500, aop: 320, note: "" },
      { item: "GA-400", variant: "D5", v0: 350, v1: 420, v2: 390, v3: 390, aop: 250, note: "" },
      { item: "GA-600", variant: "B2", v0: 500, v1: 630, v2: 530, v3: 530, aop: 326, note: "" },
    ],
  },
  {
    cn: "CN-CT", v0: 1150, v1: 1300, v2: 1200, v3: 1200, aop: 939, fvaBest: "v3 Consensus",
    skus: [
      { item: "GA-400", variant: "D5", v0: 400, v1: 470, v2: 430, v3: 430, aop: 340, note: "" },
      { item: "GA-600", variant: "A4", v0: 450, v1: 510, v2: 480, v3: 480, aop: 370, note: "" },
      { item: "GA-600", variant: "B2", v0: 300, v1: 320, v2: 290, v3: 290, aop: 229, note: "" },
    ],
  },
];

export default function SopPage() {
  const [activeTab, setActiveTab] = useState("consensus");
  const { tenant } = useTenant();
  const scale = tenant === "TTC Agris" ? 0.75 : tenant === "Mondelez" ? 1.2 : 1;

  const [locked, setLocked] = useState(false);

  // Scale and make consensus data stateful
  const [consensusData, setConsensusData] = useState<ConsensusRow[]>(() =>
    baseData.map(r => ({
      ...r,
      v0: Math.round(r.v0 * scale), v1: Math.round(r.v1 * scale), v2: Math.round(r.v2 * scale),
      v3: Math.round(r.v3 * scale), aop: Math.round(r.aop * scale),
      skus: r.skus.map(s => ({
        ...s,
        v0: Math.round(s.v0 * scale), v1: Math.round(s.v1 * scale), v2: Math.round(s.v2 * scale),
        v3: Math.round(s.v3 * scale), aop: Math.round(s.aop * scale),
      })),
    }))
  );

  const handleUpdateV3 = useCallback((cnIdx: number, skuIdx: number | null, value: number) => {
    setConsensusData(prev => {
      const next = prev.map((r, i) => {
        if (i !== cnIdx) return r;
        if (skuIdx === null) {
          return { ...r, v3: value };
        }
        const newSkus = r.skus.map((s, si) => si === skuIdx ? { ...s, v3: value } : s);
        const newTotal = newSkus.reduce((a, s) => a + s.v3, 0);
        return { ...r, v3: newTotal, skus: newSkus };
      });
      return next;
    });
  }, []);

  const handleUpdateNote = useCallback((cnIdx: number, skuIdx: number, note: string) => {
    setConsensusData(prev => prev.map((r, i) => {
      if (i !== cnIdx) return r;
      return { ...r, skus: r.skus.map((s, si) => si === skuIdx ? { ...s, note } : s) };
    }));
  }, []);

  const totalAop = consensusData.reduce((a, r) => a + r.aop, 0);
  const totalV3 = consensusData.reduce((a, r) => a + r.v3, 0);

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="font-display text-screen-title text-text-1">S&OP Consensus — Tháng 5</h1>
          <p className="text-table text-text-2">Digital Curator — Consensus Planning</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="rounded-button bg-gradient-primary text-white px-4 py-2 text-table-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" /> Pre-meeting report
          </button>
        </div>
      </div>

      {/* Status strip */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-info-bg text-info text-table-sm font-medium px-3 py-1">
          Day 5/30
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-bg text-warning text-table-sm font-medium px-3 py-1">
          🔒 Lock Day 7 — còn 2 ngày
        </span>
        {locked && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg text-success text-table-sm font-medium px-3 py-1">
            ✅ Locked
          </span>
        )}
        <div className="flex-1" />
        <span className="inline-flex items-center gap-1.5 text-table-sm text-text-2">
          🟢 Thúy online
        </span>
        <div className="h-7 w-7 rounded-full bg-gradient-primary flex items-center justify-center text-[10px] font-semibold text-white">TH</div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-surface-3 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-5 py-3 text-table font-medium transition-colors relative whitespace-nowrap",
              activeTab === tab.key
                ? "text-primary"
                : "text-text-2 hover:text-text-1"
            )}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t" />
            )}
          </button>
        ))}
      </div>

      {activeTab === "consensus" && (
        <ConsensusTab
          data={consensusData}
          totalAop={totalAop}
          totalV3={totalV3}
          locked={locked}
          onUpdateV3={handleUpdateV3}
          onUpdateNote={handleUpdateNote}
        />
      )}
      {activeTab === "balance" && (
        <BalanceLockTab
          data={consensusData}
          totalV3={totalV3}
          totalAop={totalAop}
          locked={locked}
          onLock={() => setLocked(true)}
          tenant={tenant}
        />
      )}
    </AppLayout>
  );
}
