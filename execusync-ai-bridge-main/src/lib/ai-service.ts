/**
 * Deterministic AI service (prototype).
 * Interface is intentionally narrow so an LLM-backed implementation
 * (e.g. server function calling the AI gateway) can replace it later.
 */
import type { Activity, Candidate, Discipline, EventType, MemoryRecord } from "./types";
import { TODAY, addDays } from "./dates";

export interface Extraction {
  discipline: Discipline | null;
  description: string;
  area: string | null;
  event: EventType;
  date: string;
  time: string | null;
  progress: number | null;
  confidence: number;
}

const DISC_KEYWORDS: [Discipline, RegExp][] = [
  [
    "Instrumentation",
    /\b(transmitter|instrument|calibration|impulse|detector|loop check|control valve|junction box|pt-?\d+|cv-?\d+)\b/i,
  ],
  ["Mechanical", /\b(column|exchanger|vessel|tank|air cooler|internals|static equipment)\b/i],
  ["Electrical", /\b(cable|tray|mcc|transformer|substation|earthing|lighting|power|electrical)\b/i],
  ["Civil", /\b(foundation|concret\w*|grading|trench|drainage|paving|plinth|grout\w*|civil)\b/i],
  ["Rotating", /\b(pump|compressor|fan|coupling|alignment)\b/i],
  ["HSE", /\b(scaffold\w*|permit|safety|fire protection|hse|audit)\b/i],
  ["Piping", /\b(spool|line|pipe|piping|weld|ndt|hydrotest|header|bypass|valve)\b/i],
];

const SYN: Record<string, string> = {
  spool: "line",
  spools: "line",
  pipe: "line",
  piping: "line",
  erection: "erect",
  erected: "erect",
  erecting: "erect",
  installed: "install",
  installation: "install",
  installing: "install",
  mounted: "install",
  mounting: "install",
  fitted: "install",
  setting: "set",
  concreting: "concrete",
  concreted: "concrete",
  cast: "concrete",
  supports: "support",
  trays: "tray",
  transmitter: "transmitter",
  panels: "panel",
  calibrated: "calibration",
  inspection: "inspect",
  inspected: "inspect",
  audit: "inspect",
  scaffold: "scaffolding",
  aligned: "alignment",
  align: "alignment",
  pulling: "pull",
  pulled: "pull",
  cables: "cable",
  detectors: "detector",
};
const STOP = new Set([
  "the",
  "in",
  "at",
  "of",
  "for",
  "to",
  "a",
  "an",
  "on",
  "and",
  "today",
  "yesterday",
  "started",
  "start",
  "completed",
  "complete",
  "done",
  "reached",
  "progressed",
  "progressing",
  "about",
  "approx",
  "percent",
  "inch",
  "area",
  "unit",
  "works",
  "work",
  "near",
  "per",
  "is",
  "was",
  "this",
  "morning",
  "l1",
  "l2",
  "l3",
  "piping",
  "electrical",
  "civil",
  "mechanical",
  "instrumentation",
]);

