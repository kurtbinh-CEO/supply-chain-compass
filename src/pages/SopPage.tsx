import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/TenantContext";
import { ConsensusTab } from "@/components/sop/ConsensusTab";
import { BalanceLockTab } from "@/components/sop/BalanceLockTab";
import { FileText, Loader2, PackageOpen } from "lucide-react";
import { LogicLink } from "@/components/LogicLink";
import { AvatarBar, AutoSaveIndicator, useCellPresence } from "@/components/CellPresence";
import { useVersionConflict, VersionConflictDialog } from "@/components/VersionConflict";
import { PreLockDialog } from "@/components/BatchLockBanner";
import { useSopConsensus } from "@/hooks/useSopConsensus";

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

export default function SopPage() {
  const [activeTab, setActiveTab] = useState("consensus");
  const { tenant } = useTenant();

  const [locked, setLocked] = useState(false);
  const [showPreLock, setShowPreLock] = useState(false);

  const cellPresence = useCellPresence("sop-consensus", { id: "u-me", name: "Bạn", role: "Planner", color: "bg-primary text-primary-foreground" });
  const { conflict, triggerConflict, clearConflict } = useVersionConflict();

  // DB data
  const { data: dbData, loading } = useSopConsensus();

  // Make consensus data stateful for local edits
  const [consensusData, setConsensusData] = useState<ConsensusRow[]>([]);
  const [prevDbData, setPrevDbData] = useState<ConsensusRow[]>([]);
  if (dbData !== prevDbData && dbData.length > 0) {
    setPrevDbData(dbData);
    setConsensusData(dbData);
  }
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
      <ScreenHeader
        title="S&OP Consensus — Tháng 5"
        subtitle="Digital Curator — Consensus Planning"
        actions={
          <>
            <LogicLink tab="monthly" node={1} tooltip="Logic S&OP Consensus → Lock" />
            <button className="rounded-button bg-gradient-primary text-white px-4 py-2 text-table-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" /> Pre-meeting report
            </button>
          </>
        }
      />

      {/* Status strip */}
      <div data-tour="sop-status" className="flex items-center gap-3 mb-5 flex-wrap">
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
        <AvatarBar users={cellPresence.onlineUsers} />
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

      <div data-tour="sop-consensus">
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
      </div>
      <div data-tour="sop-balance">
        {activeTab === "balance" && (
          <BalanceLockTab
            data={consensusData}
            totalV3={totalV3}
            totalAop={totalAop}
            locked={locked}
            onLock={() => {
              if (cellPresence.onlineUsers.length > 1) {
                setShowPreLock(true);
              } else {
                setLocked(true);
              }
            }}
            tenant={tenant}
          />
        )}
      </div>

      {/* Concurrency: Pre-Lock Dialog */}
      {showPreLock && (
        <PreLockDialog
          editors={[
            { name: "Planner C", cell: "HN×GA-400", duration: "2m" },
            { name: "Sales N", cell: "CT×GA-600", duration: "45s" },
          ]}
          onNotifyWait={() => { import("sonner").then(m => m.toast.info("Đã gửi thông báo tới editors. Chờ 5 phút...")); }}
          onForceLock={() => { setLocked(true); setShowPreLock(false); import("sonner").then(m => m.toast.warning("S&OP đã locked. Unsaved data → Drafts.")); }}
          onClose={() => setShowPreLock(false)}
        />
      )}

      {/* Concurrency: Version Conflict */}
      {conflict && (
        <VersionConflictDialog
          conflict={conflict}
          onReload={() => { clearConflict(); }}
          onForceUpdate={() => { clearConflict(); import("sonner").then(m => m.toast.success("Đã ghi đè. Audit logged.")); }}
          onClose={clearConflict}
        />
      )}

      <AutoSaveIndicator lastSaved={cellPresence.lastSaved} offline={cellPresence.offline} />
      <ScreenFooter actionCount={5} />
    </AppLayout>
  );
}
