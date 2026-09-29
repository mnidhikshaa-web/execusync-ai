import { createFileRoute } from "@tanstack/react-router";
import {
  PageHeader,
  Panel,
  Chip,
  Mono,
} from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { CROSS_LINKS, DISCIPLINES } from "@/lib/data";
import { statusOf } from "@/lib/derive";
import {
  AlertTriangle,
  ArrowRight,
  GitBranch,
  Layers,
  Network,
  ShieldAlert,
  Sparkles,
  Workflow,
} from "lucide-react";

export const Route = createFileRoute("/_console/cross-discipline")({
  head: () => ({
    meta: [
      { title: "Cross-Discipline Intelligence — EXECUSYNC AI" },
      { name: "description", content: "AI coordination and dependency cascade analysis across engineering disciplines." },
    ],
  }),
  component: CrossDisciplineIntelligence,
});

function CrossDisciplineIntelligence() {
  const { activities, openActivity } = useStore();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Multi-Trade Coordination"
        title="Cross-Discipline Intelligence"
        description="Detect interdependent coordination handoffs, physical access bottlenecks, and cascading delay signals between Civil, Piping, Mechanical, Electrical, Instrumentation, and HSE."
      />

      {/* Advisory Banner */}
      <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-primary">
          <Sparkles className="h-4 w-4" /> Multi-Trade Dependency Radar
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Cross-discipline signals represent potential physical and logical dependencies identified from site daily records and baseline schedules. Signals are flagged as potential risks requiring planning review.
        </p>
      </div>

      {/* Discipline Matrix Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {DISCIPLINES.map((disc) => {
          const acts = activities.filter((a) => a.discipline === disc);
          const delayed = acts.filter((a) => statusOf(a) === "Delayed").length;
          return (
            <div key={disc} className="rounded-md border border-border bg-card p-3 text-xs">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground">{disc}</div>
              <div className="mt-1 font-display text-lg font-bold text-foreground">{acts.length} pkgs</div>
              <div className="mt-0.5 font-mono text-[11px]">
                {delayed > 0 ? (
                  <span className="text-destructive font-semibold">{delayed} delayed</span>
                ) : (
                  <span className="text-success">On track</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cross-Discipline Chain Cards */}
      <div className="space-y-6">
        {CROSS_LINKS.map((link) => {
          return (
            <div
              key={link.id}
              className="overflow-hidden rounded-md border border-border bg-card"
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/30 px-4 py-3 text-xs">
                <div className="flex items-center gap-2">
                  <Mono className="font-bold text-primary">{link.id}</Mono>
                  <span className="font-display text-sm font-bold text-foreground">{link.title}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Chip tone={link.severity === "high" ? "danger" : link.severity === "medium" ? "warning" : "info"}>
                    {link.severity.toUpperCase()} PRIORITY
                  </Chip>
                </div>
              </div>

              {/* Dependency Chain Steps */}
              <div className="p-4 space-y-4">
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Handoff & Access Cascade Chain:
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {link.chain.map((step, idx) => {
                    const act = activities.find((a) => a.id === step.activityId);
                    const tone =
                      step.tone === "ok"
                        ? "border-success/40 bg-success/5 text-success"
                        : step.tone === "warn"
                          ? "border-warning/40 bg-warning/5 text-warning"
                          : step.tone === "risk"
                            ? "border-destructive/40 bg-destructive/5 text-destructive"
                            : "border-info/40 bg-info/5 text-info";

                    return (
                      <div key={step.activityId} className="relative flex flex-col justify-between rounded border p-3 text-xs">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-primary font-bold">{step.activityId}</span>
                            <span className={`rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase ${tone}`}>
                              {step.tone}
                            </span>
                          </div>
                          <div className="mt-1 font-semibold text-foreground truncate">{act?.name}</div>
                          <div className="mt-1 text-[11px] text-muted-foreground">{step.state}</div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-border flex justify-between items-center text-[10px]">
                          <span className="text-muted-foreground">{act?.discipline}</span>
                          <button
                            onClick={() => openActivity(step.activityId)}
                            className="text-primary hover:underline"
                          >
                            Inspect →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* AI Coordination Insight */}
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3.5 text-xs text-foreground">
                  <div className="flex items-center gap-1.5 font-bold text-primary mb-1">
                    <Workflow className="h-4 w-4" /> AI Coordination Advisory:
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{link.insight}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
