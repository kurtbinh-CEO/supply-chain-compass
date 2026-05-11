import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { useActivityLog } from "@/components/ActivityLogContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserTenantId } from "@/hooks/useUserTenantId";

function periodFor(type: "daily" | "monthly") {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  if (type === "monthly") return `monthly:${yyyy}-${mm}`;
  const dd = String(d.getDate()).padStart(2, "0");
  return `daily:${yyyy}-${mm}-${dd}`;
}

export type WorkflowType = "daily" | "monthly" | null;

export interface WorkflowStep {
  label: string;
  routes: string[];
  status: "done" | "active" | "future" | "locked";
  description: string;
  completedAt?: number; // timestamp
}

/* M1 — Daily 4 bước (gộp Đồng bộ → Tồn kho; bỏ Phân bổ/Đóng hàng/Phản hồi) */
const dailySteps: Omit<WorkflowStep, "status" | "completedAt">[] = [
  { label: "Kiểm tra data",  routes: ["/inventory", "/supply"], description: "Tồn NM + CN tươi (< 24h)" },
  { label: "CN điều chỉnh",  routes: ["/demand-weekly"],        description: "SC Manager duyệt ±30%" },
  { label: "Xem DRP",        routes: ["/drp"],                  description: "0 exception còn pending" },
  { label: "Duyệt PO",       routes: ["/orders"],               description: "0 PO chờ duyệt" },
];

/* M1 — Monthly 6 bước */
const monthlySteps: Omit<WorkflowStep, "status" | "completedAt">[] = [
  { label: "Nhập nhu cầu",   routes: ["/demand"],       description: "FC 2 cấp + B2B" },
  { label: "Đồng thuận S&OP", routes: ["/sop"],          description: "Lock demand tháng" },
  { label: "Cam kết NM",     routes: ["/hub"],          description: "Hard / Firm / Soft" },
  { label: "Hub ảo",         routes: ["/hub"],          description: "Available formula" },
  { label: "Gap",            routes: ["/gap-scenario"], description: "Khoảng cách cung/cầu" },
  { label: "Kịch bản",       routes: ["/gap-scenario"], description: "4 kịch bản đối phó" },
];

export const feedbackLoops = [
  { from: "/monitoring", to: "/inventory",    label: "MAPE → Tính lại SS Hub" },
  { from: "/monitoring", to: "/drp",          label: "Tin cậy → Điều chỉnh SS CN" },
  { from: "/orders",     to: "/hub",          label: "PO đã phát hành → Hub ảo" },
  { from: "/orders",     to: "/gap-scenario", label: "Phát hành → Cập nhật Gap" },
];

interface WorkflowContextType {
  workflowType: WorkflowType;
  currentStepIndex: number;
  steps: WorkflowStep[];
  isBarVisible: boolean;
  completed: boolean;
  sessionStartTime: number | null;
  completedSteps: number[];
  startWorkflow: (type: "daily" | "monthly") => void;
  closeWorkflow: () => void;
  goToStep: (index: number) => boolean; // returns false if locked
  completeCurrentStep: () => void;
  nextStep: () => void;
  isRouteInWorkflow: (path: string) => boolean;
  isStepUnlocked: (index: number) => boolean;
  // Navigation guard
  showLeaveConfirm: boolean;
  pendingNavigation: string | null;
  requestLeave: (path: string) => boolean; // returns true if allowed, false if needs confirm
  confirmLeave: () => void;
  cancelLeave: () => void;
}

const WorkflowContext = createContext<WorkflowContextType>({
  workflowType: null,
  currentStepIndex: 0,
  steps: [],
  isBarVisible: false,
  completed: false,
  sessionStartTime: null,
  completedSteps: [],
  startWorkflow: () => {},
  closeWorkflow: () => {},
  goToStep: () => false,
  completeCurrentStep: () => {},
  nextStep: () => {},
  isRouteInWorkflow: () => false,
  isStepUnlocked: () => false,
  showLeaveConfirm: false,
  pendingNavigation: null,
  requestLeave: () => true,
  confirmLeave: () => {},
  cancelLeave: () => {},
});

