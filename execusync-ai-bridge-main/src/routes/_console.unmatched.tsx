import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader,
  Panel,
  Chip,
  ConfidenceBadge,
  Mono,
} from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { fmt } from "@/lib/dates";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Layers,
  Plus,
  SearchX,
  Send,
  Sparkles,
  X,
} from "lucide-react";

export const Route = createFileRoute("/_console/unmatched")({
  head: () => ({
    meta: [
      { title: "Missing Activity Detector — EXECUSYNC AI" },
      { name: "description", content: "Identify scope and field activities executed on site that are missing from the baseline schedule." },
    ],
  }),
  component: MissingActivityDetector,
});

function MissingActivityDetector() {
  const { unmatched, unmatchedAction, activities, openActivity } = useStore();
  const [filterStatus, setFilterStatus] = useState<string>("All");

  const filtered = unmatched.filter((u) => {
    if (filterStatus === "All") return true;
    return u.status === filterStatus;
  });

  const openCount = unmatched.filter((u) => u.status === "Open").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Scope Gap Intelligence"
        title="Missing Activity Detector (Unmatched Scope)"
        description="Detect field-directed work, temporary facilities, and granular execution tasks recorded in daily reports that have no counterpart in the L5/L6 baseline schedule."
      />

      {/* Overview Stat Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-warning">
            <AlertCircle className="h-4 w-4" /> Open Unmatched Scope Items
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-foreground">{openCount} Items</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">Awaiting planner scope decision</div>
        </div>

        <div className="rounded-md border border-border bg-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Created L6 Activities
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-success">
            {unmatched.filter((u) => u.status === "Activity Created").length} Integrated
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">Added into live project schedule</div>
        </div>

        <div className="rounded-md border border-border bg-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Escalated to Planning Desk
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-info">
            {unmatched.filter((u) => u.status === "Sent to Planner").length} Escalated
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">Under scope change review</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 text-xs">
        {["All", "Open", "Sent to Planner", "Activity Created", "Dismissed"].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`rounded-sm px-3 py-1.5 font-semibold transition ${
              filterStatus === st ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {st} ({unmatched.filter((u) => (st === "All" ? true : u.status === st)).length})
          </button>
        ))}
      </div>

      {/* Unmatched Cards Feed */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-md border border-dashed border-border py-12 text-center text-xs text-muted-foreground">
            No unmatched activities in this category.
          </div>
        ) : (
          filtered.map((u) => {
            const closestAct = u.closest ? activities.find((a) => a.id === u.closest) : undefined;
            return (
              <div
                key={u.id}
                className="overflow-hidden rounded-md border border-border bg-card transition hover:border-primary/40"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/30 px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Mono className="font-bold text-primary">{u.id}</Mono>
                    <Chip tone="warning">POSSIBLE MISSING SCOPE</Chip>
                    <span className="text-muted-foreground">
                      Source: {u.source} ({fmt(u.date)})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <ConfidenceBadge value={u.aiConfidence} />
                    <Chip
                      tone={
                        u.status === "Activity Created"
                          ? "success"
                          : u.status === "Sent to Planner"
                            ? "info"
                            : u.status === "Dismissed"
                              ? "neutral"
                              : "warning"
                      }
                    >
                      {u.status}
                    </Chip>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 text-xs space-y-3">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Field Execution Observation Text
                    </div>
                    <blockquote className="mt-1 rounded border-l-2 border-warning bg-warning/5 p-3 text-sm font-semibold text-foreground">
                      "{u.text}"
                    </blockquote>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded border border-border bg-muted/20 p-2.5">
                      <span className="text-muted-foreground text-[10px] uppercase">Discipline / Area</span>
                      <div className="font-semibold text-foreground">{u.discipline || "General"} · {u.area || "Site-wide"}</div>
                    </div>

                    <div className="rounded border border-border bg-muted/20 p-2.5">
                      <span className="text-muted-foreground text-[10px] uppercase">Occurrence Frequency</span>
                      <div className="font-semibold text-foreground font-mono">{u.occurrences || 1} mentions in site logs</div>
                    </div>

                    <div className="rounded border border-border bg-muted/20 p-2.5">
                      <span className="text-muted-foreground text-[10px] uppercase">Closest Schedule Activity</span>
                      <div className="font-semibold text-primary font-mono truncate">
                        {closestAct ? `${closestAct.id} (${u.closestConfidence}%)` : "None"}
                      </div>
                    </div>
                  </div>

                  {/* AI Gap Explanation */}
                  <div className="rounded bg-secondary/30 p-2.5 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">AI Gap Rationale: </span>
                    {u.explanation}
                  </div>

                  {/* Action Buttons */}
                  {u.status === "Open" && (
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                      <button
                        onClick={() => unmatchedAction(u.id, "dismiss")}
                        className="inline-flex items-center gap-1 rounded-sm border border-border px-3 py-1.5 text-xs hover:bg-accent"
                      >
                        <X className="h-3.5 w-3.5" /> Dismiss Observation
                      </button>

                      <button
                        onClick={() => unmatchedAction(u.id, "send")}
                        className="inline-flex items-center gap-1 rounded-sm border border-info/40 bg-info/10 px-3 py-1.5 text-xs font-semibold text-info hover:bg-info/20"
                      >
                        <Send className="h-3.5 w-3.5" /> Send to Lead Planner
                      </button>

                      <button
                        onClick={() => unmatchedAction(u.id, "create")}
                        className="inline-flex items-center gap-1 rounded-sm bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        <Plus className="h-3.5 w-3.5" /> Create New L6 Activity
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
