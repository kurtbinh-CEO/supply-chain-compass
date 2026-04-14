import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ═══ Types ═══ */
export interface OnlineUser {
  id: string;
  name: string;
  role: string;
  color: string;
}

interface CellLock {
  cellKey: string;
  userId: string;
  userName: string;
  lockedAt: number;
}

interface DraftInfo {
  cellKey: string;
  value: any;
  savedAt: number;
}

const AVATAR_COLORS = [
  "bg-primary text-primary-foreground",
  "bg-info text-primary-foreground",
  "bg-success text-primary-foreground",
  "bg-warning text-primary-foreground",
  "bg-[hsl(280,60%,50%)] text-white",
  "bg-[hsl(340,60%,50%)] text-white",
];

function getColor(idx: number) { return AVATAR_COLORS[idx % AVATAR_COLORS.length]; }

/* ═══ Hook: useCellPresence ═══ */
export function useCellPresence(screenKey: string, currentUser: OnlineUser) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [cellLocks, setCellLocks] = useState<Map<string, CellLock>>(new Map());
  const [drafts, setDrafts] = useState<Map<string, DraftInfo>>(new Map());
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [offline, setOffline] = useState(false);
  const dirtyRef = useRef<Map<string, any>>(new Map());

  // Simulate online users
  useEffect(() => {
    const demoUsers: OnlineUser[] = [
      currentUser,
      { id: "u-thuy", name: "Thúy", role: "SC Manager", color: getColor(0) },
      { id: "u-minh", name: "Minh", role: "CN-BD", color: getColor(1) },
      { id: "u-tuan", name: "Tuấn", role: "Sales", color: getColor(2) },
    ].filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i);
    setOnlineUsers(demoUsers);
  }, [currentUser.id]);

  const lockCell = useCallback((cellKey: string) => {
    setCellLocks(prev => {
      const next = new Map(prev);
      next.set(cellKey, { cellKey, userId: currentUser.id, userName: currentUser.name, lockedAt: Date.now() });
      return next;
    });
  }, [currentUser]);

  const unlockCell = useCallback((cellKey: string) => {
    setCellLocks(prev => {
      const next = new Map(prev);
      next.delete(cellKey);
      return next;
    });
  }, []);

  const getCellState = useCallback((cellKey: string): "free" | "locked_by_me" | "locked_by_other" | "draft_saved" => {
    const lock = cellLocks.get(cellKey);
    if (!lock) {
      return drafts.has(cellKey) ? "draft_saved" : "free";
    }
    return lock.userId === currentUser.id ? "locked_by_me" : "locked_by_other";
  }, [cellLocks, drafts, currentUser.id]);

  const getCellLocker = useCallback((cellKey: string): CellLock | undefined => {
    return cellLocks.get(cellKey);
  }, [cellLocks]);

  const forceEdit = useCallback((cellKey: string) => {
    const prev = cellLocks.get(cellKey);
    if (prev && prev.userId !== currentUser.id) {
      toast.info(`Cell ${cellKey} đã bị ${currentUser.name} ghi đè.`);
    }
    lockCell(cellKey);
  }, [cellLocks, currentUser, lockCell]);

  const saveDraft = useCallback((cellKey: string, value: any) => {
    dirtyRef.current.set(cellKey, value);
    setDrafts(prev => {
      const next = new Map(prev);
      next.set(cellKey, { cellKey, value, savedAt: Date.now() });
      return next;
    });
  }, []);

  // Auto-save every 30s
  useEffect(() => {
    const iv = setInterval(() => {
      if (dirtyRef.current.size > 0) {
        setLastSaved(new Date());
        dirtyRef.current.clear();
      }
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  // Simulate demo locks from other users
  useEffect(() => {
    const demoLocks: CellLock[] = [
      { cellKey: `${screenKey}:BD:GA-300:A4`, userId: "u-thuy", userName: "Thúy", lockedAt: Date.now() - 83000 },
    ];
    setCellLocks(prev => {
      const next = new Map(prev);
      demoLocks.forEach(l => {
        if (l.userId !== currentUser.id) next.set(l.cellKey, l);
      });
      return next;
    });
  }, [screenKey, currentUser.id]);

  return { onlineUsers, cellLocks, getCellState, getCellLocker, lockCell, unlockCell, forceEdit, saveDraft, lastSaved, offline };
}

/* ═══ Avatar Bar ═══ */
export function AvatarBar({ users }: { users: OnlineUser[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <span className="text-success text-caption">●</span>
      <span className="text-caption text-text-3">{users.length} người online:</span>
      <div className="flex -space-x-1.5">
        {users.map((u, i) => (
          <div key={u.id} className="relative"
            onMouseEnter={() => setHovered(u.id)} onMouseLeave={() => setHovered(null)}>
            <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-surface-0 cursor-default transition-transform hover:scale-110 hover:z-10", getColor(i))}>
              {u.name.charAt(0)}
            </div>
            {hovered === u.id && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded-md bg-surface-0 border border-surface-3 shadow-lg px-3 py-1.5 text-caption text-text-1 animate-fade-in">
                <span className="font-medium">{u.name}</span> — {u.role}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ Cell Wrapper ═══ */
interface CellWrapperProps {
  cellKey: string;
  state: "free" | "locked_by_me" | "locked_by_other" | "draft_saved";
  lockerName?: string;
  lockedAt?: number;
  onForceEdit?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function CellWrapper({ cellKey, state, lockerName, lockedAt, onForceEdit, children, className }: CellWrapperProps) {
  const [showForce, setShowForce] = useState(false);
  const elapsed = lockedAt ? Math.round((Date.now() - lockedAt) / 1000) : 0;
  const elapsedStr = elapsed > 60 ? `${Math.floor(elapsed / 60)}m${elapsed % 60}s` : `${elapsed}s`;

  const borderCls = {
    free: "",
    locked_by_me: "ring-2 ring-info ring-offset-1",
    locked_by_other: "ring-2 ring-warning ring-offset-1",
    draft_saved: "border border-dashed border-info",
  }[state];

  const badgeEl = state === "locked_by_me" ? (
    <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-info text-[8px] text-white flex items-center justify-center font-bold z-10">Me</span>
  ) : state === "locked_by_other" ? (
    <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-warning text-[8px] text-white flex items-center justify-center font-bold z-10 animate-pulse">{lockerName?.charAt(0)}</span>
  ) : state === "draft_saved" ? (
    <span className="absolute -top-2 -right-2 text-[10px] z-10">💾</span>
  ) : null;

  const tooltip = state === "free" ? "Click để sửa" :
    state === "locked_by_me" ? "Bạn đang edit" :
    state === "locked_by_other" ? `${lockerName} đang edit (${elapsedStr})` :
    "Draft saved";

  const handleClick = () => {
    if (state === "locked_by_other") setShowForce(true);
  };

  return (
    <>
      <div className={cn("relative rounded", borderCls, state === "locked_by_other" && "cursor-not-allowed", className)}
        title={tooltip} onClick={handleClick}>
        {badgeEl}
        {children}
      </div>
      {showForce && (
        <ForceEditDialog
          lockerName={lockerName || ""}
          cellKey={cellKey}
          onClose={() => setShowForce(false)}
          onForce={() => { onForceEdit?.(); setShowForce(false); }}
        />
      )}
    </>
  );
}

/* ═══ Force-Edit Dialog ═══ */
function ForceEditDialog({ lockerName, cellKey, onClose, onForce }: {
  lockerName: string; cellKey: string; onClose: () => void; onForce: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-text-1/30 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-surface-2 border border-surface-3 rounded-card shadow-xl z-50 p-5 space-y-4 animate-fade-in">
        <h3 className="font-display text-section-header text-text-1 flex items-center gap-2">
          <span className="text-warning">⚠</span> {lockerName} đang edit cell này
        </h3>
        <p className="text-table text-text-2">
          Cell: <span className="font-mono text-text-1">{cellKey}</span><br />
          {lockerName} đang sửa. Giá trị có thể chưa lưu.
        </p>
        <div className="space-y-2">
          <button onClick={onClose}
            className="w-full rounded-button border border-surface-3 py-2.5 text-table text-text-2 hover:bg-surface-3 transition-colors">
            Chờ {lockerName} xong
          </button>
          <button onClick={onForce}
            className="w-full rounded-button bg-warning text-white py-2.5 text-table font-medium hover:opacity-90 transition-opacity">
            Force-edit — ghi đè
          </button>
        </div>
        <p className="text-caption text-text-3">⚠ Force-edit sẽ được ghi nhận trong Conflict Log.</p>
      </div>
    </>
  );
}

/* ═══ Auto-Save Indicator ═══ */
export function AutoSaveIndicator({ lastSaved, offline }: { lastSaved: Date | null; offline: boolean }) {
  if (offline) {
    return (
      <div className="fixed bottom-4 right-4 z-40 rounded-button bg-warning/15 border border-warning/30 px-3 py-1.5 text-caption text-warning flex items-center gap-1.5">
        ⚠ Offline. Draft saved locally.
      </div>
    );
  }
  if (!lastSaved) return null;
  const time = lastSaved.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <div className="fixed bottom-4 right-4 z-40 text-caption text-text-3">
      💾 Auto-saved {time}
    </div>
  );
}
