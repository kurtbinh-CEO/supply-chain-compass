import { Check } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader } from "@/components/ScreenShell";
import { useThemeMode } from "@/components/ThemeContext";
import {
  useSidebarState,
  type SidebarStyle,
  type LayoutDensity,
  type Direction,
} from "@/components/SidebarContext";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
 * AppearancePage — picker visual cho 4 nhóm preference:
 *   1. Theme       (system / light / dark)
 *   2. Sidebar     (inset / floating / sidebar)
 *   3. Layout      (default / compact / full)
 *   4. Direction   (ltr / rtl)
 *
 * Mỗi option là một card có mockup mini (chỉ dùng div + bg color, không cần SVG)
 * + label dưới cùng + tick xanh khi đang chọn. State persist qua context.
 * ─────────────────────────────────────────────────────────────────────────── */

interface OptionCardProps {
  selected: boolean;
  onSelect: () => void;
  label: string;
  /** Mockup mini bên trong card — pass JSX tự do để mỗi option có visual riêng. */
  preview: React.ReactNode;
}

function OptionCard({ selected, onSelect, label, preview }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col items-center gap-2 focus:outline-none"
      aria-pressed={selected}
    >
      <div
        className={cn(
          "relative w-full aspect-[4/3] rounded-card border-2 p-2 transition-all",
          selected
            ? "border-primary ring-2 ring-primary/20"
            : "border-surface-3 hover:border-text-3",
        )}
      >
        {preview}
        {selected && (
          <span className="absolute -top-2 -right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
      </div>
      <span
        className={cn(
          "text-body font-medium",
          selected ? "text-text-1" : "text-text-2",
        )}
      >
        {label}
      </span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="font-display text-h4 font-semibold text-text-1">{title}</h3>
      <div className="grid grid-cols-3 gap-4 max-w-2xl">{children}</div>
    </section>
  );
}

/* ── Mockup primitives — div + bg để visualize từng option ── */
function ThemeMockup({ variant }: { variant: "system" | "light" | "dark" }) {
  // System = nửa light/nửa dark; light = bg trắng; dark = bg đen.
  const isDark = variant === "dark";
  const isSystem = variant === "system";
  const bg = isDark ? "bg-slate-900" : "bg-slate-100";
  const card = isDark ? "bg-slate-800" : "bg-white";
  return (
    <div className={cn("relative h-full w-full overflow-hidden rounded-md", bg)}>
      {isSystem && (
        <div className="absolute inset-y-0 left-0 w-1/2 bg-slate-300" />
      )}
      <div className="relative h-full w-full p-1.5 flex flex-col gap-1">
        <div className={cn("h-1.5 w-8 rounded-full", isDark ? "bg-slate-600" : "bg-slate-400")} />
        <div className="flex-1 grid grid-cols-2 gap-1">
          <div className={cn("rounded-sm", card)} />
          <div className={cn("rounded-sm", card)} />
        </div>
        <div className={cn("h-2 w-full rounded-sm", card)} />
      </div>
    </div>
  );
}

function SidebarMockup({ variant }: { variant: SidebarStyle }) {
  const wrapper = "absolute inset-1 flex gap-1";
  // Inset: sidebar bo + content lớn liền cạnh.
  // Floating: sidebar tách rời shadow, content full.
  // Sidebar: sidebar sát trái không bo.
  if (variant === "inset") {
    return (
      <div className="relative h-full w-full bg-slate-200 rounded-md">
        <div className={wrapper}>
          <div className="w-1/3 rounded-sm bg-slate-400" />
          <div className="flex-1 rounded-sm bg-slate-300" />
        </div>
      </div>
    );
  }
  if (variant === "floating") {
    return (
      <div className="relative h-full w-full bg-slate-100 rounded-md">
        <div className="absolute inset-y-1 left-1 w-[28%] rounded-sm bg-slate-400 shadow-md" />
        <div className="absolute inset-y-1 left-[34%] right-1 rounded-sm bg-slate-200" />
      </div>
    );
  }
  // sidebar (default)
  return (
    <div className="relative h-full w-full bg-slate-100 rounded-md overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-1/4 bg-slate-400" />
      <div className="absolute inset-y-0 left-1/4 right-0 bg-slate-200" />
    </div>
  );
}

function LayoutMockup({ variant }: { variant: LayoutDensity }) {
  // Default: sidebar đầy + content có padding lớn.
  // Compact: sidebar mỏng + content padding ít.
  // Full: chỉ content full-bleed.
  if (variant === "compact") {
    return (
      <div className="relative h-full w-full bg-slate-100 rounded-md overflow-hidden flex">
        <div className="w-2 bg-slate-500 flex flex-col items-center gap-0.5 py-1">
          <div className="h-1 w-1 rounded-full bg-slate-300" />
          <div className="h-1 w-1 rounded-full bg-slate-300" />
          <div className="h-1 w-1 rounded-full bg-slate-300" />
        </div>
        <div className="flex-1 p-1 space-y-1">
          <div className="h-1.5 w-full rounded-full bg-slate-400" />
          <div className="grid grid-cols-2 gap-1 h-[60%]">
            <div className="rounded-sm bg-slate-300" />
            <div className="rounded-sm bg-slate-300" />
          </div>
        </div>
      </div>
    );
  }
  if (variant === "full") {
    return (
      <div className="relative h-full w-full bg-slate-100 rounded-md overflow-hidden p-1.5 space-y-1">
        <div className="h-1.5 w-full rounded-full bg-slate-400" />
        <div className="grid grid-cols-2 gap-1 h-[70%]">
          <div className="rounded-sm bg-slate-300" />
          <div className="rounded-sm bg-slate-300" />
        </div>
      </div>
    );
  }
  // default
  return (
    <div className="relative h-full w-full bg-primary/10 rounded-md overflow-hidden flex">
      <div className="w-1/4 bg-primary" />
      <div className="flex-1 p-1 space-y-1">
        <div className="h-1.5 w-full rounded-full bg-primary/60" />
        <div className="grid grid-cols-2 gap-1 h-[60%]">
          <div className="rounded-sm bg-primary/30" />
          <div className="rounded-sm bg-primary/30" />
        </div>
      </div>
    </div>
  );
}

function DirectionMockup({ variant }: { variant: Direction }) {
  return (
    <div className="relative h-full w-full bg-primary/5 rounded-md overflow-hidden p-1.5">
      <div className={cn("flex gap-1 h-full", variant === "rtl" && "flex-row-reverse")}>
        <div className="w-1/3 space-y-1">
          <div className="h-1 w-3/4 rounded-full bg-primary/60" />
          <div className="h-1 w-1/2 rounded-full bg-primary/40" />
        </div>
        <div className="flex-1 rounded-sm bg-primary/30" />
      </div>
    </div>
  );
}

/* ── Trang chính ── */
export default function AppearancePage() {
  const { theme, setTheme } = useThemeMode();
  const {
    sidebarStyle, setSidebarStyle,
    layoutDensity, setLayoutDensity,
    direction, setDirection,
  } = useSidebarState();

  return (
    <AppLayout>
      <ScreenHeader
        title="Giao diện"
        subtitle="Tuỳ chỉnh chế độ hiển thị và bố cục theo sở thích của bạn."
      />
      <div className="space-y-8 max-w-3xl">
        <p className="text-body text-text-2">
          Tuỳ chỉnh chế độ hiển thị và bố cục theo sở thích của bạn. Thay đổi được lưu tự động.
        </p>

        <Section title="Theme">
          {(["system", "light", "dark"] as const).map((v) => (
            <OptionCard
              key={v}
              selected={theme === v}
              onSelect={() => setTheme(v)}
              label={v === "system" ? "Hệ thống" : v === "light" ? "Sáng" : "Tối"}
              preview={<ThemeMockup variant={v} />}
            />
          ))}
        </Section>

        <Section title="Sidebar">
          {(["inset", "floating", "sidebar"] as const).map((v) => (
            <OptionCard
              key={v}
              selected={sidebarStyle === v}
              onSelect={() => setSidebarStyle(v)}
              label={v === "inset" ? "Inset" : v === "floating" ? "Floating" : "Sidebar"}
              preview={<SidebarMockup variant={v} />}
            />
          ))}
        </Section>

        <Section title="Layout">
          {(["default", "compact", "full"] as const).map((v) => (
            <OptionCard
              key={v}
              selected={layoutDensity === v}
              onSelect={() => setLayoutDensity(v)}
              label={v === "default" ? "Mặc định" : v === "compact" ? "Gọn" : "Full"}
              preview={<LayoutMockup variant={v} />}
            />
          ))}
        </Section>

        <Section title="Hướng đọc">
          {(["ltr", "rtl"] as const).map((v) => (
            <OptionCard
              key={v}
              selected={direction === v}
              onSelect={() => setDirection(v)}
              label={v === "ltr" ? "Trái → Phải" : "Phải → Trái"}
              preview={<DirectionMockup variant={v} />}
            />
          ))}
        </Section>
      </div>
    </AppLayout>
  );
}
