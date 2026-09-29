import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Activity as ActivityIcon,
  AlertOctagon,
  BarChart3,
  Brain,
  ClipboardCheck,
  Database,
  FileSearch,
  GitMerge,
  History,
  LayoutDashboard,
  ListTree,
  Menu,
  MessageSquareText,
  Network,
  Radar,
  Settings,
  ShieldAlert,
  Upload,
  FolderKanban,
  SearchX,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABEL, useStore } from "@/lib/store";
import { PROJECT } from "@/lib/data";
import { fmt, TODAY } from "@/lib/dates";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActivityDrawer } from "./activity-drawer";
import { Logo } from "./logo";

type Item = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: "review" | "unmatched" | "conflicts";
  roles?: Role[];
};
const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Command",
    items: [
      { to: "/dashboard", label: "Executive Dashboard", icon: LayoutDashboard },
      { to: "/project", label: "Project Overview", icon: FolderKanban },
      { to: "/schedule", label: "L5/L6 Schedule Explorer", icon: ListTree },
    ],
  },
  {
    label: "Capture & Link",
    items: [
      { to: "/ingest", label: "Data Ingestion Center", icon: Upload },
      { to: "/extraction", label: "AI Extraction", icon: FileSearch },
      { to: "/matching", label: "AI Activity Matching", icon: GitMerge },
      { to: "/review", label: "Planner Review Center", icon: ClipboardCheck, badge: "review" },
      { to: "/time-agent", label: "Time Agent", icon: MessageSquareText },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/unmatched", label: "Missing Activity Detector", icon: SearchX, badge: "unmatched" },
      { to: "/conflicts", label: "Data Conflicts", icon: AlertOctagon, badge: "conflicts" },
      { to: "/cross-discipline", label: "Cross-Discipline", icon: Network },
      { to: "/memory", label: "Project Memory", icon: Brain },
      { to: "/risk", label: "Early Warning Radar", icon: Radar },
    ],
  },
  {
    label: "Governance",
    items: [
      { to: "/audit", label: "Audit Trail", icon: History },
      { to: "/analytics", label: "Reports & Analytics", icon: BarChart3 },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function Nav({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const { events, unmatched, conflicts } = useStore();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const counts = {
    review: events.filter((e) => e.status === "pending" || e.status === "flagged").length,
    unmatched: unmatched.filter((u) => u.status === "Open").length,
    conflicts: conflicts.filter((c) => c.status === "Open").length,
  };
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {GROUPS.map((g) => (
        <div key={g.label}>
          <div className="mb-1.5 px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            {g.label}
          </div>
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const active = path === it.to;
              const n = it.badge ? counts[it.badge] : 0;
              return (
                <li key={it.to}>
                  <Link
                    to={it.to}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-[13px] text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      active &&
                        "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--primary)]",
                    )}
                  >
                    <it.icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    <span className="truncate">{it.label}</span>
                    {n > 0 && (
                      <span
                        className={cn(
                          "ml-auto rounded-sm px-1.5 font-mono text-[10px]",
                          it.badge === "review"
                            ? "bg-warning/15 text-warning"
                            : "bg-destructive/15 text-destructive",
                        )}
                      >
                        {n}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="border-b border-sidebar-border px-4 py-4">
        <Logo />
      </div>
      <Nav onNavigate={onNavigate} />
      <div className="border-t border-sidebar-border px-4 py-3 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Database className="h-3 w-3" /> {PROJECT.dataLabel}
        </div>
        <div className="mt-1 font-mono">{PROJECT.id}</div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { role, setRole, persistenceError } = useStore();
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border lg:block">
        <SidebarBody />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
          <button
            className="rounded-sm p-1.5 hover:bg-accent lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">{PROJECT.name}</div>
            <div className="hidden truncate font-mono text-[11px] text-muted-foreground sm:block">
              {PROJECT.id} · Data date {fmt(TODAY)} ·{" "}
              <span className="text-success">● {PROJECT.status}</span>
            </div>
          </div>
          <div className="hidden items-center gap-1.5 text-[11px] text-muted-foreground xl:flex">
            <ActivityIcon className="h-3.5 w-3.5 text-primary" /> From Site Reality to Schedule
            Intelligence
          </div>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger className="h-8 w-[170px] text-xs" aria-label="Demo role">
              <ShieldAlert className="h-3.5 w-3.5 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <SelectItem key={r} value={r} className="text-xs">
                  {ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-6 md:px-6">
          {persistenceError && (
            <div
              role="alert"
              className="mb-4 rounded border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning"
            >
              {persistenceError}. Changes are temporarily kept in this browser; start the API with{" "}
              <code>npm run dev:fullstack</code> to enable SQLite persistence.
            </div>
          )}
          {children}
        </main>
      </div>
      <ActivityDrawer />
    </div>
  );
}
