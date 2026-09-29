import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  PageHeader,
  Panel,
  Chip,
  Mono,
  Bar,
  StatusChip,
} from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { fmt, TODAY, diffDays, addDays } from "@/lib/dates";
import { statusOf, forecastFinish, forecastVariance, startVariance } from "@/lib/derive";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Clock,
  Eye,
  Radar,
  ShieldAlert,
  Sparkles,
  TrendingDown,
} from "lucide-react";

export const Route = createFileRoute("/_console/risk")({
  head: () => ({
    meta: [
      { title: "Early Warning Radar — EXECUSYNC AI" },
      { name: "description", content: "Predictive early warning signals, schedule slip forecasting, and transparent risk rationale." },
    ],
  }),
  component: EarlyWarningRadar,
});

function EarlyWarningRadar() {
  const { activities, openActivity, unmatched, conflicts } = useStore();
  const [severityFilter, setSeverityFilter] = useState<string>("All");

  // Dynamic Risk Signal Computation
  const riskSignals = useMemo(() => {
    const list: any[] = [];

    activities.forEach((a) => {
      if (a.actualFinish || a.progress >= 100) return;

      const st = statusOf(a);
      const sv = startVariance(a);
      const fv = forecastVariance(a);
      const relatedUnmatched = unmatched.filter((u) => u.closest === a.id && u.status === "Open");
      const activeConflict = conflicts.find((c) => c.activityId === a.id && c.status === "Open");
      const hasDownstream = activities.some((x) => x.dependencies.includes(a.id));

      const reasons: string[] = [];
      let severity: "high" | "medium" | "low" = "low";

      if (st === "Delayed") {
        if (fv > 3 || (sv !== null && sv >= 4)) {
          severity = "high";
          reasons.push(`Significant schedule slip (+${fv > 0 ? fv : sv} days against baseline BL-03)`);
        } else {
          severity = "medium";
          reasons.push(`Minor schedule slip (+${fv > 0 ? fv : sv} days)`);
        }
      }

      if (activeConflict) {
        severity = "high";
        reasons.push(`Active multi-source progress conflict (${activeConflict.sources.map((s) => s.progress).join("% vs ")}%)`);
      }

      if (relatedUnmatched.length > 0) {
        if (severity === "low") severity = "medium";
        reasons.push(`${relatedUnmatched.length} unmapped field-level observation(s) near this work scope`);
      }

      if (hasDownstream && (severity === "high" || severity === "medium")) {
        reasons.push("Critical predecessor activity: delays will directly cascade to downstream milestones");
      }

      if (reasons.length > 0) {
        list.push({
          activity: a,
          severity,
          variance: Math.max(fv, sv ?? 0),
          forecastDate: forecastFinish(a),
          signals: reasons,
          recommendation:
            severity === "high"
              ? "Expedite resource allocation and verify physical site readiness immediately with contractor."
              : "Review daily progress reports and align trade handoff dates.",
        });
      }
    });

    list.sort((x, y) => {
      const p = { high: 3, medium: 2, low: 1 };
      return p[y.severity] - p[x.severity] || y.variance - x.variance;
    });

    return list;
  }, [activities, unmatched, conflicts]);

  const filteredSignals = riskSignals.filter((r) => {
    if (severityFilter === "All") return true;
    return r.severity === severityFilter.toLowerCase();
  });

  const highCount = riskSignals.filter((r) => r.severity === "high").length;
  const medCount = riskSignals.filter((r) => r.severity === "medium").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Predictive Intelligence"
        title="Early Warning Radar & Schedule Risk"
        description="Transparent early-warning signals calculated from actual site start dates, duration variance, contractor discrepancies, and trade handoff bottlenecks."
      />

      {/* Advisory Banner */}
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-destructive">
          <Radar className="h-5 w-5" /> Schedule Risk Radar Active
        </div>
        <p className="mt-1 text-xs text-foreground/90">
          Detected <span className="font-bold text-destructive">{highCount} High Priority</span> and <span className="font-bold text-warning">{medCount} Medium Priority</span> early-warning signals. These are transparent predictive indicators, not guaranteed delays.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 text-xs">
        {["All", "High", "Medium", "Low"].map((st) => (
          <button
            key={st}
            onClick={() => setSeverityFilter(st)}
            className={`rounded-sm px-3 py-1.5 font-semibold transition ${
              severityFilter === st ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {st} ({riskSignals.filter((r) => (st === "All" ? true : r.severity === st.toLowerCase())).length})
          </button>
        ))}
      </div>

      {/* Risk Signals Grid */}
      <div className="space-y-4">
        {filteredSignals.length === 0 ? (
          <div className="rounded-md border border-dashed border-border py-12 text-center text-xs text-muted-foreground">
            No schedule risk signals detected in this category.
          </div>
        ) : (
          filteredSignals.map((item) => {
            const a = item.activity;
            return (
              <div
                key={a.id}
                className="overflow-hidden rounded-md border border-border bg-card transition hover:border-primary/40"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/30 px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Mono className="font-bold text-primary">{a.id}</Mono>
                    <span className="font-bold text-foreground">{a.name}</span>
                    <span className="text-muted-foreground">({a.discipline} · {a.area})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Chip tone={item.severity === "high" ? "danger" : item.severity === "medium" ? "warning" : "info"}>
                      {item.severity.toUpperCase()} RISK
                    </Chip>
                    <span className="font-mono text-destructive font-bold">
                      +{item.variance} Days Slip
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 text-xs space-y-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono">
                    <div className="rounded border border-border bg-muted/20 p-2 text-center">
                      <div className="text-[10px] uppercase text-muted-foreground">Planned Finish</div>
                      <div className="font-bold text-foreground">{fmt(a.plannedFinish)}</div>
                    </div>
                    <div className="rounded border border-border bg-muted/20 p-2 text-center">
                      <div className="text-[10px] uppercase text-muted-foreground">Forecast Finish</div>
                      <div className="font-bold text-destructive">{fmt(item.forecastDate)}</div>
                    </div>
                    <div className="rounded border border-border bg-muted/20 p-2 text-center">
                      <div className="text-[10px] uppercase text-muted-foreground">Actual Progress</div>
                      <div className="font-bold text-primary">{a.progress}%</div>
                    </div>
                    <div className="rounded border border-border bg-muted/20 p-2 text-center">
                      <div className="text-[10px] uppercase text-muted-foreground">Contractor</div>
                      <div className="font-bold text-foreground truncate">{a.contractor}</div>
                    </div>
                  </div>

                  {/* Signals List */}
                  <div>
                    <div className="mb-1 flex items-center gap-1 font-semibold text-warning">
                      <AlertTriangle className="h-3.5 w-3.5" /> Early Warning Signals Detected:
                    </div>
                    <ul className="space-y-1 pl-4">
                      {item.signals.map((sig: string, idx: number) => (
                        <li key={idx} className="list-disc text-muted-foreground">
                          {sig}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommendation */}
                  <div className="rounded border border-primary/20 bg-primary/5 p-2.5 text-[11px]">
                    <span className="font-bold text-primary">Recommended Action: </span>
                    <span className="text-foreground">{item.recommendation}</span>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => openActivity(a.id)}
                      className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                    >
                      Open Activity Drawer & Timeline <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
