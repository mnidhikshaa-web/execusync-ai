import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader,
  Panel,
  Chip,
  Mono,
} from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import {
  AlertOctagon,
  AlertTriangle,
  BadgeCheck,
  Check,
  FileSpreadsheet,
  FileText,
  Scale,
  ShieldAlert,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_console/conflicts")({
  head: () => ({
    meta: [
      { title: "Data Conflicts — EXECUSYNC AI" },
      { name: "description", content: "Detect and resolve discrepancies between contractor reports and site supervisor diaries." },
    ],
  }),
  component: DataConflictsCenter,
});

function DataConflictsCenter() {
  const { conflicts, activities, resolveConflict, openActivity } = useStore();
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const [resolvedProgress, setResolvedProgress] = useState<number>(70);
  const [resolutionNote, setResolutionNote] = useState<string>("");
  const [isVerified, setIsVerified] = useState<boolean>(true);

  const activeConflict = conflicts.find((c) => c.id === selectedConflictId);
  const conflictAct = activeConflict ? activities.find((a) => a.id === activeConflict.activityId) : undefined;

  const handleOpenResolve = (id: string) => {
    const c = conflicts.find((x) => x.id === id);
    if (c) {
      setSelectedConflictId(id);
      setResolvedProgress(c.sources[1]?.progress ?? 70);
      setResolutionNote("Physical site inspection confirmed supervisor measurement.");
      setIsVerified(true);
    }
  };

  const handleSubmitResolution = () => {
    if (!selectedConflictId) return;
    resolveConflict(selectedConflictId, resolvedProgress, resolutionNote, isVerified);
    setSelectedConflictId(null);
  };

  const openCount = conflicts.filter((c) => c.status === "Open").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Truth & Discrepancy Engine"
        title="Multi-Source Data Conflicts"
        description="Detect and arbitrate conflicting execution reports across contractors, discipline trackers, and supervisor site diaries without silent overrides."
      />

      {/* Discrepancy Alert Banner */}
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-destructive">
          <AlertOctagon className="h-5 w-5" /> Active Discrepancy Arbitration
        </div>
        <p className="mt-1 text-xs text-foreground/90">
          The system detected <span className="font-bold text-destructive">{openCount} active multi-source progress conflicts</span>. EXECUSYNC AI prevents automatic winner selection; human verification is required to establish verified schedule actuals.
        </p>
      </div>

      {/* Conflicts List */}
      <div className="space-y-6">
        {conflicts.map((c) => {
          const act = activities.find((a) => a.id === c.activityId);
          const srcA = c.sources[0];
          const srcB = c.sources[1];
          const diff = Math.abs((srcA?.progress ?? 0) - (srcB?.progress ?? 0));

          return (
            <div
              key={c.id}
              className="overflow-hidden rounded-md border border-border bg-card transition hover:border-primary/40"
            >
              {/* Conflict Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/30 px-4 py-3 text-xs">
                <div className="flex items-center gap-2">
                  <Mono className="font-bold text-destructive">{c.id}</Mono>
                  <Chip tone="danger">{c.kind}</Chip>
                  <span className="font-semibold text-foreground">
                    Activity: <Mono className="text-primary font-bold">{c.activityId}</Mono> ({act?.name})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded bg-destructive/15 px-2 py-0.5 font-mono text-[11px] font-bold text-destructive">
                    Δ {diff}% Variance
                  </span>
                  <Chip tone={c.status === "Open" ? "danger" : "success"}>{c.status}</Chip>
                </div>
              </div>

              {/* Side-by-Side Evidence Cards */}
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                {/* Source A */}
                <div className="rounded border border-border bg-muted/20 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <FileSpreadsheet className="h-4 w-4 text-info" />
                      <span>{srcA?.source}</span>
                    </div>
                    <span className="font-mono text-base font-bold text-info">{srcA?.progress}%</span>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Document: <Mono className="text-foreground">{srcA?.document}</Mono></div>
                    <div className="text-[11px] text-muted-foreground">Author: <strong>{srcA?.author}</strong> ({srcA?.timestamp})</div>
                  </div>
                  <blockquote className="rounded bg-card p-2 text-[11px] italic text-muted-foreground border-l-2 border-info">
                    "{srcA?.note}"
                  </blockquote>
                </div>

                {/* Source B */}
                <div className="rounded border border-border bg-muted/20 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <FileText className="h-4 w-4 text-warning" />
                      <span>{srcB?.source}</span>
                    </div>
                    <span className="font-mono text-base font-bold text-warning">{srcB?.progress}%</span>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Document: <Mono className="text-foreground">{srcB?.document}</Mono></div>
                    <div className="text-[11px] text-muted-foreground">Author: <strong>{srcB?.author}</strong> ({srcB?.timestamp})</div>
                  </div>
                  <blockquote className="rounded bg-card p-2 text-[11px] italic text-muted-foreground border-l-2 border-warning">
                    "{srcB?.note}"
                  </blockquote>
                </div>
              </div>

              {/* Resolution Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/10 px-4 py-2.5 text-xs">
                {c.resolution ? (
                  <div className="text-xs text-success flex items-center gap-1.5">
                    <BadgeCheck className="h-4 w-4" />
                    <span>Resolution: <strong>{c.resolution}</strong></span>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground">
                    Arbitrate between contractor claim and supervisor site measurement.
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {act && (
                    <button
                      onClick={() => openActivity(act.id)}
                      className="rounded border border-border px-2.5 py-1 hover:bg-accent"
                    >
                      Activity Details
                    </button>
                  )}
                  {c.status === "Open" && (
                    <button
                      onClick={() => handleOpenResolve(c.id)}
                      className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-3.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      <Scale className="h-3.5 w-3.5" /> Arbitrate & Resolve Conflict
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Conflict Resolution Modal */}
      <Dialog open={!!selectedConflictId} onOpenChange={(o) => !o && setSelectedConflictId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Arbitrate Conflict: {activeConflict?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <p className="text-muted-foreground">
              Set the verified progress for activity <strong className="text-foreground">{activeConflict?.activityId}</strong> ({conflictAct?.name}).
            </p>

            <div className="rounded border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex justify-between font-semibold">
                <span>Verified Actual Progress:</span>
                <span className="font-mono text-primary text-base">{resolvedProgress}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={resolvedProgress}
                onChange={(e) => setResolvedProgress(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Supervisor: {activeConflict?.sources[1]?.progress}%</span>
                <span>Contractor: {activeConflict?.sources[0]?.progress}%</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-foreground mb-1">
                Planner Justification / Field Verification Note:
              </label>
              <textarea
                rows={3}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Enter justification for schedule actuals..."
                className="w-full rounded border border-border bg-background p-2 focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="verifyCheck"
                checked={isVerified}
                onChange={(e) => setIsVerified(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="verifyCheck" className="text-foreground cursor-pointer">
                Mark as Planner-Verified in Schedule & Audit Trail
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedConflictId(null)}
                className="rounded border border-border px-3 py-1.5 hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitResolution}
                className="rounded bg-success px-4 py-1.5 font-semibold text-white hover:bg-success/90"
              >
                Save Resolution
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
