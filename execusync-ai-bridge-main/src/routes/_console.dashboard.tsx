import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, KPI, Panel, Bar, Chip, ConfidenceBadge, EventChip, StatusChip, Mono } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { stats, disciplineProgress, sCurve, statusOf } from "@/lib/derive";
import { PROJECT, CROSS_LINKS } from "@/lib/data";
import { fmt, TODAY } from "@/lib/dates";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  FileSearch,
  GitMerge,
  Layers,
  Network,
  Radar,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/_console/dashboard")({
  head: () => ({
    meta: [
      { title: "Executive Dashboard — EXECUSYNC AI" },
      { name: "description", content: "Executive command center for actual progress tracking and schedule intelligence." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const s = useStore();
  const k = stats(s.activities, s.events, s.unmatched, s.conflicts);
  const discData = disciplineProgress(s.activities);
  const chartData = sCurve(s.activities).map((p) => ({
    date: p.date.slice(5),
    Planned: p.planned,
    Actual: p.actual,
  }));

  const pendingEvents = s.events.filter((e) => e.status === "pending" || e.status === "flagged");
  const openConflicts = s.conflicts.filter((c) => c.status === "Open");
  const delayedActs = s.activities.filter((a) => statusOf(a) === "Delayed");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Command Center"
        title="Executive Project Dashboard"
        description={`${PROJECT.name} (${PROJECT.id}) — Planning-to-Execution Intelligence Bridge`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/ingest"
              className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <FileSearch className="h-3.5 w-3.5" /> Ingest Daily Reports
            </Link>
            <Link
              to="/time-agent"
              className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent"
            >
              <Clock className="h-3.5 w-3.5 text-primary" /> Time Agent
            </Link>
          </div>
        }
      />

      {/* AI Daily Brief Banner */}
      <div className="relative overflow-hidden rounded-md border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-bold uppercase tracking-wider text-primary">
                AI Daily Execution Brief
              </span>
              <Chip tone="info">Data Date: {fmt(TODAY)}</Chip>
            </div>
            <p className="mt-1 text-xs text-foreground/90">
              Site data ingestion processed <span className="font-semibold text-primary">{s.reports.length} reports</span>. AI matched <span className="font-semibold text-primary">{s.events.length} site events</span> to L5/L6 schedule activities with an average confidence of <span className="font-semibold text-success">{k.confidence}%</span>. <span className="text-warning">{pendingEvents.length} items</span> require planner verification. <span className="text-destructive">{delayedActs.length} activities</span> show critical start/forecast variance.
            </p>
          </div>
          <Link
            to="/review"
            className="hidden items-center gap-1 text-xs font-medium text-primary hover:underline md:flex"
          >
            Review Queue <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Executive KPI Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5">
        <KPI label="Total Activities" value={k.total} sub="L5 & L6 levels" />
        <KPI label="Completed" value={k.completed} tone="success" sub={`${Math.round((k.completed / k.total) * 100)}% of scope`} />
        <KPI label="In Progress" value={k.inProgress} tone="info" sub="Active on site" />
        <KPI label="Delayed" value={k.delayed} tone="danger" sub="Variance > 0 days" />
        <KPI label="Not Started" value={k.notStarted} sub="Upcoming baseline" />
        <KPI label="Unmatched Scope" value={k.unmatched} tone="warning" sub="Missing from schedule" />
        <KPI label="Data Conflicts" value={k.conflicts} tone="danger" sub="Multi-source disputes" />
        <KPI label="AI Confidence" value={`${k.confidence}%`} tone="info" sub="Deterministic score" />
        <KPI label="Actual Progress" value={`${k.progress}%`} tone="success" sub={`Baseline plan: ${k.planned}%`} />
        <KPI label="Schedule Variance" value={`${k.progress - k.planned > 0 ? "+" : ""}${k.progress - k.planned}%`} tone={k.progress < k.planned ? "danger" : "success"} sub="Overall slip" />
      </div>

      {/* Main Charts & Analytics Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* S-Curve Planned vs Actual */}
        <Panel
          title="Planned vs Actual S-Curve (Progress Tracking)"
          icon={TrendingUp}
          className="lg:col-span-2"
          actions={<span className="text-xs text-muted-foreground">Baseline BL-03 vs Field Actuals</span>}
        >
          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--muted-foreground)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--muted-foreground)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "4px", fontSize: "12px" }}
                  formatter={(val: any) => [`${val}%`, ""]}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Area type="monotone" dataKey="Planned" stroke="var(--muted-foreground)" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorPlanned)" />
                <Area type="monotone" dataKey="Actual" stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorActual)" connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Discipline Progress Breakdown */}
        <Panel title="Discipline Progress" icon={Layers}>
          <div className="space-y-3.5">
            {discData.map((d) => (
              <div key={d.discipline} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{d.discipline}</span>
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-foreground">{d.actual}%</span>
                    <span className="text-muted-foreground">/ plan {d.planned}%</span>
                    {d.delayed > 0 && <span className="rounded bg-destructive/15 px-1 text-[10px] text-destructive">{d.delayed} delayed</span>}
                  </div>
                </div>
                <Bar value={d.actual} tone={d.actual < d.planned - 5 ? "danger" : d.actual >= d.planned ? "success" : "info"} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Action Queues & Intelligence Feeds */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Pending AI Verification Queue */}
        <Panel
          title="Pending AI Review Queue"
          icon={Bot}
          actions={
            <Link to="/review" className="text-xs text-primary hover:underline">
              View All ({pendingEvents.length})
            </Link>
          }
        >
          {pendingEvents.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">All site matches verified!</div>
          ) : (
            <div className="space-y-3">
              {pendingEvents.slice(0, 3).map((e) => {
                const topCand = e.candidates[0];
                return (
                  <div key={e.id} className="rounded-sm border border-border p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[11px] text-primary">{topCand?.activityId || "Unmatched"}</span>
                      <ConfidenceBadge value={topCand?.confidence || e.extractionConfidence} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-muted-foreground">"{e.text}"</p>
                    <div className="mt-2 flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-muted-foreground">{e.source}</span>
                      {s.canApprove && topCand && (
                        <button
                          onClick={() => s.approveEvent(e.id, topCand.activityId)}
                          className="rounded bg-success/15 px-2 py-0.5 font-medium text-success hover:bg-success/25"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Cross-Discipline Signals */}
        <Panel
          title="Cross-Discipline Signals"
          icon={Network}
          actions={
            <Link to="/cross-discipline" className="text-xs text-primary hover:underline">
              Explore
            </Link>
          }
        >
          <div className="space-y-3">
            {CROSS_LINKS.slice(0, 2).map((link) => (
              <div key={link.id} className="rounded-sm border border-border p-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{link.title}</span>
                  <Chip tone={link.severity === "high" ? "danger" : "warning"}>{link.severity}</Chip>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{link.insight}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px]">
                  {link.chain.map((c, i) => (
                    <span key={c.activityId} className="flex items-center gap-1 font-mono">
                      <span className="rounded bg-muted px-1 text-foreground">{c.activityId}</span>
                      {i < link.chain.length - 1 && <span className="text-muted-foreground">→</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Recent Audit Updates */}
        <Panel
          title="Live Schedule Audit Trail"
          icon={Clock}
          actions={
            <Link to="/audit" className="text-xs text-primary hover:underline">
              Full Log
            </Link>
          }
        >
          <div className="space-y-2.5">
            {s.audit.slice(0, 4).map((log) => (
              <div key={log.id} className="border-b border-border/50 pb-2 text-xs last:border-0 last:pb-0">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <Mono className="text-primary">{log.activityId}</Mono>
                  <span>{log.timestamp}</span>
                </div>
                <div className="mt-0.5 font-medium text-foreground">
                  {log.field}: <span className="line-through opacity-70">{log.previous}</span> → <span className="text-success">{log.next}</span>
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  By {log.reviewer} ({log.source})
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
