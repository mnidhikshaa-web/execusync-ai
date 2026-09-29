import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import { forecastFinish, forecastVariance, startVariance, statusOf } from "@/lib/derive";
import { fmt, TODAY, diffDays } from "@/lib/dates";
import { CROSS_LINKS, MEMORY, PROJECT } from "@/lib/data";
import { Bar, Chip, ConfidenceBadge, EventChip, Mono, StatusChip, VerifyBadge } from "./ui-kit";
import { ChevronRight, Lock } from "lucide-react";
import type { Activity } from "@/lib/types";

function Timeline({ a }: { a: Activity }) {
  const pts = [
    { label: "Planned Start", date: a.plannedStart, kind: "plan" },
    { label: "Actual Start", date: a.actualStart, kind: "actual" },
    { label: "Data Date (today)", date: TODAY, kind: "today" },
    {
      label: a.actualFinish ? "Actual Finish" : "Forecast Finish",
      date: a.actualFinish ?? forecastFinish(a),
      kind: a.actualFinish ? "actual" : "forecast",
    },
    { label: "Planned Finish", date: a.plannedFinish, kind: "plan" },
  ].filter((p) => p.date) as { label: string; date: string; kind: string }[];
  pts.sort((x, y) => diffDays(x.date, y.date));
  return (
    <ol className="relative ml-2 border-l border-border">
      {pts.map((p, i) => (
        <li key={i} className="mb-3 ml-4">
          <span
            className={
              "absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full border " +
              (p.kind === "plan"
                ? "border-muted-foreground bg-background"
                : p.kind === "actual"
                  ? "border-success bg-success"
                  : p.kind === "today"
                    ? "border-primary bg-primary"
                    : "border-warning bg-warning/40")
            }
          />
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className={p.kind === "plan" ? "text-muted-foreground" : "text-foreground"}>
              {p.label}
            </span>
            <Mono>{fmt(p.date)}</Mono>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ActivityDrawer() {
  const { selectedActivity, openActivity, activities, audit, events } = useStore();
  const a = activities.find((x) => x.id === selectedActivity);
  const status = a ? statusOf(a) : null;
  const sv = a ? startVariance(a) : null;
  const fv = a ? forecastVariance(a) : 0;
  const mem = a ? MEMORY.find((m) => m.discipline === a.discipline) : undefined;
  const links = a ? CROSS_LINKS.filter((l) => l.chain.some((c) => c.activityId === a.id)) : [];
  const logs = a ? audit.filter((l) => l.activityId === a.id) : [];
  const evs = a
    ? events.filter((e) => e.approvedActivityId === a.id || e.candidates[0]?.activityId === a.id)
    : [];
  const dependents = a ? activities.filter((x) => x.dependencies.includes(a.id)) : [];

  return (
    <Sheet open={!!a} onOpenChange={(o) => !o && openActivity(null)}>
      <SheetContent className="w-full overflow-y-auto border-border p-0 sm:max-w-xl">
        {a && status && (
          <div>
            <div className="border-b border-border bg-card px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Mono className="text-primary">{a.id}</Mono>
                <Chip>{a.level}</Chip>
                <StatusChip status={status} />
                <VerifyBadge v={a.verification} />
                {a.isNew && <Chip tone="info">New activity</Chip>}
              </div>
              <SheetTitle className="mt-2 font-display text-xl">{a.name}</SheetTitle>
              <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                {[
                  "L1 · Refinery Expansion",
                  `L2 · ${a.unit}`,
                  `L3 · ${a.area}`,
                  `L4 · ${a.discipline}`,
                  `${a.level} · ${a.id}`,
                ].map((s, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="h-3 w-3" />}
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">Actual progress</span>
                  <Mono>{a.progress}%</Mono>
                </div>
                <Bar
                  value={a.progress}
                  tone={
                    status === "Delayed" ? "danger" : status === "Completed" ? "success" : "info"
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-sm border border-border p-3">
                  <div className="mb-2 flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <Lock className="h-3 w-3" /> Baseline (read-only)
                  </div>
                  <Row k="Planned start" v={fmt(a.plannedStart)} />
                  <Row k="Planned finish" v={fmt(a.plannedFinish)} />
                  <Row k="Duration" v={`${a.duration} d`} />
                </div>
                <div className="rounded-sm border border-success/30 bg-success/5 p-3">
                  <div className="mb-2 text-[11px] uppercase tracking-wider text-success">
                    Actuals
                  </div>
                  <Row k="Actual start" v={fmt(a.actualStart)} />
                  <Row
                    k="Actual finish"
                    v={a.actualFinish ? fmt(a.actualFinish) : "Not yet completed"}
                  />
                  <Row
                    k="Start variance"
                    v={sv === null ? "—" : `${sv > 0 ? "+" : ""}${sv} d`}
                    tone={sv && sv > 0 ? "text-destructive" : undefined}
                  />
                  <Row
                    k="Finish forecast"
                    v={`${fv > 0 ? "+" : ""}${fv} d`}
                    tone={fv > 0 ? "text-warning" : undefined}
                  />
                </div>
              </div>

              <Section title="Timeline">
                <Timeline a={a} />
              </Section>

              <Section title="Details">
                <Row k="Contractor" v={a.contractor} />
                <Row k="WBS" v={a.wbs} />
                <Row k="AI confidence" v={<ConfidenceBadge value={a.aiConfidence} />} />
                <Row k="Project" v={PROJECT.id} />
              </Section>

              <Section title="Dependencies">
                <div className="flex flex-wrap gap-1.5">
                  {a.dependencies.length === 0 && dependents.length === 0 && (
                    <span className="text-xs text-muted-foreground">No logic links recorded.</span>
                  )}
                  {a.dependencies.map((d) => (
                    <button
                      key={d}
                      onClick={() => openActivity(d)}
                      className="rounded-sm border border-border px-2 py-0.5 font-mono text-[11px] hover:border-primary"
                    >
                      ← {d}
                    </button>
                  ))}
                  {dependents.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => openActivity(d.id)}
                      className="rounded-sm border border-border px-2 py-0.5 font-mono text-[11px] hover:border-primary"
                    >
                      {d.id} →
                    </button>
                  ))}
                </div>
              </Section>

              {links.length > 0 && (
                <Section title="Cross-discipline relationships">
                  {links.map((l) => (
                    <p key={l.id} className="text-xs text-muted-foreground">
                      <span className="text-foreground">{l.title}:</span> {l.insight}
                    </p>
                  ))}
                </Section>
              )}

              <Section title="Source reports & AI matches">
                {evs.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    No linked site observations yet.
                  </span>
                ) : (
                  <ul className="space-y-2">
                    {evs.map((e) => (
                      <li key={e.id} className="rounded-sm border border-border p-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">{e.source}</span>
                          <div className="flex gap-1">
                            <EventChip e={e.event} />
                            <ConfidenceBadge value={e.candidates[0]?.confidence} showBand={false} />
                          </div>
                        </div>
                        <div className="mt-1">"{e.text}"</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Status: {e.status}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {mem && (
                <Section title="Historical performance (Project Memory)">
                  <p className="text-xs text-muted-foreground">
                    Similar {mem.discipline.toLowerCase()} activities ("{mem.activityType}",{" "}
                    {mem.occurrences} occurrences) averaged {mem.actualAvg} d against{" "}
                    {mem.plannedAvg} d planned. Main cause: {mem.causes[0]!.cause.toLowerCase()}.
                  </p>
                </Section>
              )}

              <Section title="Audit trail">
                {logs.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    No schedule updates recorded.
                  </span>
                ) : (
                  <ul className="space-y-1.5">
                    {logs.map((l) => (
                      <li key={l.id} className="text-xs">
                        <Mono className="text-muted-foreground">{l.timestamp}</Mono> — {l.field}:{" "}
                        {l.previous} → <span className="text-foreground">{l.next}</span> (
                        {l.reviewer}, {l.status})
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}
function Row({ k, v, tone }: { k: string; v: React.ReactNode; tone?: string | undefined }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5 text-xs">
      <span className="text-muted-foreground">{k}</span>
      <span className={"text-right font-mono " + (tone ?? "text-foreground")}>{v}</span>
    </div>
  );
}
