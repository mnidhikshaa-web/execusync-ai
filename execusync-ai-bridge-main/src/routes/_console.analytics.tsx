import { createFileRoute } from "@tanstack/react-router";
import {
  PageHeader,
  Panel,
  Chip,
  Bar,
  Mono,
} from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { stats, disciplineProgress, statusOf, startVariance } from "@/lib/derive";
import { TODAY, fmt } from "@/lib/dates";
import { PROJECT } from "@/lib/data";
import {
  BarChart3,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  PieChart,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar as RechartBar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_console/analytics")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — EXECUSYNC AI" },
      { name: "description", content: "Executive analytics, discipline velocity, and downloadable CSV progress reports." },
    ],
  }),
  component: ReportsAndAnalytics,
});

function ReportsAndAnalytics() {
  const { activities, events, unmatched, conflicts, audit } = useStore();
  const k = stats(activities, events, unmatched, conflicts);
  const discData = disciplineProgress(activities);

  const chartData = discData.map((d) => ({
    discipline: d.discipline,
    Actual: d.actual,
    Planned: d.planned,
  }));

  const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
  };

  const exportProgressReport = () => {
    const headers = "Activity ID,WBS,Activity Name,Discipline,Area,Planned Start,Planned Finish,Actual Start,Actual Finish,Progress %,Status,Contractor,Verification\n";
    const rows = activities
      .map((a) =>
        [
          a.id,
          a.wbs,
          `"${a.name}"`,
          a.discipline,
          a.area,
          a.plannedStart,
          a.plannedFinish,
          a.actualStart || "—",
          a.actualFinish || "—",
          a.progress,
          statusOf(a),
          `"${a.contractor}"`,
          a.verification,
        ].join(","),
      )
      .join("\n");
    downloadCSV(`ExecuSync_Project_Progress_${TODAY}.csv`, headers + rows);
  };

  const exportMatchingReport = () => {
    const headers = "Event ID,Report Source,Site Observation,Discipline,Event Type,Date,Detected Progress %,Matched Activity ID,AI Confidence %,Status\n";
    const rows = events
      .map((e) =>
        [
          e.id,
          `"${e.source}"`,
          `"${e.text.replace(/"/g, '""')}"`,
          e.discipline || "—",
          e.event,
          e.date,
          e.progress !== null ? `${e.progress}%` : "—",
          e.approvedActivityId || e.candidates[0]?.activityId || "Unmatched",
          e.candidates[0]?.confidence || e.extractionConfidence,
          e.status,
        ].join(","),
      )
      .join("\n");
    downloadCSV(`ExecuSync_AI_Matching_Report_${TODAY}.csv`, headers + rows);
  };

  const exportUnmatchedReport = () => {
    const headers = "Unmatched ID,Observation Text,Source,Date,Discipline,Area,Closest Candidate,Closest Confidence %,AI Confidence %,Status\n";
    const rows = unmatched
      .map((u) =>
        [
          u.id,
          `"${u.text.replace(/"/g, '""')}"`,
          `"${u.source}"`,
          u.date,
          u.discipline || "—",
          u.area || "—",
          u.closest || "None",
          u.closestConfidence,
          u.aiConfidence,
          u.status,
        ].join(","),
      )
      .join("\n");
    downloadCSV(`ExecuSync_Unmatched_Scope_${TODAY}.csv`, headers + rows);
  };

  const exportConflictReport = () => {
    const headers = "Conflict ID,Activity ID,Conflict Kind,Source A,Progress A %,Source B,Progress B %,Variance %,Status,Resolution\n";
    const rows = conflicts
      .map((c) =>
        [
          c.id,
          c.activityId,
          c.kind,
          `"${c.sources[0]?.source}"`,
          c.sources[0]?.progress,
          `"${c.sources[1]?.source}"`,
          c.sources[1]?.progress,
          Math.abs((c.sources[0]?.progress ?? 0) - (c.sources[1]?.progress ?? 0)),
          c.status,
          `"${c.resolution || "Open"}"`,
        ].join(","),
      )
      .join("\n");
    downloadCSV(`ExecuSync_Conflicts_Report_${TODAY}.csv`, headers + rows);
  };

  const verificationBreakdown = {
    planner: activities.filter((a) => a.verification === "Planner Verified").length,
    supervisor: activities.filter((a) => a.verification === "Supervisor Reported").length,
    suggested: activities.filter((a) => a.verification === "AI Suggested").length,
    system: activities.filter((a) => a.verification === "System Recorded").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Intelligence Reports"
        title="Reports & Analytics Suite"
        description="Comprehensive exportable reports and visual variance analytics for executive stakeholders and lead project planners."
      />

      {/* Downloadable Reports Grid */}
      <Panel title="Exportable Enterprise Reports" icon={Download}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-between rounded-md border border-border bg-card p-4 text-xs">
            <div>
              <div className="flex items-center gap-2 font-bold text-foreground">
                <FileSpreadsheet className="h-4 w-4 text-primary" /> Project Progress Report
              </div>
              <p className="mt-1 text-muted-foreground text-[11px]">
                Complete L5/L6 schedule with baseline dates, actual dates, progress %, and start variances.
              </p>
            </div>
            <button
              onClick={exportProgressReport}
              className="mt-4 inline-flex items-center justify-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" /> Download CSV
            </button>
          </div>

          <div className="flex flex-col justify-between rounded-md border border-border bg-card p-4 text-xs">
            <div>
              <div className="flex items-center gap-2 font-bold text-foreground">
                <FileText className="h-4 w-4 text-success" /> AI Matching Report
              </div>
              <p className="mt-1 text-muted-foreground text-[11px]">
                Detailed audit of all raw site observations, NLP extracted entities, and candidate confidence scores.
              </p>
            </div>
            <button
              onClick={exportMatchingReport}
              className="mt-4 inline-flex items-center justify-center gap-1.5 rounded bg-success px-3 py-1.5 text-xs font-semibold text-white hover:bg-success/90"
            >
              <Download className="h-3.5 w-3.5" /> Download CSV
            </button>
          </div>

          <div className="flex flex-col justify-between rounded-md border border-border bg-card p-4 text-xs">
            <div>
              <div className="flex items-center gap-2 font-bold text-foreground">
                <FileSpreadsheet className="h-4 w-4 text-warning" /> Unmatched Scope Report
              </div>
              <p className="mt-1 text-muted-foreground text-[11px]">
                Log of scope growth, field-directed tasks, and unrepresented site execution tasks.
              </p>
            </div>
            <button
              onClick={exportUnmatchedReport}
              className="mt-4 inline-flex items-center justify-center gap-1.5 rounded bg-warning px-3 py-1.5 text-xs font-semibold text-background hover:bg-warning/90"
            >
              <Download className="h-3.5 w-3.5" /> Download CSV
            </button>
          </div>

          <div className="flex flex-col justify-between rounded-md border border-border bg-card p-4 text-xs">
            <div>
              <div className="flex items-center gap-2 font-bold text-foreground">
                <FileText className="h-4 w-4 text-destructive" /> Data Conflict Report
              </div>
              <p className="mt-1 text-muted-foreground text-[11px]">
                Summary of contractor claims vs supervisor measurements and resolution status.
              </p>
            </div>
            <button
              onClick={exportConflictReport}
              className="mt-4 inline-flex items-center justify-center gap-1.5 rounded bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
            >
              <Download className="h-3.5 w-3.5" /> Download CSV
            </button>
          </div>
        </div>
      </Panel>

      {/* Discipline Progress Comparison Chart */}
      <Panel title="Discipline Progress: Planned vs Actual Velocity" icon={BarChart3}>
        <div className="h-[280px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis dataKey="discipline" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "4px", fontSize: "12px" }}
                formatter={(val: any) => [`${val}%`, ""]}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              <RechartBar dataKey="Planned" fill="var(--muted-foreground)" radius={[3, 3, 0, 0]} opacity={0.4} />
              <RechartBar dataKey="Actual" fill="var(--primary)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Schedule Verification Governance Breakdown */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Panel title="Schedule Verification Sources" icon={ShieldCheck}>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-success"></span> Planner Verified
              </span>
              <span className="font-mono font-bold text-foreground">
                {verificationBreakdown.planner} activities ({Math.round((verificationBreakdown.planner / activities.length) * 100)}%)
              </span>
            </div>
            <Bar value={(verificationBreakdown.planner / activities.length) * 100} tone="success" />

            <div className="flex items-center justify-between pt-2">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-warning"></span> Supervisor Reported (Time Agent)
              </span>
              <span className="font-mono font-bold text-foreground">
                {verificationBreakdown.supervisor} activities ({Math.round((verificationBreakdown.supervisor / activities.length) * 100)}%)
              </span>
            </div>
            <Bar value={(verificationBreakdown.supervisor / activities.length) * 100} tone="warning" />

            <div className="flex items-center justify-between pt-2">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground"></span> System Baseline Recorded
              </span>
              <span className="font-mono font-bold text-foreground">
                {verificationBreakdown.system} activities ({Math.round((verificationBreakdown.system / activities.length) * 100)}%)
              </span>
            </div>
            <Bar value={(verificationBreakdown.system / activities.length) * 100} tone="neutral" />
          </div>
        </Panel>

        <Panel title="Executive Schedule Summary" icon={PieChart}>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded border border-border p-3">
              <div className="text-[10px] uppercase text-muted-foreground">Overall Baseline Plan</div>
              <div className="mt-1 font-display text-2xl font-bold text-foreground">{k.planned}%</div>
            </div>

            <div className="rounded border border-border p-3">
              <div className="text-[10px] uppercase text-muted-foreground">Field Actual Progress</div>
              <div className="mt-1 font-display text-2xl font-bold text-success">{k.progress}%</div>
            </div>

            <div className="rounded border border-border p-3">
              <div className="text-[10px] uppercase text-muted-foreground">Average AI Match Confidence</div>
              <div className="mt-1 font-display text-2xl font-bold text-info">{k.confidence}%</div>
            </div>

            <div className="rounded border border-border p-3">
              <div className="text-[10px] uppercase text-muted-foreground">Schedule Slip Variance</div>
              <div className={`mt-1 font-display text-2xl font-bold ${k.progress < k.planned ? "text-destructive" : "text-success"}`}>
                {k.progress - k.planned > 0 ? "+" : ""}{k.progress - k.planned}%
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
