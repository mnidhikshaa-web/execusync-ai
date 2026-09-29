import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ActivityStatus, Verification } from "@/lib/types";
import { confidenceBand } from "@/lib/ai-service";
import { BadgeCheck, Bot, Cpu, HardHat, type LucideIcon } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-bold text-foreground md:text-[28px]">{title}</h1>
        {description && (
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  icon: Icon,
  actions,
  children,
  className,
  bodyClass,
}: {
  title?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={cn("rounded-md border border-border bg-card", className)}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h2 className="flex items-center gap-2 font-display text-[13px] font-semibold uppercase tracking-wider text-foreground">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            {title}
          </h2>
          {actions}
        </header>
      )}
      <div className={cn("p-4", bodyClass)}>{children}</div>
    </section>
  );
}

const TONE = {
  neutral: "border-border bg-secondary text-secondary-foreground",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-destructive/35 bg-destructive/10 text-destructive",
  info: "border-info/30 bg-info/10 text-info",
} as const;
export type Tone = keyof typeof TONE;

export function Chip({
  tone = "neutral",
  children,
  className,
  icon: Icon,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  icon?: LucideIcon;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-[11px] font-medium",
        TONE[tone],
        className,
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

export const statusTone = (s: ActivityStatus): Tone =>
  s === "Completed"
    ? "success"
    : s === "Delayed"
      ? "danger"
      : s === "In Progress"
        ? "info"
        : "neutral";
export function StatusChip({ status }: { status: ActivityStatus }) {
  return <Chip tone={statusTone(status)}>{status}</Chip>;
}

export function VerifyBadge({ v }: { v: Verification }) {
  const map: Record<Verification, [Tone, LucideIcon]> = {
    "AI Suggested": ["info", Bot],
    "Planner Verified": ["success", BadgeCheck],
    "System Recorded": ["neutral", Cpu],
    "Supervisor Reported": ["warning", HardHat],
  };
  const [tone, icon] = map[v];
  return (
    <Chip tone={tone} icon={icon}>
      {v}
    </Chip>
  );
}

export function ConfidenceBadge({
  value,
  showBand = true,
  size = "sm",
}: {
  value: number | null | undefined;
  showBand?: boolean;
  size?: "sm" | "lg";
}) {
  if (value === null || value === undefined)
    return <span className="text-xs text-muted-foreground">—</span>;
  const band = confidenceBand(value);
  const tone: Tone = band === "High" ? "success" : band === "Medium" ? "warning" : "danger";
  if (size === "lg")
    return (
      <div className="flex items-center gap-3">
        <ConfidenceRing value={value} />
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">AI confidence</div>
          <Chip tone={tone}>{band === "Review" ? "Review required" : `${band} confidence`}</Chip>
        </div>
      </div>
    );
  return (
    <Chip tone={tone} className="font-mono">
      {value}%
      {showBand && (
        <span className="font-sans opacity-80">· {band === "Review" ? "Review" : band}</span>
      )}
    </Chip>
  );
}

export function ConfidenceRing({ value, size = 56 }: { value: number; size?: number }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const band = confidenceBand(value);
  const color =
    band === "High"
      ? "var(--success)"
      : band === "Medium"
        ? "var(--warning)"
        : "var(--destructive)";
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="var(--border)"
        strokeWidth="5"
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth="5"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="54%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-foreground font-mono text-[13px] font-semibold"
      >
        {value}
      </text>
    </svg>
  );
}

export function Bar({
  value,
  tone = "info",
  className,
}: {
  value: number;
  tone?: Tone;
  className?: string;
}) {
  const bg = {
    neutral: "bg-muted-foreground",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-destructive",
    info: "bg-info",
  }[tone];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-700", bg)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function KPI({
  label,
  value,
  sub,
  tone = "neutral",
  icon: Icon,
  onClick,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  icon?: LucideIcon;
  onClick?: () => void;
}) {
  const accent = {
    neutral: "before:bg-muted-foreground/40",
    success: "before:bg-success",
    warning: "before:bg-warning",
    danger: "before:bg-destructive",
    info: "before:bg-info",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-md border border-border bg-card p-3 text-left transition-colors before:absolute before:inset-y-0 before:left-0 before:w-[3px] hover:border-primary/40",
        accent,
        !onClick && "cursor-default",
      )}
    >
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
        {Icon && <Icon className="h-3.5 w-3.5" />}
      </div>
      <div className="mt-1 font-display text-2xl font-bold text-foreground">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </button>
  );
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[12px]", className)}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function EventChip({ e }: { e: "START" | "END" | "PROGRESS" }) {
  return (
    <Chip tone={e === "START" ? "info" : e === "END" ? "success" : "warning"} className="font-mono">
      {e}
    </Chip>
  );
}
