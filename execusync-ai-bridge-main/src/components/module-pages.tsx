import { useMemo, useState } from "react";
import { AlertTriangle, Check, CircleHelp, FileUp, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PageHeader,
  Panel,
  Chip,
  ConfidenceBadge,
  StatusChip,
  Bar,
  Mono,
  Empty,
} from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { DEMO_REPORTS, DISCIPLINES, PROJECT, CROSS_LINKS, MEMORY } from "@/lib/data";
import { extract, match, answerMemory } from "@/lib/ai-service";
import { fmt, TODAY } from "@/lib/dates";
import {
  forecastVariance,
  overallProgress,
  plannedProgressAt,
  stats,
  statusOf,
  disciplineProgress,
} from "@/lib/derive";
import type { Activity, ExtractedEvent, Role } from "@/lib/types";

function EventCard({ event, actions }: { event: ExtractedEvent; actions?: React.ReactNode }) {
  const { activities, openActivity, reports } = useStore();
  const candidate = event.candidates[0];
  const activity = activities.find((a) => a.id === candidate?.activityId);
  return (
    <Panel
      className="mb-3"
      title={
        <span className="flex items-center gap-2">
          <Mono>{event.id}</Mono>
          <Chip
            tone={
              event.status === "approved"
                ? "success"
                : event.status === "unmatched"
                  ? "danger"
                  : "warning"
            }
          >
            {event.status.toUpperCase()}
          </Chip>
        </span>
      }
      actions={actions}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Source observation
          </div>
          <p className="mt-1 text-sm">“{event.text}”</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {reports.find((r) => r.id === event.reportId)?.source ?? event.source} ·{" "}
            {fmt(event.date)}
            {event.time ? ` · ${event.time}` : ""}
          </p>
          <div className="mt-2 flex gap-2">
            <Chip>
              {event.event}
              {event.progress != null ? ` · ${event.progress}%` : ""}
            </Chip>
            {event.discipline && <Chip tone="info">{event.discipline}</Chip>}
          </div>
        </div>
        <div className="rounded border border-border bg-background p-3">
          {activity && candidate ? (
            <>
              <button
                className="text-left text-sm font-semibold text-primary hover:underline"
                onClick={() => openActivity(activity.id)}
              >
                {activity.id} — {activity.name}
              </button>
              <div className="mt-2">
                <ConfidenceBadge value={candidate.confidence} />
              </div>
              <div className="mt-2 text-xs font-semibold">Why it matched</div>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {candidate.reasons.slice(0, 5).map((r) => (
                  <li key={r}>✓ {r}</li>
                ))}
                {candidate.ambiguities.map((r) => (
                  <li key={r} className="text-warning">
                    ! {r}
                  </li>
                ))}
              </ul>
              {event.candidates.slice(1).map((c) => (
                <div key={c.activityId} className="mt-1 text-xs text-muted-foreground">
                  Alternative: {c.activityId} · {c.confidence}%
                </div>
              ))}
            </>
          ) : (
            <div className="text-sm text-warning">
              No schedule activity exceeded the review threshold. Route to Missing Activity
              Detector.
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

export function IngestionPage() {
  const { reports, addReport, addUploadedFile, processReport, events } = useStore();
  const [error, setError] = useState("");
  const [processed, setProcessed] = useState<string | null>(null);
  const loadDemo = (key: keyof typeof DEMO_REPORTS) => {
    setError("");
    setProcessed(addReport(key));
  };
  const upload = async (file?: File) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["csv", "txt"].includes(ext)) {
      setError("Choose a .csv or .txt file. XLSX parsing is not enabled in this prototype.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File exceeds the 5 MB upload limit.");
      return;
    }
    try {
      setError("");
      setProcessed(await addUploadedFile(file));
    } catch {
      setError("The selected file could not be read.");
    }
  };
  const process = (id: string) => {
    const results = processReport(id);
    setProcessed(id);
    setError(results.length ? "" : "No report lines were available to process.");
  };
  const report = reports.find((r) => r.id === processed);
  return (
    <>
      <PageHeader
        eyebrow="Capture & Link"
        title="Data Ingestion Center"
        description="Import execution observations, preserve their source, then extract and match candidate schedule events."
        actions={
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
            <FileUp className="h-4 w-4" />
            Upload CSV / TXT
            <input
              className="hidden"
              type="file"
              accept=".csv,.txt,text/plain,text/csv"
              onChange={(e) => void upload(e.target.files?.[0])}
            />
          </label>
        }
      />
      {error && (
        <div
          role="alert"
          className="mb-4 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
        <Panel title="Judge-friendly demo reports">
          <p className="mb-3 text-xs text-muted-foreground">
            Synthetic report content, ready to process using deterministic extraction.
          </p>
          <div className="space-y-2">
            {(["daily", "sheet", "diary"] as const).map((key) => (
              <Button
                key={key}
                variant="outline"
                className="w-full justify-between"
                onClick={() => loadDemo(key)}
              >
                {DEMO_REPORTS[key].source}
                <span className="font-mono text-[10px]">LOAD</span>
              </Button>
            ))}
          </div>
        </Panel>
        <Panel title="Recent source reports">
          {reports.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-0"
            >
              <div>
                <div className="text-sm font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.source} · {r.fileType} · {r.lines.length} lines
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Chip tone={r.status === "Processed" ? "success" : "warning"}>{r.status}</Chip>
                {r.lines.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => process(r.id)}>
                    {events.some((e) => e.reportId === r.id) ? "View events" : "Process Report"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </Panel>
      </div>
      {report && (
        <Panel title={`Extracted events — ${report.source}`} className="mt-4">
          {events.filter((e) => e.reportId === report.id).length ? (
            events
              .filter((e) => e.reportId === report.id)
              .map((e) => <EventCard key={e.id} event={e} />)
          ) : (
            <Empty>Select Process Report to extract and match observations.</Empty>
          )}
        </Panel>
      )}
    </>
  );
}

export function ReviewPage() {
  const { events, approveEvent, rejectEvent, flagEvent, canApprove, activities } = useStore();
  const [selection, setSelection] = useState<Record<string, string>>({});
  const pending = events.filter((e) => ["pending", "flagged"].includes(e.status));
  return (
    <>
      <PageHeader
        eyebrow="Human verification"
        title="Planner Review Center"
        description="Review extraction and schedule evidence before actual progress is updated."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Chip tone="warning">{pending.length} awaiting review</Chip>
        <Chip tone="success">Baseline schedule remains unchanged</Chip>
      </div>
      {!canApprove && (
        <div className="mb-3 text-sm text-warning">
          Current demo role is read-only. Select Project Planner or Project Manager to review.
        </div>
      )}
      {pending.length ? (
        pending.map((e) => (
          <EventCard
            key={e.id}
            event={e}
            actions={
              <div className="flex flex-wrap items-center gap-1">
                <select
                  aria-label={`Choose activity for ${e.id}`}
                  className="h-8 max-w-64 rounded border border-input bg-background px-2 text-xs"
                  value={selection[e.id] ?? e.candidates[0]?.activityId ?? ""}
                  onChange={(x) => setSelection((prev) => ({ ...prev, [e.id]: x.target.value }))}
                >
                  {e.candidates.map((candidate) => (
                    <option key={candidate.activityId} value={candidate.activityId}>
                      {candidate.activityId} —{" "}
                      {activities.find((a) => a.id === candidate.activityId)?.name} (
                      {candidate.confidence}%)
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={!canApprove || !e.candidates[0]}
                  onClick={() => approveEvent(e.id, selection[e.id] ?? e.candidates[0]?.activityId)}
                >
                  <Check className="mr-1 h-3 w-3" />
                  Approve Match
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canApprove}
                  onClick={() => flagEvent(e.id)}
                >
                  Flag
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!canApprove}
                  onClick={() => rejectEvent(e.id)}
                >
                  <X className="mr-1 h-3 w-3" />
                  Reject
                </Button>
              </div>
            }
          />
        ))
      ) : (
        <Empty>
          No observations are waiting for planner review. Process a report to add events.
        </Empty>
      )}
    </>
  );
}

export function MatchingPage() {
  const { events } = useStore();
  return (
    <>
      <PageHeader
        eyebrow="Intelligence"
        title="AI Activity Matching"
        description="Deterministic multi-signal ranking with visible evidence; all suggestions require planner review."
      />
      {events.length ? (
        events.map((e) => <EventCard key={e.id} event={e} />)
      ) : (
        <Empty>Process a report to create explainable schedule match candidates.</Empty>
      )}
    </>
  );
}

export function ExtractionPage() {
  const { events, reports } = useStore();
  return (
    <>
      <PageHeader
        eyebrow="Capture & Link"
        title="AI Extraction"
        description="Rule-based demo extraction identifies event type, discipline, area, progress, date and time. No external LLM is configured."
      />
      <Panel title="Extraction queue">
        {events.length ? (
          events.map((e) => (
            <div
              className="grid gap-2 border-b border-border py-3 text-sm md:grid-cols-[130px_1fr_130px_110px]"
              key={e.id}
            >
              <Mono>{e.id}</Mono>
              <span>{e.text}</span>
              <span>
                {e.discipline ?? "Discipline unknown"} · {e.event}
              </span>
              <Chip tone="info">{e.extractionConfidence}% extraction confidence</Chip>
            </div>
          ))
        ) : (
          <Empty>Process an imported report to see extracted events.</Empty>
        )}
      </Panel>
      <div className="mt-4 text-xs text-muted-foreground">
        Source reports retained: {reports.length} · Extraction mode: deterministic local rules
      </div>
    </>
  );
}

export function SchedulePage() {
  const { activities, openActivity } = useStore();
  const [query, setQuery] = useState("");
  const [discipline, setDiscipline] = useState("All");
  const [status, setStatus] = useState("All");
  const filtered = activities.filter(
    (a) =>
      (discipline === "All" || a.discipline === discipline) &&
      (status === "All" || statusOf(a) === status) &&
      `${a.id} ${a.name} ${a.area}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="Command"
        title="L5/L6 Schedule Explorer"
        description={`${activities.length} baseline activities · Planned dates and actual progress remain separate.`}
      />
      <Panel>
        <div className="mb-3 grid gap-2 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search ID, activity, area"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="h-9 rounded border border-input bg-background px-2 text-sm"
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value)}
          >
            <option>All</option>
            {DISCIPLINES.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            className="h-9 rounded border border-input bg-background px-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>All</option>
            {["Completed", "In Progress", "Delayed", "Not Started"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                {[
                  "Activity / WBS",
                  "Discipline",
                  "Baseline",
                  "Actual",
                  "Progress",
                  "Status",
                  "Variance",
                ].map((v) => (
                  <th key={v} className="px-2 py-2 font-medium">
                    {v}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  className="cursor-pointer border-b border-border/70 hover:bg-accent/40"
                  onClick={() => openActivity(a.id)}
                >
                  <td className="px-2 py-2">
                    <div className="font-medium text-primary">
                      {a.id} · {a.name}
                    </div>
                    <Mono className="text-muted-foreground">
                      {a.level} · {a.wbs}
                    </Mono>
                  </td>
                  <td className="px-2 py-2">{a.discipline}</td>
                  <td className="px-2 py-2">
                    {fmt(a.plannedStart)} – {fmt(a.plannedFinish)}
                  </td>
                  <td className="px-2 py-2">
                    {fmt(a.actualStart)} – {fmt(a.actualFinish)}
                  </td>
                  <td className="px-2 py-2">
                    <div className="w-20">
                      <Bar value={a.progress} />
                    </div>
                    {a.progress}%
                  </td>
                  <td className="px-2 py-2">
                    <StatusChip status={statusOf(a)} />
                  </td>
                  <td className="px-2 py-2">
                    {forecastVariance(a) > 0
                      ? `+${forecastVariance(a)}d`
                      : `${forecastVariance(a)}d`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <Empty>No activities match these filters.</Empty>}
        </div>
      </Panel>
    </>
  );
}

export function TimeAgentPage() {
  const { activities, timeAgentCommit } = useStore();
  const [text, setText] = useState("");
  const [selected, setSelected] = useState("");
  const [done, setDone] = useState("");
  const ex = useMemo(() => (text.trim() ? extract(text, TODAY) : null), [text]);
  const candidates = useMemo(() => (ex ? match(text, ex, activities) : []), [text, ex, activities]);
  const choice = selected || candidates[0]?.activityId || "";
  const confidence = candidates.find((c) => c.activityId === choice)?.confidence ?? 0;
  const confirm = () => {
    if (!ex || !choice) return;
    const result = timeAgentCommit(text, ex, choice, confidence);
    setDone(
      result === "applied"
        ? "Confirmed and applied to actual progress."
        : "Saved to planner review; low confidence was not applied automatically.",
    );
  };
  return (
    <>
      <PageHeader
        eyebrow="Field capture"
        title="Time Agent"
        description="Type a supervisor update. Local deterministic parsing suggests an activity and explains the confidence; no speech recognition is claimed."
      />
      <Panel title="Natural-language progress entry">
        <label className="mb-2 block text-sm">Observation</label>
        <Input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setDone("");
          }}
          placeholder="Piping line 24 erection started at 9:30 AM in Area A"
        />
        <div className="mt-2 text-xs text-muted-foreground">
          Examples: “Pump P-101 installation started” · “24 inch line erection completed Area A”
        </div>
        {ex && (
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
            <div className="rounded border border-border p-3">
              <div className="text-xs font-semibold uppercase tracking-wide">Detected event</div>
              <div className="mt-2 text-sm">
                {ex.event} · {ex.discipline ?? "Discipline not identified"} · {ex.date}
                {ex.time ? ` ${ex.time}` : ""}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {ex.description}
                {ex.progress != null ? ` · ${ex.progress}%` : ""}
              </div>
            </div>
            <div className="rounded border border-border p-3">
              <div className="text-xs font-semibold uppercase tracking-wide">
                Suggested schedule activity
              </div>
              <select
                className="mt-2 h-9 w-full rounded border border-input bg-background px-2 text-sm"
                value={choice}
                onChange={(e) => setSelected(e.target.value)}
              >
                {candidates.map((c) => (
                  <option key={c.activityId} value={c.activityId}>
                    {c.activityId} · {activities.find((a) => a.id === c.activityId)?.name} (
                    {c.confidence}%)
                  </option>
                ))}
              </select>
              <div className="mt-2">
                <ConfidenceBadge value={confidence} />
              </div>
              <ul className="mt-2 text-xs text-muted-foreground">
                {(candidates.find((c) => c.activityId === choice)?.reasons ?? [])
                  .slice(0, 4)
                  .map((r) => (
                    <li key={r}>✓ {r}</li>
                  ))}
              </ul>
            </div>
          </div>
        )}
        {done && (
          <div role="status" className="mt-3 rounded bg-success/10 p-2 text-sm text-success">
            {done}
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <Button disabled={!ex || !choice} onClick={confirm}>
            Confirm update
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setText("");
              setSelected("");
              setDone("");
            }}
          >
            Cancel / clear
          </Button>
        </div>
      </Panel>
    </>
  );
}

export function UnmatchedPage() {
  const { unmatched, unmatchedAction, activities, openActivity } = useStore();
  const [links, setLinks] = useState<Record<string, string>>({});
  return (
    <>
      <PageHeader
        eyebrow="Intelligence"
        title="Missing Activity Detector"
        description="Low-scoring or unrepresented site observations require a planner decision; the system never adds schedule scope automatically."
      />
      {unmatched.map((u) => (
        <Panel
          key={u.id}
          className="mb-3"
          title={
            <span>
              {u.id} · {u.status}
            </span>
          }
        >
          <p className="text-sm">“{u.text}”</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {u.source} · {fmt(u.date)} · closest match {u.closest ?? "none"} ({u.closestConfidence}
            %)
          </p>
          <p className="mt-2 text-xs">{u.explanation}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => unmatchedAction(u.id, "send")}>
              Send to Planner
            </Button>
            <Button size="sm" variant="outline" onClick={() => unmatchedAction(u.id, "create")}>
              Mark as New Activity
            </Button>
            <select
              aria-label={`Choose an activity to link ${u.id}`}
              className="h-8 max-w-72 rounded border border-input bg-background px-2 text-xs"
              value={links[u.id] ?? u.closest ?? ""}
              onChange={(e) => setLinks((prev) => ({ ...prev, [u.id]: e.target.value }))}
            >
              <option value="">Choose existing activity</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id} — {a.name}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              disabled={!links[u.id] && !u.closest}
              onClick={() => {
                const id = links[u.id] ?? u.closest;
                if (id) {
                  unmatchedAction(u.id, "link", id);
                  openActivity(id);
                }
              }}
            >
              Link to Existing Activity
            </Button>
            <Button size="sm" variant="ghost" onClick={() => unmatchedAction(u.id, "dismiss")}>
              Ignore
            </Button>
          </div>
          {u.linkedActivityId && (
            <p className="mt-2 text-xs text-success">
              Linked to {u.linkedActivityId}; no progress was applied.
            </p>
          )}
        </Panel>
      ))}
      {!unmatched.length && <Empty>No unmatched observations are recorded.</Empty>}
    </>
  );
}

export function ConflictsPage() {
  const { conflicts, resolveConflict, activities, role } = useStore();
  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Data Conflicts"
        description="Contradictory source reports remain visible until a planner records a resolution."
      />
      {conflicts.map((c) => (
        <Panel
          key={c.id}
          className="mb-3"
          title={
            <span className="flex items-center gap-2">
              {c.id} <Chip tone={c.status === "Open" ? "danger" : "success"}>{c.status}</Chip>
            </span>
          }
        >
          <div className="mb-3 text-sm font-semibold">
            {c.activityId} — {activities.find((a) => a.id === c.activityId)?.name}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {c.sources.map((s) => (
              <div key={s.document} className="rounded border border-border p-3">
                <div className="text-sm font-medium">
                  {s.source} · {s.progress}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.document} · {s.timestamp} · {s.author}
                </div>
                <p className="mt-2 text-sm">{s.note}</p>
              </div>
            ))}
          </div>
          {c.status === "Open" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {[...new Set(c.sources.map((s) => s.progress))].map((p) => (
                <Button
                  key={p}
                  size="sm"
                  disabled={!(role === "planner" || role === "manager")}
                  onClick={() =>
                    resolveConflict(
                      c.id,
                      p,
                      `Selected source evidence reporting ${p}% after review.`,
                      true,
                    )
                  }
                >
                  Resolve at {p}%
                </Button>
              ))}
            </div>
          )}
          {c.resolution && <p className="mt-2 text-xs text-success">Resolution: {c.resolution}</p>}
        </Panel>
      ))}
      {!conflicts.length && <Empty>No report conflicts are currently recorded.</Empty>}
    </>
  );
}

export function CrossDisciplinePage() {
  const { activities, openActivity } = useStore();
  return (
    <>
      <PageHeader
        eyebrow="Coordination intelligence"
        title="Cross-Discipline Intelligence"
        description="Potential downstream impacts from schedule dependencies. These are early warnings for planner review, not certainty claims."
      />
      {CROSS_LINKS.map((link) => (
        <Panel
          key={link.id}
          className="mb-3"
          title={
            <span className="flex items-center gap-2">
              {link.title}
              <Chip
                tone={
                  link.severity === "high"
                    ? "danger"
                    : link.severity === "medium"
                      ? "warning"
                      : "info"
                }
              >
                {link.severity} potential impact
              </Chip>
            </span>
          }
        >
          <div className="grid gap-2 md:grid-cols-4">
            {link.chain.map((x, i) => (
              <button
                key={x.activityId}
                className="rounded border border-border p-3 text-left hover:border-primary"
                onClick={() => openActivity(x.activityId)}
              >
                <div className="font-mono text-xs text-primary">{x.activityId}</div>
                <div className="my-1 text-xs">
                  {activities.find((a) => a.id === x.activityId)?.name ?? "Related activity"}
                </div>
                <div className="text-[11px] text-muted-foreground">{x.state}</div>
                {i < link.chain.length - 1 && (
                  <div className="mt-2 text-xs text-primary">↓ downstream</div>
                )}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            <AlertTriangle className="mr-1 inline h-4 w-4 text-warning" />
            {link.insight}
          </p>
        </Panel>
      ))}
    </>
  );
}

export function MemoryPage() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const rows = MEMORY.filter((m) =>
    `${m.activityType} ${m.discipline} ${m.contractor}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="Historical intelligence"
        title="Project Memory"
        description="Synthetic historical records from previous projects; structured search and deterministic predefined insights."
      />
      <Panel title="Ask project memory">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search piping, delays, contractor or activity"
          />
          <Button onClick={() => setAnswer(answerMemory(query, MEMORY))} disabled={!query.trim()}>
            Get insight
          </Button>
        </div>
        {answer && <div className="mt-3 rounded bg-accent p-3 text-sm">{answer}</div>}
      </Panel>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {rows.map((m) => (
          <Panel
            key={m.activityType}
            title={m.activityType}
            actions={<Chip tone="info">{m.occurrences} occurrences</Chip>}
          >
            <div className="flex justify-between text-xs">
              <span>Planned average</span>
              <b>{m.plannedAvg} days</b>
            </div>
            <div className="mt-1 flex justify-between text-xs">
              <span>Actual average</span>
              <b>{m.actualAvg} days</b>
            </div>
            <div className="mt-2">
              <div className="mb-1 text-xs text-muted-foreground">Recorded delay causes</div>
              {m.causes.slice(0, 3).map((c) => (
                <div className="mt-1" key={c.cause}>
                  <div className="flex justify-between text-xs">
                    <span>{c.cause}</span>
                    <span>{c.share}%</span>
                  </div>
                  <Bar value={c.share} tone="warning" />
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              {m.contractor} · {m.previousProjects.join(" · ")}
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}

export function RiskPage() {
  const { activities, events, unmatched, conflicts, openActivity } = useStore();
  const signals = activities
    .filter((a) => statusOf(a) === "Delayed" || forecastVariance(a) >= 2)
    .map((a) => ({
      a,
      score: Math.min(95, 55 + forecastVariance(a) * 5 + (a.dependencies.length ? 10 : 0)),
    }))
    .sort((x, y) => y.score - x.score)
    .slice(0, 12);
  return (
    <>
      <PageHeader
        eyebrow="Rule-based · transparent"
        title="Early Warning Radar"
        description="Signals are computed from schedule variance, incomplete work, dependencies, unmatched observations and open conflicts."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Panel title="Open conflicts">
          <div className="text-2xl font-bold">
            {conflicts.filter((c) => c.status === "Open").length}
          </div>
          <div className="text-xs text-muted-foreground">Require source review</div>
        </Panel>
        <Panel title="Unmatched observations">
          <div className="text-2xl font-bold">
            {unmatched.filter((u) => u.status === "Open").length}
          </div>
          <div className="text-xs text-muted-foreground">Potential schedule scope gaps</div>
        </Panel>
        <Panel title="Pending reports">
          <div className="text-2xl font-bold">
            {events.filter((e) => e.status === "pending" || e.status === "flagged").length}
          </div>
          <div className="text-xs text-muted-foreground">Planner review queue</div>
        </Panel>
      </div>
      {signals.map(({ a, score }) => (
        <Panel
          key={a.id}
          className="mb-2"
          title={
            <span className="flex gap-2">
              {a.id} · {a.name}
              <Chip tone={score >= 80 ? "danger" : score >= 65 ? "warning" : "info"}>
                {score >= 80 ? "HIGH" : score >= 65 ? "MEDIUM" : "LOW"}
              </Chip>
            </span>
          }
          actions={
            <Button size="sm" variant="outline" onClick={() => openActivity(a.id)}>
              Investigate activity
            </Button>
          }
        >
          <div className="text-sm">
            Potential schedule risk: {a.progress}% complete against planned finish{" "}
            {fmt(a.plannedFinish)}; forecast variance {forecastVariance(a)} days.
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Evidence: {statusOf(a)} · {a.dependencies.length} linked dependencies · discipline{" "}
            {a.discipline}. Requires planner review.
          </div>
        </Panel>
      ))}
    </>
  );
}

export function ProjectPage() {
  const s = useStore();
  const k = stats(s.activities, s.events, s.unmatched, s.conflicts);
  return (
    <>
      <PageHeader
        eyebrow="Project controls"
        title="Project Overview"
        description="Project baseline context and current synthetic execution snapshot."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Project identity">
          <div className="text-lg font-semibold">{PROJECT.name}</div>
          <Mono>{PROJECT.id}</Mono>
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            <div>Location: {PROJECT.location}</div>
            <div>Baseline: {PROJECT.baseline}</div>
            <div>
              Planned: {fmt(PROJECT.start)} — {fmt(PROJECT.finish)}
            </div>
            <div>Data source: {PROJECT.dataLabel}</div>
          </div>
        </Panel>
        <Panel title="Execution status">
          <div className="text-3xl font-bold">{k.progress}%</div>
          <div className="text-xs text-muted-foreground">
            Overall progress · planned {k.planned}%
          </div>
          <Bar value={k.progress} className="mt-3" />
          <div className="mt-3 text-sm">
            {k.completed} completed · {k.inProgress} in progress · {k.delayed} delayed
          </div>
        </Panel>
        <Panel title="Review and risk">
          <div className="space-y-2 text-sm">
            <div>
              {s.events.filter((e) => e.status === "pending").length} pending planner reviews
            </div>
            <div>
              {s.unmatched.filter((u) => u.status === "Open").length} unmatched observations
            </div>
            <div>{s.conflicts.filter((c) => c.status === "Open").length} active conflicts</div>
            <div>Schedule risk signals use deterministic rules</div>
          </div>
        </Panel>
      </div>
      <Panel title="Discipline progress" className="mt-4">
        {disciplineProgress(s.activities).map((d) => (
          <div
            key={d.discipline}
            className="mb-3 grid grid-cols-[120px_1fr_100px] items-center gap-3 text-xs"
          >
            <span>{d.discipline}</span>
            <Bar value={d.actual} tone={d.actual < d.planned - 10 ? "danger" : "info"} />
            <span>
              {d.actual}% / plan {d.planned}%
            </span>
          </div>
        ))}
      </Panel>
    </>
  );
}

export function AuditPage() {
  const { audit } = useStore();
  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Audit Trail"
        description="Recorded decisions preserve source evidence, previous and new values, reviewer, and confidence."
      />
      <Panel title={`${audit.length} recorded actions`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                {["Timestamp", "Reviewer", "Action", "Activity", "Field change", "Source"].map(
                  (x) => (
                    <th className="px-2 py-2" key={x}>
                      {x}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id} className="border-b border-border/70">
                  <td className="px-2 py-2">{a.timestamp}</td>
                  <td className="px-2 py-2">{a.reviewer}</td>
                  <td className="px-2 py-2">{a.status}</td>
                  <td className="px-2 py-2 font-mono">{a.activityId}</td>
                  <td className="px-2 py-2">
                    {a.field}: {a.previous} → {a.next}
                  </td>
                  <td className="px-2 py-2">
                    {a.source}
                    <div className="max-w-[300px] truncate text-muted-foreground">
                      {a.sourceText}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

export function AnalyticsPage() {
  const { activities } = useStore();
  const items = disciplineProgress(activities);
  return (
    <>
      <PageHeader
        eyebrow="Portfolio reporting"
        title="Reports & Analytics"
        description="Live schedule metrics calculated from stored synthetic activity records."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((d) => (
          <Panel
            key={d.discipline}
            title={d.discipline}
            actions={<Chip>{d.count} activities</Chip>}
          >
            <div className="flex justify-between text-sm">
              <span>Actual progress</span>
              <b>{d.actual}%</b>
            </div>
            <Bar value={d.actual} className="mt-2" />
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              <span>Planned {d.planned}%</span>
              <span>{d.delayed} delayed</span>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}

export function SettingsPage() {
  const { settings, updateSettings, reset, role, setRole, persistenceError } = useStore();
  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Demo access, matching thresholds and local SQLite persistence status."
      />
      <Panel title="Demo access">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm">Current role</span>
          <select
            className="h-9 rounded border border-input bg-background px-2"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {["planner", "manager", "supervisor", "contractor", "executive"].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <Chip tone={persistenceError ? "danger" : "success"}>
            {persistenceError ?? "SQLite API connected"}
          </Chip>
        </div>
      </Panel>
      <Panel title="Matching and review thresholds" className="mt-4">
        <div className="grid gap-3 md:grid-cols-3">
          {(
            [
              ["highThreshold", "High confidence"],
              ["reviewThreshold", "Medium confidence"],
              ["unmatchedThreshold", "Unmatched threshold"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm">
              {label}
              <Input
                className="mt-1"
                type="number"
                min="0"
                max="100"
                value={settings[key]}
                onChange={(e) => updateSettings({ [key]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
      </Panel>
      <Panel title="Demo database" className="mt-4">
        <p className="mb-3 text-sm text-muted-foreground">
          Reset restores the deterministic synthetic starting state in the local SQLite database.
        </p>
        <Button variant="destructive" onClick={reset}>
          Reset demo workspace
        </Button>
      </Panel>
    </>
  );
}