export const useWorkflow = () => useContext(WorkflowContext);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const { addEntry } = useActivityLog();
  const [workflowType, setWorkflowType] = useState<WorkflowType>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const { data: tenantId } = useUserTenantId();
  const [userId, setUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const planningPeriodRef = useRef<string | null>(null);

  // Resolve auth user once
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user?.id ?? null);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  // Resume the latest active session on mount
  useEffect(() => {
    if (hydrated || !tenantId || !userId) return;
    let cancelled = false;
    (async () => {
      const todayDaily = periodFor("daily");
      const thisMonthly = periodFor("monthly");
      const { data } = await supabase
        .from("workflow_sessions")
        .select("planning_period, current_step, steps_completed, updated_at")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .in("planning_period", [todayDaily, thisMonthly])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data && data.current_step != null) {
        const type: "daily" | "monthly" = data.planning_period.startsWith("monthly") ? "monthly" : "daily";
        const idx = parseInt(data.current_step, 10);
        const completed = (data.steps_completed ?? []).map((s: string) => parseInt(s, 10)).filter((n: number) => !Number.isNaN(n));
        const total = (type === "daily" ? dailySteps : monthlySteps).length;
        // Skip resume if everything already done
        if (completed.length < total) {
          planningPeriodRef.current = data.planning_period;
          setWorkflowType(type);
          setCurrentStepIndex(Number.isNaN(idx) ? 0 : idx);
          setCompletedSteps(completed);
          setSessionStartTime(Date.now());
        }
      }
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [tenantId, userId, hydrated]);

  const rawSteps = workflowType === "daily" ? dailySteps : workflowType === "monthly" ? monthlySteps : [];

  const isStepUnlocked = useCallback((index: number) => {
    if (index === 0) return true;
    // Step N is unlocked only if step N-1 is completed
    return completedSteps.includes(index - 1);
  }, [completedSteps]);

  const steps: WorkflowStep[] = rawSteps.map((s, i) => ({
    ...s,
    status: completed
      ? "done" as const
      : completedSteps.includes(i)
        ? "done" as const
        : i === currentStepIndex
          ? "active" as const
          : !isStepUnlocked(i)
            ? "locked" as const
            : "future" as const,
  }));

  const isBarVisible = workflowType !== null;

  // Persist on every workflow state change (after hydration)
  useEffect(() => {
    if (!hydrated || !tenantId || !userId || !workflowType) return;
    const period = planningPeriodRef.current ?? periodFor(workflowType);
    planningPeriodRef.current = period;
    void supabase.from("workflow_sessions").upsert({
      tenant_id: tenantId,
      user_id: userId,
      planning_period: period,
      current_step: String(currentStepIndex),
      steps_completed: completedSteps.map(String),
    }, { onConflict: "tenant_id,user_id,planning_period" });
  }, [hydrated, tenantId, userId, workflowType, currentStepIndex, completedSteps]);

  const startWorkflow = useCallback((type: "daily" | "monthly") => {
    planningPeriodRef.current = periodFor(type);
    setWorkflowType(type);
    setCurrentStepIndex(0);
    setCompleted(false);
    setCompletedSteps([]);
    setSessionStartTime(Date.now());
    addEntry({
      type: "workflow",
      route: type === "daily" ? "/inventory" : "/demand",
      user: "Người dùng",
      message: `Bắt đầu phiên ${type === "daily" ? "Vận hành ngày" : "Kế hoạch tháng"}`,
    });
  }, [addEntry]);

  const closeWorkflow = useCallback(() => {
    if (workflowType) {
      addEntry({
        type: "workflow",
        route: "/workspace",
        user: "Người dùng",
        message: `Đóng phiên ${workflowType === "daily" ? "Vận hành ngày" : "Kế hoạch tháng"} (chưa hoàn tất)`,
      });
    }
    setWorkflowType(null);
    setCurrentStepIndex(0);
    setCompleted(false);
    setCompletedSteps([]);
    setSessionStartTime(null);
    setShowLeaveConfirm(false);
    setPendingNavigation(null);
  }, [workflowType, addEntry]);

  const goToStep = useCallback((index: number) => {
    if (index === 0 || completedSteps.includes(index - 1)) {
      setCurrentStepIndex(index);
      setCompleted(false);
      return true;
    }
    return false;
  }, [completedSteps]);

  const completeCurrentStep = useCallback(() => {
    setCompletedSteps(prev => prev.includes(currentStepIndex) ? prev : [...prev, currentStepIndex]);
  }, [currentStepIndex]);

  const nextStep = useCallback(() => {
    const stepLabel = rawSteps[currentStepIndex]?.label || "";
    const stepRoute = rawSteps[currentStepIndex]?.routes[0] || "/workspace";
    // Mark current step as done
    setCompletedSteps(prev => prev.includes(currentStepIndex) ? prev : [...prev, currentStepIndex]);
    addEntry({
      type: "workflow",
      route: stepRoute,
      user: "Người dùng",
      message: `Hoàn tất bước "${stepLabel}" (${currentStepIndex + 1}/${rawSteps.length})`,
    });
    const max = rawSteps.length;
    if (currentStepIndex < max - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      setCompleted(true);
      const wfType = workflowType;
      addEntry({
        type: "workflow",
        route: "/workspace",
        user: "Người dùng",
        message: `✅ Hoàn tất phiên ${wfType === "daily" ? "Vận hành ngày" : "Kế hoạch tháng"} — ${rawSteps.length}/${rawSteps.length} bước`,
      });
      setTimeout(() => {
        setWorkflowType(null);
        setCurrentStepIndex(0);
        setCompleted(false);
        setCompletedSteps([]);
        setSessionStartTime(null);
      }, 10000);
    }
  }, [currentStepIndex, rawSteps, workflowType, addEntry]);

  const isRouteInWorkflow = useCallback(
    (path: string) => rawSteps.some((s) => s.routes.includes(path)),
    [rawSteps]
  );

  // Navigation guard
  const requestLeave = useCallback((path: string) => {
    if (!workflowType) return true;
    // Allow if path is in workflow
    if (rawSteps.some(s => s.routes.includes(path))) return true;
    // Allow workspace
    if (path === "/workspace" || path === "/") return true;
    // Otherwise show confirmation
    setShowLeaveConfirm(true);
    setPendingNavigation(path);
    return false;
  }, [workflowType, rawSteps]);

  const confirmLeave = useCallback(() => {
    if (workflowType) {
      addEntry({
        type: "workflow",
        route: "/workspace",
        user: "Người dùng",
        message: `Rời khỏi phiên ${workflowType === "daily" ? "Vận hành ngày" : "Kế hoạch tháng"} (${completedSteps.length}/${rawSteps.length} bước)`,
      });
    }
    setShowLeaveConfirm(false);
    setPendingNavigation(null);
    setWorkflowType(null);
    setCurrentStepIndex(0);
    setCompleted(false);
    setCompletedSteps([]);
    setSessionStartTime(null);
  }, [workflowType, completedSteps.length, rawSteps.length, addEntry]);

  const cancelLeave = useCallback(() => {
    setShowLeaveConfirm(false);
    setPendingNavigation(null);
  }, []);

  return (
    <WorkflowContext.Provider
      value={{
        workflowType, currentStepIndex, steps, isBarVisible, completed,
        sessionStartTime, completedSteps,
        startWorkflow, closeWorkflow, goToStep, completeCurrentStep, nextStep,
        isRouteInWorkflow, isStepUnlocked,
        showLeaveConfirm, pendingNavigation, requestLeave, confirmLeave, cancelLeave,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}
