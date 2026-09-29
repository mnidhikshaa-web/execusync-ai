import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader,
  Panel,
  Chip,
  ConfidenceBadge,
  EventChip,
  Mono,
} from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { confidenceBand } from "@/lib/ai-service";
import { fmt } from "@/lib/dates";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Flag,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";

export const Route = createFileRoute("/_console/review")({
  head: () => ({
    meta: [
      { title: "Planner Review Center — EXECUSYNC AI" },
      { name: "description", content: "Human planner verification desk for AI-suggested activity matches." },
    ],
  }),
  component: PlannerReviewCenter,
});

function PlannerReviewCenter() {
  const {
    events,
    activities,
    canApprove,
    approveEvent,
    rejectEvent,
    flagEvent,
    openActivity,
    unmatched,
    conflicts,
  } = useStore();

  const [activeTab, setActiveTab] = useState<"high" | "medium" | "review" | "approved" | "all">("high");
  const [altSelection, setAltSelection] = useState<Record<string, string>>({});

  // Filter events by confidence bands and status
  const pendingEvents = events.filter((e) => e.status === "pending" || e.status === "flagged");

  const highConfidence = pendingEvents.filter(
    (e) => confidenceBand(e.candidates[0]?.confidence || 0) === "High",
  );
  const mediumConfidence = pendingEvents.filter(
    (e) => confidenceBand(e.candidates[0]?.confidence || 0) === "Medium",
  );
  const reviewRequired = pendingEvents.filter(
    (e) => confidenceBand(e.candidates[0]?.confidence || 0) === "Review",
  );
  const approvedEvents = events.filter((e) => e.status === "approved");

  const currentList =
    activeTab === "high"
      ? highConfidence
      : activeTab === "medium"
        ? mediumConfidence
        : activeTab === "review"
          ? reviewRequired
          : activeTab === "approved"
            ? approvedEvents
            : events;

  const handleBatchApproveHigh = () => {
    highConfidence.forEach((e) => {
      const top = e.candidates[0];
      if (top) approveEvent(e.id, top.activityId);
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Human Verification Desk"
        title="Planner Review Center"
        description="Review AI-suggested schedule linkings. Baseline planned dates remain untouched; only actual progress updates upon approval."
        actions={
          highConfidence.length > 0 && canApprove ? (
            <button
              onClick={handleBatchApproveHigh}
              className="inline-flex items-center gap-1.5 rounded-sm bg-success px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-success/90"
            >
              <Check className="h-4 w-4" /> Batch Approve High Confidence ({highConfidence.length})
            </button>
          ) : null
        }
      />

      {/* Role Notice */}
      {!canApprove && (
        <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
          You are currently viewing as a viewer/contractor. Switch demo role to <strong>Project Planner</strong> or <strong>Project Manager</strong> in the header bar to approve or reject matches.
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab("high")}
            className={`rounded-sm px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "high" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            High Confidence (≥90%) <span className="ml-1 rounded bg-background/30 px-1 text-[10px]">{highConfidence.length}</span>
          </button>

          <button
            onClick={() => setActiveTab("medium")}
            className={`rounded-sm px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "medium" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            Medium Confidence (75–89%) <span className="ml-1 rounded bg-background/30 px-1 text-[10px]">{mediumConfidence.length}</span>
          </button>

          <button
            onClick={() => setActiveTab("review")}
            className={`rounded-sm px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "review" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            Review Required (&lt;75%) <span className="ml-1 rounded bg-background/30 px-1 text-[10px]">{reviewRequired.length}</span>
          </button>

          <button
            onClick={() => setActiveTab("approved")}
            className={`rounded-sm px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "approved" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            Approved History <span className="ml-1 rounded bg-background/30 px-1 text-[10px]">{approvedEvents.length}</span>
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={`rounded-sm px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            All Events ({events.length})
          </button>
        </div>

        {/* Jump links */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Link to="/unmatched" className="hover:text-primary">
            Unmatched Scope ({unmatched.filter((u) => u.status === "Open").length})
          </Link>
          <span>·</span>
          <Link to="/conflicts" className="hover:text-primary">
            Conflicts ({conflicts.filter((c) => c.status === "Open").length})
          </Link>
        </div>
      </div>

      {/* Review Match Cards List */}
      <div className="space-y-4">
        {currentList.length === 0 ? (
          <div className="rounded-md border border-dashed border-border py-12 text-center text-xs text-muted-foreground">
            No events found in this category.
          </div>
        ) : (
          currentList.map((e) => {
            const topCand = e.candidates[0];
            const targetActivityId = altSelection[e.id] || topCand?.activityId;
            const targetAct = activities.find((a) => a.id === targetActivityId);
            const activeCand = e.candidates.find((c) => c.activityId === targetActivityId) || topCand;

            return (
              <div
                key={e.id}
                className="overflow-hidden rounded-md border border-border bg-card transition hover:border-primary/40"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/30 px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Mono className="text-primary font-bold">{e.id}</Mono>
                    <EventChip e={e.event} />
                    {e.progress !== null && <Chip tone="info">Reported: {e.progress}%</Chip>}
                    <span className="text-muted-foreground">Source: {e.source} ({fmt(e.date)})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <ConfidenceBadge value={activeCand?.confidence || e.extractionConfidence} />
                    <Chip
                      tone={
                        e.status === "approved"
                          ? "success"
                          : e.status === "rejected"
                            ? "danger"
                            : e.status === "flagged"
                              ? "warning"
                              : "neutral"
                      }
                    >
                      {e.status.toUpperCase()}
                    </Chip>
                  </div>
                </div>

                {/* Body Row: Site Observation vs Matched Schedule Activity */}
                <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
                  {/* Left: Site Observation */}
                  <div className="space-y-2 text-xs">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Site Execution Observation
                    </div>
                    <blockquote className="rounded border-l-2 border-primary bg-muted/30 p-2.5 font-medium text-foreground">
                      "{e.text}"
                    </blockquote>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {e.discipline && <span>Discipline: <strong>{e.discipline}</strong></span>}
                      {e.area && <span>· Area: <strong>{e.area}</strong></span>}
                      {e.time && <span>· Time: <strong>{e.time}</strong></span>}
                    </div>
                  </div>

                  {/* Right: Suggested Schedule Activity & Explainability */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      <span>Suggested L5/L6 Activity</span>
                      {e.candidates.length > 1 && (
                        <div className="flex items-center gap-1 font-sans text-xs">
                          <span className="text-muted-foreground">Change match:</span>
                          <select
                            value={targetActivityId}
                            onChange={(ev) => setAltSelection({ ...altSelection, [e.id]: ev.target.value })}
                            className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px]"
                          >
                            {e.candidates.map((c) => (
                              <option key={c.activityId} value={c.activityId}>
                                {c.activityId} ({c.confidence}%)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {targetAct ? (
                      <div className="rounded border border-border bg-secondary/20 p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-mono text-xs font-bold text-primary">{targetAct.id} ({targetAct.level})</div>
                            <div className="font-semibold text-foreground">{targetAct.name}</div>
                            <div className="mt-0.5 text-[11px] text-muted-foreground font-mono">{targetAct.wbs}</div>
                          </div>
                          <button
                            onClick={() => openActivity(targetAct.id)}
                            className="text-[11px] text-primary hover:underline"
                          >
                            Inspect Activity →
                          </button>
                        </div>

                        {/* Explainability Reasons */}
                        {activeCand && (
                          <div className="mt-2.5 border-t border-border/60 pt-2 space-y-1 text-[11px]">
                            {activeCand.reasons.map((r, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-success">
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                <span>{r}</span>
                              </div>
                            ))}
                            {activeCand.ambiguities.map((a, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-warning">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                <span>{a}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded border border-dashed border-border p-3 text-muted-foreground">
                        No activity selected.
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Bar */}
                {e.status === "pending" || e.status === "flagged" ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-4 py-2 text-xs">
                    <div className="text-[11px] text-muted-foreground">
                      Approving updates <strong>actualStart / actualFinish / progress</strong> and records in the audit log.
                    </div>

                    {canApprove && targetAct && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => flagEvent(e.id)}
                          className="inline-flex items-center gap-1 rounded-sm border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
                        >
                          <Flag className="h-3.5 w-3.5" /> Flag for Review
                        </button>
                        <button
                          onClick={() => rejectEvent(e.id)}
                          className="inline-flex items-center gap-1 rounded-sm border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/20"
                        >
                          <X className="h-3.5 w-3.5" /> Reject Match
                        </button>
                        <button
                          onClick={() => approveEvent(e.id, targetActivityId)}
                          className="inline-flex items-center gap-1 rounded-sm bg-success px-3 py-1 text-xs font-semibold text-white hover:bg-success/90"
                        >
                          <BadgeCheck className="h-3.5 w-3.5" /> Approve & Update Schedule
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-t border-border bg-muted/10 px-4 py-1.5 text-[11px] text-muted-foreground">
                    Action recorded: <strong>{e.status.toUpperCase()}</strong> for {e.approvedActivityId || targetActivityId}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
