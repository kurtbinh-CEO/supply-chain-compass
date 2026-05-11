/**
 * DrpEnginePanel — chọn Demand Version LOCKED + Objective → "Chạy phân bổ".
 * Invoke edge function drp-engine. Hiển thị tóm tắt kết quả.
 * KHÔNG động vào Layer 2/3 / ContainerPlanning.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, CheckCircle2 } from "lucide-react";
import { useDemandVersions } from "@/hooks/useDemandVersions";
import { useUserTenantId } from "@/hooks/useUserTenantId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Objective = "LEADTIME_SHORTEST" | "LOWEST_COST";

interface RunResult {
  plan_run_id: string;
  fill_rate: number;
  total_demand: number;
  total_allocated: number;
  lost_sales_qty: number;
  exception_count: number;
  result_rows: number;
}

export function DrpEnginePanel() {
  const { data: tenantId } = useUserTenantId();
  const { versions } = useDemandVersions();
  const lockedVersions = useMemo(() => versions.filter(v => v.status === "LOCKED"), [versions]);
  const [versionId, setVersionId] = useState<string>("");
  const [objective, setObjective] = useState<Objective>("LEADTIME_SHORTEST");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  const run = async () => {
    if (!tenantId) { toast.error("Chưa xác định tenant"); return; }
    if (!versionId) { toast.error("Chọn phiên bản nhu cầu LOCKED"); return; }
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("drp-engine", {
        body: {
          tenant_id: tenantId,
          demand_version_id: versionId,
          allocation_objective: objective,
          run_name: `DRP-${new Date().toISOString().slice(0, 16).replace(/[-T:]/g, "")}`,
        },
      });
      if (error) throw error;
      const r = data as RunResult;
      setResult(r);
      toast.success(`Phân bổ xong — Fill rate ${(r.fill_rate * 100).toFixed(1)}%`);
    } catch (e) {
      toast.error(`Không chạy được: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="mb-4 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Play className="w-4 h-4 text-primary" />
          DRP Engine — Chạy phân bổ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Phiên bản nhu cầu (LOCKED)</label>
            <Select value={versionId} onValueChange={setVersionId}>
              <SelectTrigger><SelectValue placeholder="Chọn phiên bản…" /></SelectTrigger>
              <SelectContent>
                {lockedVersions.length === 0 && (
                  <SelectItem value="__none" disabled>Chưa có phiên bản LOCKED</SelectItem>
                )}
                {lockedVersions.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Mục tiêu phân bổ</label>
            <Select value={objective} onValueChange={(v) => setObjective(v as Objective)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LEADTIME_SHORTEST">Lead-time ngắn nhất</SelectItem>
                <SelectItem value="LOWEST_COST">Chi phí thấp nhất</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={run} disabled={running || !versionId} className="w-full">
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Chạy phân bổ
            </Button>
          </div>
        </div>

        {result && (
          <div className="rounded-lg border bg-muted/30 p-3 flex flex-wrap items-center gap-3 text-sm">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <Badge variant="secondary">Run {result.plan_run_id.slice(0, 8)}</Badge>
            <span><b>Fill rate:</b> {(result.fill_rate * 100).toFixed(1)}%</span>
            <span><b>Demand:</b> {Math.round(result.total_demand).toLocaleString("vi-VN")}</span>
            <span><b>Allocated:</b> {Math.round(result.total_allocated).toLocaleString("vi-VN")}</span>
            <span><b>Lost sales:</b> {Math.round(result.lost_sales_qty).toLocaleString("vi-VN")}</span>
            <span><b>Exceptions:</b> {result.exception_count}</span>
            <span className="text-muted-foreground">({result.result_rows} dòng kết quả)</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
