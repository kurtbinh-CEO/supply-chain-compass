/**
 * DrpPreflight — Bước 1/3. Kiểm tra dữ liệu trước khi chạy DRP.
 *
 * Rules (PRD D1):
 *   ✅ Sẵn sàng | ⚠️ Cảnh báo (vẫn chạy được) | 🔴 Chặn (disable nút Chạy)
 *
 * Force-Release (3 tầng phê duyệt):
 *   - NM stale 48-72h  → Tier 1 (SC Manager) duyệt → DRP chạy với cảnh báo.
 *   - NM stale 72-96h  → bắt buộc Tier 2 (Director).
 *   - NM stale > 96h   → bắt buộc Tier 3 (CEO).
 *
 * Mọi text tiếng Việt.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, AlertOctagon, ArrowRight, Play, ShieldAlert, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRbac } from "@/components/RbacContext";

export type PreflightLevel = "ok" | "warn" | "block";

export interface PreflightItem {
  key: string;
  label: string;
  result: string;
  level: PreflightLevel;
  /** Optional link nếu user cần xử lý */
  fixHref?: string;
  fixLabel?: string;
  /** Tooltip / chi tiết thêm */
  detail?: string;
  /** Số giờ stale (chỉ áp cho NM-stock blocker) — quyết định tier force-release */
  staleHours?: number;
  /** Tên NM gây block (ví dụ "Phú Mỹ") */
  staleNmName?: string;
}

interface Props {
  items: PreflightItem[];
  onRun: () => void;
  onBack?: () => void;
  /** Nếu auto run preflight chạy tự động — hiện banner */
  autoRunFailed?: { reason: string; fixHref?: string };
}

function levelIcon(l: PreflightLevel) {
  if (l === "ok") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (l === "warn") return <AlertTriangle className="h-4 w-4 text-warning" />;
  return <AlertOctagon className="h-4 w-4 text-danger" />;
}

function levelLabel(l: PreflightLevel) {
  if (l === "ok") return "Sẵn sàng";
  if (l === "warn") return "Cảnh báo";
  return "Chặn — cần xử lý";
}

type Tier = "sc_manager" | "director" | "ceo";
const TIER_LABEL: Record<Tier, string> = {
  sc_manager: "SC Manager",
  director: "Director",
  ceo: "CEO",
};

