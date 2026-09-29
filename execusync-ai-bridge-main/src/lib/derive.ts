import type {
  Activity,
  ActivityStatus,
  Conflict,
  Discipline,
  ExtractedEvent,
  Unmatched,
} from "./types";
import { TODAY, addDays, diffDays } from "./dates";
import { DISCIPLINES } from "./data";

export function statusOf(a: Activity): ActivityStatus {
  if (a.actualFinish || a.progress >= 100) return "Completed";
  if (!a.actualStart) return diffDays(TODAY, a.plannedStart) > 0 ? "Delayed" : "Not Started";
  if (diffDays(a.actualStart, a.plannedStart) >= 3 || diffDays(TODAY, a.plannedFinish) > 0)
    return "Delayed";
  return "In Progress";
}

/** Start variance in days (actual vs baseline); baseline is never modified. */
export function startVariance(a: Activity): number | null {
  if (!a.actualStart)
    return diffDays(TODAY, a.plannedStart) > 0 ? diffDays(TODAY, a.plannedStart) : null;
  return diffDays(a.actualStart, a.plannedStart);
}

export function forecastFinish(a: Activity): string {
  if (a.actualFinish) return a.actualFinish;
  const start = a.actualStart ?? (diffDays(TODAY, a.plannedStart) > 0 ? TODAY : a.plannedStart);
  const remaining = Math.ceil(a.duration * (1 - a.progress / 100));
  const elapsedFloor = a.actualStart ? addDays(TODAY, remaining) : addDays(start, a.duration);
  const byPlan = addDays(start, a.duration);
  return diffDays(elapsedFloor, byPlan) > 0 ? elapsedFloor : byPlan;
}

export function forecastVariance(a: Activity): number {
  return diffDays(forecastFinish(a), a.plannedFinish);
}

export function overallProgress(acts: Activity[]): number {
  const tot = acts.reduce((s, a) => s + a.duration, 0);
  return Math.round(acts.reduce((s, a) => s + a.duration * a.progress, 0) / tot);
}

export function plannedProgressAt(acts: Activity[], day: string): number {
  const tot = acts.reduce((s, a) => s + a.duration, 0);
  const v = acts.reduce((s, a) => {
    const f = Math.max(0, Math.min(1, diffDays(day, a.plannedStart) / a.duration));
    return s + a.duration * f * 100;
  }, 0);
  return Math.round(v / tot);
}

function actualProgressAt(acts: Activity[], day: string): number {
  const tot = acts.reduce((s, a) => s + a.duration, 0);
  const v = acts.reduce((s, a) => {
    if (!a.actualStart || diffDays(day, a.actualStart) < 0) return s;
    const end = a.actualFinish ?? TODAY;
    const span = Math.max(1, diffDays(end, a.actualStart));
    const f = Math.min(1, diffDays(day, a.actualStart) / span);
    return s + a.duration * f * a.progress;
  }, 0);
  return Math.round(v / tot);
}

export function sCurve(acts: Activity[]) {
  const out: { date: string; planned: number; actual: number | null }[] = [];
  for (let w = -9; w <= 3; w++) {
    const d = addDays(TODAY, w * 5);
    out.push({
      date: d,
      planned: plannedProgressAt(acts, d),
      actual: w <= 0 ? actualProgressAt(acts, d) : null,
    });
  }
  return out;
}

export function stats(
  acts: Activity[],
  events: ExtractedEvent[],
  unmatched: Unmatched[],
  conflicts: Conflict[],
) {
  const st = acts.map(statusOf);
  const conf = events.filter((e) => e.candidates[0]).map((e) => e.candidates[0]!.confidence);
  const verifiedConf = acts.filter((a) => a.aiConfidence).map((a) => a.aiConfidence as number);
  const all = conf.length ? conf : verifiedConf;
  return {
    total: acts.length,
    completed: st.filter((s) => s === "Completed").length,
    inProgress: st.filter((s) => s === "In Progress").length,
    delayed: st.filter((s) => s === "Delayed").length,
    notStarted: st.filter((s) => s === "Not Started").length,
    unmatched: unmatched.filter((u) => u.status === "Open" || u.status === "Sent to Planner")
      .length,
    conflicts: conflicts.filter((c) => c.status === "Open").length,
    confidence: Math.round(all.reduce((s, c) => s + c, 0) / Math.max(1, all.length)),
    progress: overallProgress(acts),
    planned: plannedProgressAt(acts, TODAY),
  };
}

export function disciplineProgress(acts: Activity[]) {
  return DISCIPLINES.map((d: Discipline) => {
    const xs = acts.filter((a) => a.discipline === d);
    return {
      discipline: d,
      actual: overallProgress(xs),
      planned: plannedProgressAt(xs, TODAY),
      delayed: xs.filter((a) => statusOf(a) === "Delayed").length,
      count: xs.length,
    };
  });
}
