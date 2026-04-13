import { useWorkspace } from "@/components/WorkspaceContext";
import { StatusChip } from "@/components/StatusChip";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExceptionsSection() {
  const { exceptions } = useWorkspace();
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-5 gap-4">
      {/* Exception Cards — 3 cols */}
      <div className="col-span-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-section-header text-text-1">Exceptions</h2>
          <button className="text-primary text-table-sm font-medium hover:underline inline-flex items-center gap-1">
            Xem tất cả <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-3">
          {exceptions.map((ex) => (
            <div
              key={ex.id}
              className={`rounded-card border-l-4 bg-surface-2 border border-surface-3 p-4 cursor-pointer hover:bg-surface-3 transition-colors ${
                ex.typeColor === "danger" ? "border-l-danger" : ex.typeColor === "warning" ? "border-l-warning" : "border-l-info"
              }`}
              onClick={() => navigate(ex.url)}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <StatusChip status={ex.typeColor} label={ex.typeLabel} />
                    {ex.sku && <span className="text-table-sm text-text-3">SKU: {ex.sku}</span>}
                  </div>
                  <p className="text-table text-text-1">
                    {ex.location && <span className="font-display font-bold">{ex.location}</span>}
                    {ex.location && ex.risk && " "}
                    {ex.risk && (
                      <>
                        {ex.location ? "" : <span className="font-display font-bold">{ex.sku}</span>}
                        {ex.risk && <> • Risk <span className="font-display font-bold text-danger">{ex.risk}</span></>}
                      </>
                    )}
                    {!ex.risk && !ex.location && (
                      <span className="font-display font-bold">{ex.sku} tăng 3 tuần</span>
                    )}
                  </p>
                  {(ex.fixCost || ex.roi) && (
                    <div className="flex items-center gap-3 text-table-sm">
                      {ex.fixCost && <span className="text-success font-medium">Fix {ex.fixCost}</span>}
                      {ex.roi && <span className="text-text-2">ROI {ex.roi}</span>}
                    </div>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-text-3 shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Trust Block — 2 cols */}
      <div className="col-span-2">
        <h2 className="font-display text-section-header text-text-1 mb-3">Curator Intelligence</h2>
        <div className="rounded-card border border-info bg-info-bg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-info" />
            <span className="text-table-header uppercase text-info font-semibold tracking-wider">Đề xuất ưu tiên</span>
          </div>
          <h3 className="font-display text-section-header text-text-1">Lateral Transfer</h3>
          <p className="text-table text-text-2">
            Đề xuất: lateral 220m² CN-DN→BD.{" "}
            Confidence <span className="font-display font-bold text-text-1">88%</span>.
          </p>

          {/* Trust indicators */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2 text-table-sm">
              <Shield className="h-3.5 w-3.5 text-info" />
              <span className="text-text-2">Evidence: 3 tuần excess ổn định.</span>
            </div>
            <div className="flex items-center gap-2 text-table-sm">
              <Shield className="h-3.5 w-3.5 text-success" />
              <span className="text-text-2">Reversible: cancel TO trước ship.</span>
            </div>
          </div>

          <Button className="w-full bg-gradient-primary text-primary-foreground">
            Áp dụng ngay
          </Button>
        </div>
      </div>
    </div>
  );
}