export function norm(text: string) {
  const t = text
    .toLowerCase()
    .replace(/\bline\s+(\d{1,2})\b(?!\s*(%|percent|inch|"))/g, "line size$1 ")
    .replace(/(\d+)\s*(?:"|”|inch|in\b)/g, " size$1 ");
  const tags = new Set<string>();
  for (const m of text.matchAll(/\b([A-Z]{1,3})[- ]?(\d{1,4})\b/gi)) {
    const p = m[1]!.toUpperCase();
    if (
      [
        "PR",
        "PT",
        "CV",
        "HT",
        "SS",
        "TR",
        "AC",
        "CT",
        "F",
        "P",
        "K",
        "C",
        "E",
        "V",
        "T",
        "FI",
      ].includes(p)
    )
      tags.add(p + Number(m[2]!));
  }
  for (const m of text.matchAll(/\bunit\s*(\d)\b/gi)) tags.add("UNIT" + m[1]);
  const sizes = new Set<string>();
  for (const m of t.matchAll(/size(\d+)/g)) sizes.add(m[1]!);
  const suffix = new Set<string>();
  for (const m of text.matchAll(/(?:"|inch)\s*-?\s*([A-Z]{2})\b(?!-?\d)|\b([A-Z])\2\b/g))
    suffix.add((m[1] || m[2]! + m[2]!).toUpperCase());
  const words = t
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w) && !/^size\d+$/.test(w) && !/^\d+$/.test(w) && w.length > 1)
    .map((w) => SYN[w] ?? w);
  return { tags, sizes, suffix, words: new Set(words) };
}

export function extract(text: string, fallbackDate = TODAY): Extraction {
  const lower = text.toLowerCase();
  const discipline = DISC_KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? null;
  const areaM = text.match(/\barea\s*([abc])\b/i);
  const area = areaM ? `Area ${areaM[1]!.toUpperCase()}` : null;
  const pct = text.match(/(\d{1,3})\s*(%|percent)/i);
  const progress = pct ? Math.min(100, Number(pct[1]!)) : null;
  let event: EventType = "PROGRESS";
  if (/\b(started|start|commenced|mobilised|begun|began)\b/i.test(text) && progress === null)
    event = "START";
  if (/\b(completed|complete|finished|handed over)\b/i.test(text) && progress === null)
    event = "END";
  if (progress === 100) event = "END";
  if (
    progress === null &&
    event === "PROGRESS" &&
    /\b(installed|mounted|fitted|built|cast|erected)\b/i.test(text)
  )
    event = "END";
  const timeM = [...text.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/gi)].find(
    (m) => m[2] || m[3],
  );
  let time: string | null = null;
  if (timeM) {
    let h = Number(timeM[1]!);
    const ap = timeM[3]?.toLowerCase() ?? (/(morning)/.test(lower) ? "am" : h < 7 ? "pm" : "am");
    if (h > 12) h -= 12;
    time = `${String(h).padStart(2, "0")}:${timeM[2] ?? "00"} ${ap.toUpperCase()}`;
  }
  const date = /yesterday/i.test(text) ? addDays(fallbackDate, -1) : fallbackDate;
  const description = text
    .replace(
      /\b(started|completed|today|yesterday|reached|progressed to|progressing|in area [abc]|at \d{1,2}(:\d{2})?\s*(am|pm)?|this morning|about|approx\.?|\d{1,3}\s*(%|percent)( complete| done)?)\b/gi,
      "",
    )
    .replace(/[,.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const confidence = Math.min(
    99,
    80 +
      (discipline ? 8 : 0) +
      (area ? 4 : 0) +
      (progress !== null || event !== "PROGRESS" ? 5 : 0) +
      (time ? 2 : 0),
  );
  return {
    discipline,
    description: description.charAt(0).toUpperCase() + description.slice(1),
    area,
    event,
    date,
    time,
    progress,
    confidence,
  };
}

export function match(text: string, ex: Extraction, activities: Activity[]): Candidate[] {
  const o = norm(text);
  const scored = activities.map((a) => {
    const n = norm(a.name);
    let s = 0;
    const reasons: string[] = [];
    const ambiguities: string[] = [];
    if (ex.discipline === a.discipline) {
      s += 0.22;
      reasons.push(`Discipline matches: ${a.discipline}`);
    } else s -= 0.12;
    const sharedTags = [...o.tags].filter((t) => n.tags.has(t));
    if (sharedTags.length) {
      s += 0.36;
      reasons.push(`Equipment / tag reference matches: ${sharedTags.join(", ")}`);
    }
    const sharedSizes = [...o.sizes].filter((t) => n.sizes.has(t));
    if (sharedSizes.length) {
      s += 0.3;
      reasons.push(`Line size matches: ${sharedSizes[0]} inch`);
    } else if (o.sizes.size && n.sizes.size) s -= 0.2;
    if (ex.area && ex.area === a.area) {
      s += 0.1;
      reasons.push(`Area matches: ${a.area}`);
    } else if (ex.area && ex.area !== a.area) s -= 0.1;
    const shared = [...o.words].filter((w) => n.words.has(w));
    if (n.words.size) {
      const k = shared.length / Math.max(2, Math.min(n.words.size, o.words.size));
      s += Math.min(0.34, k * 0.36);
      if (shared.length)
        reasons.push(`Semantic similarity on: ${shared.map((w) => `"${w}"`).join(", ")}`);
    }
    const suffixShared = [...o.suffix].filter((x) => n.suffix.has(x));
    if (suffixShared.length) {
      s += 0.06;
      reasons.push(`Line designation matches: ${suffixShared[0]}`);
    } else if (n.suffix.size && s > 0.5)
      ambiguities.push(`${[...n.suffix][0]} suffix was not explicitly mentioned.`);
    if (a.actualFinish && ex.event !== "END") {
      s -= 0.15;
      ambiguities.push("Activity is already recorded as complete.");
    } else if (s > 0.4) reasons.push("Schedule context matches (activity open in current window)");
    if (ex.event === "START" && a.actualStart && s > 0.5)
      ambiguities.push("Activity already has an actual start recorded.");
    const confidence = Math.max(5, Math.min(98, Math.round(20 + s * 82)));
    return { activityId: a.id, confidence, reasons, ambiguities };
  });
  scored.sort((a, b) => b.confidence - a.confidence);
  const top = scored.slice(0, 3);
  if (top[1] && top[0]!.confidence - top[1].confidence < 12 && top[0]!.confidence > 60)
    top[0]!.ambiguities.push(
      `Close alternative candidate: ${top[1].activityId} (${top[1].confidence}%).`,
    );
  return top;
}

export function confidenceBand(c: number): "High" | "Medium" | "Review" {
  return c >= 90 ? "High" : c >= 75 ? "Medium" : "Review";
}

export function answerMemory(q: string, memory: MemoryRecord[]): string {
  const l = q.toLowerCase();
  const byVar = [...memory].sort((a, b) => b.actualAvg / b.plannedAvg - a.actualAvg / a.plannedAvg);
  if (/highest|worst|most variance|which discipline/.test(l)) {
    const r = byVar[0]!;
    return `Across ${memory.reduce((s, m) => s + m.occurrences, 0)} synthetic historical occurrences, ${r.discipline} ("${r.activityType}") shows the highest relative variance: planned ${r.plannedAvg} d vs actual ${r.actualAvg} d (+${Math.round((r.actualAvg / r.plannedAvg - 1) * 100)}%). Leading recorded cause: ${r.causes[0]!.cause.toLowerCase()}.`;
  }
  const rec =
    memory.find((m) =>
      l
        .split(/\W+/)
        .some((w) => w.length > 3 && m.activityType.toLowerCase().includes(w.replace(/s$/, ""))),
    ) ?? memory.find((m) => l.includes(m.discipline.toLowerCase()));
  if (!rec)
    return "No closely matching activity type found in project memory. Try asking about pipe erection, pump installation, foundations, cable pulling, instruments or equipment installation.";
  if (/delay|cause|why/.test(l))
    return `"${rec.activityType}" has ${rec.occurrences} recorded occurrences. Common delay causes: ${rec.causes.map((c) => `${c.cause} (${c.share}%)`).join(", ")}. Average variance is +${(rec.actualAvg - rec.plannedAvg).toFixed(1)} days.`;
  return `"${rec.activityType}" is typically planned at ${rec.plannedAvg} days and historically takes ${rec.actualAvg} days on average (${rec.occurrences} occurrences, variance +${(rec.actualAvg - rec.plannedAvg).toFixed(1)} d). Most frequent contractor: ${rec.contractor}.`;
}
