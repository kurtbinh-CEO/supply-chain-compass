/**
 * DemandVersionSelector — Chọn phiên bản FC/AOP từ demand_versions.
 * - Badge màu theo status: DRAFT (xanh dương), LOCKED (xanh lá + khóa), ARCHIVED (xám).
 * - Nút "Khóa phiên bản" hiện khi DRAFT → confirm → lock.
 */
import { useEffect, useMemo, useState } from "react";
import { Lock, Loader2, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDemandVersions, type DemandVersion } from "@/hooks/useDemandVersions";

interface Props {
  selectedId: string | null;
  onChange: (v: DemandVersion | null) => void;
}

const statusBadge = (s: DemandVersion["status"]) => {
  if (s === "LOCKED")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-bg text-success px-2 py-0.5 text-caption font-medium">
        <Lock className="h-3 w-3" /> LOCKED
      </span>
    );
  if (s === "ARCHIVED")
    return (
      <span className="inline-flex items-center rounded-full bg-surface-3 text-text-3 px-2 py-0.5 text-caption font-medium">
        ARCHIVED
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-info-bg text-info px-2 py-0.5 text-caption font-medium">
      DRAFT
    </span>
  );
};

export function DemandVersionSelector({ selectedId, onChange }: Props) {
  const { versions, loading, lockVersion } = useDemandVersions();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const visible = useMemo(
    () => versions.filter((v) => v.status !== "ARCHIVED" || v.id === selectedId),
    [versions, selectedId],
  );

  // Auto-select first DRAFT (or first available) once loaded
  useEffect(() => {
    if (loading || selectedId) return;
    if (versions.length === 0) return;
    const draft = versions.find((v) => v.status === "DRAFT");
    onChange(draft ?? versions[0]);
  }, [loading, selectedId, versions, onChange]);

  const selected = versions.find((v) => v.id === selectedId) ?? null;

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 text-text-3 text-table-sm">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải phiên bản…
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Select
        value={selectedId ?? undefined}
        onValueChange={(id) => {
          const v = versions.find((x) => x.id === id) ?? null;
          onChange(v);
        }}
      >
        <SelectTrigger className="h-8 w-[220px]">
          <SelectValue placeholder="Chọn phiên bản…" />
        </SelectTrigger>
        <SelectContent>
          {visible.length === 0 && (
            <div className="px-2 py-1.5 text-table-sm text-text-3">Chưa có phiên bản</div>
          )}
          {visible.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              <span className="inline-flex items-center gap-2">
                <span>{v.name}</span>
                {statusBadge(v.status)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selected && statusBadge(selected.status)}

      {selected?.status === "DRAFT" && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          onClick={() => setConfirmOpen(true)}
          disabled={lockVersion.isPending}
        >
          <Lock className="h-3.5 w-3.5" />
          Khóa phiên bản
        </Button>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Khóa phiên bản "{selected?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Sau khi khóa, phiên bản chuyển sang trạng thái LOCKED và chỉ có thể xem. Mọi thao
              tác chỉnh sửa (nhập FC, nhập thực tế, B2B…) sẽ bị vô hiệu hóa cho phiên bản này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!selected) return;
                await lockVersion.mutateAsync(selected.id);
                setConfirmOpen(false);
              }}
            >
              Khóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