export function DrpPreflight({ items, onRun, onBack, autoRunFailed }: Props) {
  const { canForceRelease: rbacCanForce, canForceReleaseDirector, canForceReleaseCeo, user } = useRbac();

  const blocking = items.filter((i) => i.level === "block");
  const warnings = items.filter((i) => i.level === "warn");
  const okCount = items.filter((i) => i.level === "ok").length;

  const canRun = blocking.length === 0;

  // ── Highlight các điều kiện "vừa được xử lý" khi quay lại Preflight ──
  // So sánh snapshot (sessionStorage) keys đã từng block với trạng thái hiện tại.
  const SNAPSHOT_KEY = "drp_preflight_block_snapshot_v1";
  const [justResolvedKeys, setJustResolvedKeys] = useState<Set<string>>(new Set());
  const persistedRef = useRef(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SNAPSHOT_KEY);
      const prevBlocking: string[] = raw ? JSON.parse(raw) : [];
      const currentBlocking = new Set(items.filter((i) => i.level === "block").map((i) => i.key));
      const resolved = prevBlocking.filter((k) => !currentBlocking.has(k));
      if (resolved.length > 0) {
        setJustResolvedKeys(new Set(resolved));
        // Tự fade sau 12s để không gây nhiễu phiên làm việc dài
        const t = window.setTimeout(() => setJustResolvedKeys(new Set()), 12_000);
        return () => window.clearTimeout(t);
      }
    } catch {
      /* ignore storage errors */
    }
  }, [items]);
  // Lưu snapshot block hiện tại mỗi khi items thay đổi (chỉ lưu sau khi đã so sánh xong lần đầu của render)
  useEffect(() => {
    try {
      const currentBlocking = items.filter((i) => i.level === "block").map((i) => i.key);
      sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(currentBlocking));
      persistedRef.current = true;
    } catch {
      /* ignore */
    }
  }, [items]);

  // ── Force-release qualification: chỉ cho phép khi block DUY NHẤT là NM stale ──
  const staleBlock = useMemo(
    () => blocking.find((b) => b.key === "nm-stock" && (b.staleHours ?? 0) > 48),
    [blocking],
  );
  const onlyStaleBlocks = blocking.length > 0 && blocking.every((b) => b.key === "nm-stock");
  const canForceRelease = !!staleBlock && onlyStaleBlocks && rbacCanForce;

  const requiredTier: Tier = useMemo(() => {
    const h = staleBlock?.staleHours ?? 0;
    if (h > 96) return "ceo";
    if (h > 72) return "director";
    return "sc_manager";
  }, [staleBlock]);

  const [forceOpen, setForceOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);

  const summaryText = blocking.length > 0
    ? `Không thể chạy: ${blocking.length} mục bị chặn`
    : warnings.length > 0
    ? `Chạy với ${warnings.length} cảnh báo. Kết quả có thể thiếu chính xác.`
    : "Tất cả sẵn sàng ✅. Có thể chạy DRP.";

  const handleApproveForceRelease = () => {
    if (!selectedTier) return;
    toast.success(`Force-release đã duyệt bởi ${TIER_LABEL[selectedTier]}`, {
      description: `DRP sẽ chạy với dữ liệu NM cũ (${staleBlock?.staleHours}h). Sai số ước tính ±15%.`,
    });
    setForceOpen(false);
    setSelectedTier(null);
    onRun();
  };

  const handleRouteUp = () => {
    if (!staleBlock) return;
    toast.info(`Đã gửi yêu cầu Force-release lên ${TIER_LABEL[requiredTier]}`, {
      description: `NM ${staleBlock.staleNmName ?? ""} cũ ${staleBlock.staleHours}h · Cần ${TIER_LABEL[requiredTier]} duyệt.`,
    });
    setForceOpen(false);
  };

  return (
    <div className="rounded-card border border-surface-3 bg-surface-1 p-5 space-y-4">
      {/* Auto-run failed banner */}
      {autoRunFailed && (
        <div className="rounded-card border border-danger/40 bg-danger-bg/40 p-3 flex items-start gap-2.5">
          <AlertOctagon className="h-5 w-5 text-danger shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-table font-semibold text-danger">
              ⚠️ DRP đêm qua KHÔNG chạy được
            </div>
            <div className="text-table-sm text-text-2 mt-0.5">{autoRunFailed.reason}</div>
            {autoRunFailed.fixHref && (
              <a
                href={autoRunFailed.fixHref}
                className="text-table-sm font-medium text-danger inline-flex items-center gap-1 mt-1 hover:underline"
              >
                Xử lý <ArrowRight className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="text-h3 font-display font-semibold text-text-1">
          Bước 1/3 — Kiểm tra dữ liệu trước khi chạy
        </div>
        <div className="text-table-sm text-text-3 mt-0.5">
          Đảm bảo nguồn dữ liệu đầu vào đầy đủ và mới nhất.
        </div>
      </div>

      {/* Table */}
      <div className="rounded border border-surface-3 bg-surface-0 overflow-hidden">
        <table className="w-full text-table-sm">
          <thead className="bg-surface-1 border-b border-surface-3">
            <tr className="text-text-3 text-caption uppercase">
              <th className="text-left px-3 py-2 font-semibold">Kiểm tra</th>
              <th className="text-left px-3 py-2 font-semibold">Kết quả</th>
              <th className="text-right px-3 py-2 font-semibold">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const justResolved = justResolvedKeys.has(it.key) && it.level !== "block";
              return (
              <tr
                key={it.key}
                className={cn(
                  "border-t border-surface-3/60 transition-colors",
                  it.level === "block" && "bg-danger-bg/20",
                  it.level === "warn" && "bg-warning-bg/15",
                  justResolved && "bg-success-bg/40 ring-2 ring-success/50 animate-pulse-soft"
                )}
              >
                <td className="px-3 py-2 font-medium text-text-1">
                  <div className="flex items-center gap-1.5">
                    {it.label}
                    {justResolved && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success-bg/60 px-1.5 py-0.5 text-[10px] font-semibold text-success"
                        title="Điều kiện này vừa được xử lý từ trang khác"
                      >
                        <CheckCircle2 className="h-2.5 w-2.5" /> Vừa xử lý
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-text-2">
                  {it.result}
                  {it.detail && (
                    <div className="text-caption text-text-3 mt-0.5">{it.detail}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex items-center gap-2 justify-end">
                    {it.fixHref && it.level !== "ok" && (
                      <Link
                        to={it.fixHref}
                        title={`Đi tới ${it.fixHref} để xử lý "${it.label}"`}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-button border px-2 py-1 text-[11px] font-semibold shrink-0",
                          it.level === "block"
                            ? "border-danger/40 bg-danger text-primary-foreground hover:opacity-90"
                            : "border-warning/40 bg-warning-bg text-warning hover:bg-warning-bg/80"
                        )}
                      >
                        {it.fixLabel ?? "Mở trang xử lý"}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      {levelIcon(it.level)}
                      <span className={cn(
                        "text-caption font-medium",
                        it.level === "ok" && "text-success",
                        it.level === "warn" && "text-warning",
                        it.level === "block" && "text-danger"
                      )}>
                        {levelLabel(it.level)}
                      </span>
                    </span>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-surface-3 bg-surface-1/60">
            <tr>
              <td colSpan={3} className="px-3 py-2 text-table-sm">
                <span className="font-semibold text-text-1">Kết quả:</span>{" "}
                <span className="text-text-2">
                  {okCount}/{items.length} sẵn sàng
                  {warnings.length > 0 && ` · ${warnings.length} cảnh báo`}
                  {blocking.length > 0 && ` · ${blocking.length} bị chặn`}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary + actions */}
      <div className={cn(
        "rounded border p-3 text-table-sm",
        blocking.length > 0 && "border-danger/40 bg-danger-bg/30 text-danger",
        blocking.length === 0 && warnings.length > 0 && "border-warning/40 bg-warning-bg/30 text-warning",
        blocking.length === 0 && warnings.length === 0 && "border-success/40 bg-success-bg/30 text-success"
      )}>
        {summaryText}
      </div>

      {/* ── BLOCKING BANNER — danh sách điều kiện chặn + nút điều hướng trực tiếp ── */}
      {blocking.length > 0 && (
        <div className="rounded-md border border-danger/40 bg-danger-bg/30 p-3 space-y-2">
          <div className="flex items-center gap-2 text-table-sm font-semibold text-danger">
            <AlertOctagon className="h-4 w-4" />
            Không thể chạy DRP — {blocking.length} điều kiện đang chặn
          </div>
          <ul className="space-y-1.5">
            {blocking.map((b) => (
              <li
                key={b.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-danger/20 bg-surface-1/60 px-2.5 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-table-sm font-medium text-text-1">{b.label}</div>
                  <div className="text-table-xs text-text-2 truncate">{b.result}</div>
                </div>
                {b.fixHref ? (
                  <Link
                    to={b.fixHref}
                    title={`Đi tới ${b.fixHref} để xử lý "${b.label}"`}
                    className="inline-flex items-center gap-1 rounded-button border border-danger/40 bg-danger text-primary-foreground px-2.5 py-1 text-table-xs font-semibold hover:opacity-90 shrink-0"
                  >
                    {b.fixLabel ?? "Mở trang xử lý"}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <span className="text-table-xs text-text-3 italic shrink-0">Chưa có link xử lý</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-button border border-surface-3 bg-surface-2 px-3.5 py-2 text-table-sm text-text-2 hover:text-text-1"
          >
            ← Quay lại hoàn tất dữ liệu
          </button>
        )}
        {canForceRelease && (
          <button
            onClick={() => { setSelectedTier(null); setForceOpen(true); }}
            className="inline-flex items-center gap-2 rounded-button border border-danger/40 bg-danger-bg/40 px-3.5 py-2 text-table-sm font-semibold text-danger hover:bg-danger-bg/60"
            title="Chạy DRP cưỡng chế dù NM dữ liệu cũ — yêu cầu phê duyệt nhiều cấp"
          >
            <ShieldAlert className="h-4 w-4" /> Giải phóng cưỡng chế…
          </button>
        )}
        <button
          onClick={onRun}
          disabled={!canRun}
          title={!canRun ? "Cần xử lý mục bị chặn trước khi chạy" : ""}
          className={cn(
            "inline-flex items-center gap-2 rounded-button px-5 py-2 text-table font-semibold shadow-sm transition-all",
            canRun && warnings.length === 0 && "bg-success text-primary-foreground hover:opacity-90",
            canRun && warnings.length > 0 && "bg-warning text-primary-foreground hover:opacity-90",
            !canRun && "bg-surface-3 text-text-3 cursor-not-allowed"
          )}
        >
          <Play className="h-4 w-4" /> Chạy DRP ngay
        </button>
      </div>

      {/* ── Force-Release Dialog (3-tier approval) ── */}
      <Dialog open={forceOpen} onOpenChange={setForceOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <ShieldAlert className="h-5 w-5" /> Giải phóng cưỡng chế DRP
            </DialogTitle>
            <DialogDescription className="text-text-2">
              {staleBlock && (
                <>
                  NM <span className="font-semibold text-text-1">{staleBlock.staleNmName ?? "—"}</span>{" "}
                  dữ liệu cũ <span className="font-semibold text-danger">{staleBlock.staleHours}h</span>.
                  DRP sẽ chạy với data cũ. Rủi ro: sai số ước tính ±15%.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <div className="text-table-sm font-semibold text-text-1">Chọn cấp phê duyệt:</div>

            {(["sc_manager", "director", "ceo"] as Tier[]).map((tier, idx) => {
              const tierIdx = idx; // 0,1,2
              const reqIdx = requiredTier === "sc_manager" ? 0 : requiredTier === "director" ? 1 : 2;
              // Đủ tier theo mức stale + đủ quyền RBAC tương ứng
              const rbacOk =
                tier === "sc_manager" ? rbacCanForce :
                tier === "director" ? canForceReleaseDirector : canForceReleaseCeo;
              const allowed = tierIdx >= reqIdx && rbacOk;
              const isSelected = selectedTier === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  disabled={!allowed}
                  onClick={() => setSelectedTier(tier)}
                  className={cn(
                    "w-full text-left rounded-card border p-3 transition-all",
                    isSelected && "border-primary bg-primary/5",
                    !isSelected && allowed && "border-surface-3 hover:border-primary/40 hover:bg-surface-2",
                    !allowed && "border-surface-3/60 bg-surface-2/40 opacity-50 cursor-not-allowed",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-text-1">
                      Tier {tierIdx + 1} — {TIER_LABEL[tier]}
                    </div>
                    {!allowed && (
                      <span className="text-caption text-text-3">
                        {tierIdx < (requiredTier === "sc_manager" ? 0 : requiredTier === "director" ? 1 : 2)
                          ? "Không đủ tier cho mức stale này"
                          : `Vai trò ${user.role} không có quyền duyệt tier này`}
                      </span>
                    )}
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="text-caption text-text-3 mt-0.5">
                    {tier === "sc_manager" && "DRP chạy với cảnh báo · áp dụng khi stale ≤ 72h."}
                    {tier === "director" && "Bắt buộc khi stale > 72h · audit log đính kèm."}
                    {tier === "ceo" && "Bắt buộc khi stale > 96h · cảnh báo cao nhất."}
                  </div>
                </button>
              );
            })}

            {requiredTier !== "sc_manager" && (
              <div className="rounded-card border border-warning/40 bg-warning-bg/30 px-3 py-2 text-caption text-warning">
                Mức stale hiện tại yêu cầu tối thiểu <strong>{TIER_LABEL[requiredTier]}</strong>. Bạn có thể gửi
                yêu cầu lên cấp đó nếu chưa có quyền.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setForceOpen(false)}>Hủy</Button>
            {requiredTier !== "sc_manager" && (
              <Button variant="secondary" onClick={handleRouteUp}>
                Gửi lên {TIER_LABEL[requiredTier]}
              </Button>
            )}
            <Button
              variant="destructive"
              disabled={!selectedTier}
              onClick={handleApproveForceRelease}
            >
              Phê duyệt & Chạy DRP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DrpPreflight;
