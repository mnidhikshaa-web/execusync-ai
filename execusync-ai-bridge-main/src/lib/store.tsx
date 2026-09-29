import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Activity,
  AuditLog,
  Conflict,
  ExtractedEvent,
  Role,
  SiteReport,
  Unmatched,
} from "./types";
import {
  buildActivities,
  DEMO_REPORTS,
  SEED_AUDIT,
  SEED_CONFLICTS,
  SEED_REPORTS,
  SEED_UNMATCHED,
} from "./data";
import { extract, match, type Extraction } from "./ai-service";
import { TODAY, fmt, nowStamp } from "./dates";
import { api } from "./api";

export const ROLE_LABEL: Record<Role, string> = {
  manager: "Project Manager",
  planner: "Project Planner",
  supervisor: "Site Supervisor",
  contractor: "Contractor",
  executive: "Executive Viewer",
};

export interface Settings {
  highThreshold: number;
  reviewThreshold: number;
  unmatchedThreshold: number;
}

interface State {
  role: Role;
  activities: Activity[];
  reports: SiteReport[];
  events: ExtractedEvent[];
  audit: AuditLog[];
  unmatched: Unmatched[];
  conflicts: Conflict[];
  settings: Settings;
  seq: number;
}

function initial(): State {
  const activities = buildActivities();
  const seedLines = [
    { text: "Line 16 inch ZZ weld NDT progressed 62%.", src: "Supervisor Site Diary 27-Sep" },
    {
      text: "Area lighting utilities block poles erected, 40% done Area C.",
      src: "Supervisor Site Diary 27-Sep",
    },
    {
      text: "Control valve CV-110 installation started on Area B.",
      src: "Daily Progress Report #027",
    },
  ];
  const events = seedLines.map((l, i) =>
    makeEvent(
      `EVT-0${90 + i}`,
      "RPT-027",
      l.src,
      l.text,
      extract(l.text, "2026-09-27"),
      activities,
    ),
  );
  return {
    role: "planner",
    activities,
    reports: SEED_REPORTS,
    events,
    audit: SEED_AUDIT,
    unmatched: SEED_UNMATCHED,
    conflicts: SEED_CONFLICTS,
    settings: { highThreshold: 90, reviewThreshold: 75, unmatchedThreshold: 65 },
    seq: 200,
  };
}

function makeEvent(
  id: string,
  reportId: string,
  source: string,
  text: string,
  ex: Extraction,
  acts: Activity[],
): ExtractedEvent {
  return {
    id,
    reportId,
    source,
    text,
    discipline: ex.discipline,
    description: ex.description,
    area: ex.area,
    event: ex.event,
    date: ex.date,
    time: ex.time,
    progress: ex.progress,
    extractionConfidence: ex.confidence,
    candidates: match(text, ex, acts),
    status: "pending",
  };
}

function applyEvent(
  a: Activity,
  e: { event: ExtractedEvent["event"]; date: string; progress: number | null },
): { next: Activity; field: string; prev: string; val: string } {
  const next = { ...a };
  let field = "Actual Progress";
  let prev = `${a.progress}%`;
  let val = prev;
  if (e.event === "START") {
    field = "Actual Start";
    prev = fmt(a.actualStart);
    next.actualStart = a.actualStart ?? e.date;
    next.progress = Math.max(a.progress, e.progress ?? 5);
    val = fmt(next.actualStart);
  } else if (e.event === "END") {
    field = "Actual Finish";
    prev = fmt(a.actualFinish);
    next.actualStart = a.actualStart ?? e.date;
    next.actualFinish = e.date;
    next.progress = 100;
    val = fmt(e.date);
  } else {
    next.actualStart = a.actualStart ?? e.date;
    next.progress = Math.max(0, Math.min(100, e.progress ?? a.progress));
    if (next.progress === 100) next.actualFinish = e.date;
    val = `${next.progress}%`;
  }
  return { next, field, prev, val };
}

interface Ctx extends State {
  hydrated: boolean;
  selectedActivity: string | null;
  openActivity: (id: string | null) => void;
  setRole: (r: Role) => void;
  canApprove: boolean;
  addReport: (kind: keyof typeof DEMO_REPORTS) => string;
  addUploadedFile: (file: File) => Promise<string>;
  processReport: (id: string) => ExtractedEvent[];
  approveEvent: (eventId: string, activityId?: string) => void;
  rejectEvent: (eventId: string) => void;
  flagEvent: (eventId: string) => void;
  timeAgentCommit: (
    text: string,
    ex: Extraction,
    activityId: string,
    confidence: number,
  ) => "applied" | "queued";
  unmatchedAction: (
    id: string,
    action: "create" | "send" | "dismiss" | "link",
    activityId?: string,
  ) => void;
  resolveConflict: (id: string, progress: number, note: string, verified: boolean) => void;
  updateSettings: (s: Partial<Settings>) => void;
  reset: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);
const KEY = "execusync-demo-v2";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [hydrated, setHydrated] = useState(false);
  const [selectedActivity, openActivity] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Sync with FastAPI backend on startup
  useEffect(() => {
    let isMounted = true;

    async function loadBackendData() {
      try {
        const [acts, rpts, matches, unms, confs, audits] = await Promise.all([
          api.getActivities().catch(() => null),
          api.getReports().catch(() => null),
          api.getMatches().catch(() => null),
          api.getUnmatched().catch(() => null),
          api.getConflicts().catch(() => null),
          api.getAuditLogs().catch(() => null),
        ]);

        if (!isMounted) return;

        if (acts && acts.length > 0) {
          setState((prev) => ({
            ...prev,
            activities: acts,
            reports: rpts || prev.reports,
            events: matches || prev.events,
            unmatched: unms || prev.unmatched,
            conflicts: confs || prev.conflicts,
            audit: audits || prev.audit,
          }));
        } else {
          // Fallback to local storage or seed
          try {
            const raw = localStorage.getItem(KEY);
            if (raw) setState({ ...initial(), ...JSON.parse(raw) });
          } catch {
            /* retain initial */
          }
        }
      } catch (err) {
        console.warn("FastAPI backend sync skipped, running with local store:", err);
      } finally {
        if (isMounted) setHydrated(true);
      }
    }

    loadBackendData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(KEY, JSON.stringify(state));
    }
  }, [state, hydrated]);

  const reviewer = ROLE_LABEL[state.role];
  const nextId = (prefix: string) => {
    stateRef.current = { ...stateRef.current, seq: stateRef.current.seq + 1 };
    return `${prefix}-${String(stateRef.current.seq).padStart(4, "0")}`;
  };

  const commit = (fn: (s: State) => State) => {
    const n = fn(stateRef.current);
    stateRef.current = n;
    setState(n);
  };

  const addReport = useCallback((kind: keyof typeof DEMO_REPORTS) => {
    const id = nextId("RPT");
    commit((s) => ({
      ...s,
      reports: [{ ...DEMO_REPORTS[kind], id, status: "Uploaded" }, ...s.reports],
    }));
    // Async push to backend
    api.loadDemoReport(kind).catch(() => {});
    return id;
  }, []);

  const addUploadedFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
    let lines: string[] = [];
    if (["TXT", "CSV", "MD"].includes(ext)) {
      const text = await file.text();
      lines = text
        .split(/\r?\n/)
        .map((l) => l.replace(/[,;\t]+/g, " ").trim())
        .filter((l) => l.length > 8)
        .slice(0, 40);
    }
    const id = nextId("RPT");
    commit((s) => ({
      ...s,
      reports: [
        {
          id,
          name: file.name,
          type: ext === "XLSX" || ext === "CSV" ? "Excel / CSV" : "Daily Progress Report",
          fileType: ext,
          source: file.name,
          date: TODAY,
          discipline: "Auto-detect",
          status: "Uploaded",
          lines,
        },
        ...s.reports,
      ],
    }));
    api.uploadReportFile(file).catch(() => {});
    return id;
  }, []);

  const processReport = useCallback((id: string) => {
    const s = stateRef.current;
    const rpt = s.reports.find((r) => r.id === id);
    if (!rpt) return [];
    const existing = s.events.filter((e) => e.reportId === id);
    if (existing.length) return existing;

    const evs = rpt.lines.map((l) =>
      makeEvent(nextId("EVT"), id, rpt.source, l, extract(l, rpt.date), s.activities),
    );
    const newUnmatched: Unmatched[] = [];
    for (const e of evs) {
      if ((e.candidates[0]?.confidence ?? 0) < s.settings.unmatchedThreshold) {
        e.status = "unmatched";
        newUnmatched.push({
          id: nextId("UNM"),
          text: e.text,
          source: rpt.source,
          date: e.date,
          discipline: e.discipline,
          area: e.area,
          closest: e.candidates[0]?.activityId ?? null,
          closestConfidence: e.candidates[0]?.confidence ?? 0,
          aiConfidence: Math.min(92, e.extractionConfidence - 4),
          explanation: /temporary|extra|additional|not in drawing/i.test(e.text)
            ? "Site execution appears more granular than the current schedule — likely temporary or field-directed scope."
            : "No L5/L6 activity exceeded the matching threshold for this observation.",
          status: "Open",
        });
      }
    }
    commit((st) => ({
      ...st,
      events: [...evs, ...st.events],
      unmatched: [...newUnmatched, ...st.unmatched],
      reports: st.reports.map((r) =>
        r.id === id
          ? { ...r, status: evs.length === 0 || newUnmatched.length ? "Needs Review" : "Processed" }
          : r,
      ),
    }));

    api.processReport(id).catch(() => {});
    return evs;
  }, []);

  const approveEvent = useCallback(
    (eventId: string, activityId?: string) => {
      commit((s) => {
        const e = s.events.find((x) => x.id === eventId);
        if (!e) return s;
        const actId = activityId ?? e.candidates[0]?.activityId;
        const a = s.activities.find((x) => x.id === actId);
        if (!a) return s;
        const conf = e.candidates.find((c) => c.activityId === actId)?.confidence ?? null;
        const { next, field, prev, val } = applyEvent(a, e);
        next.verification = "Planner Verified";
        next.aiConfidence = conf;
        const log: AuditLog = {
          id: nextId("AUD"),
          timestamp: nowStamp(),
          source: e.source,
          sourceText: e.text,
          detected: `${e.event}${e.progress !== null ? ` ${e.progress}%` : ""}`,
          activityId: a.id,
          confidence: conf,
          field,
          previous: prev,
          next: val,
          reviewer,
          status: "Approved",
        };

        // Async API call to FastAPI
        api.approveEvent(eventId, actId, reviewer).catch(() => {});

        return {
          ...s,
          activities: s.activities.map((x) => (x.id === a.id ? next : x)),
          events: s.events.map((x) =>
            x.id === eventId ? { ...x, status: "approved", approvedActivityId: a.id } : x,
          ),
          audit: [log, ...s.audit],
        };
      });
    },
    [reviewer],
  );

  const rejectEvent = useCallback(
    (eventId: string) => {
      commit((s) => {
        const e = s.events.find((x) => x.id === eventId);
        if (!e) return s;
        const log: AuditLog = {
          id: nextId("AUD"),
          timestamp: nowStamp(),
          source: e.source,
          sourceText: e.text,
          detected: e.event,
          activityId: e.candidates[0]?.activityId ?? "—",
          confidence: e.candidates[0]?.confidence ?? null,
          field: "Match",
          previous: "AI Suggested",
          next: "Rejected — baseline untouched",
          reviewer: ROLE_LABEL[s.role],
          status: "Rejected",
        };
        api.rejectEvent(eventId, ROLE_LABEL[s.role]).catch(() => {});
        return {
          ...s,
          events: s.events.map((x) => (x.id === eventId ? { ...x, status: "rejected" } : x)),
          audit: [log, ...s.audit],
        };
      });
    },
    [],
  );

  const flagEvent = useCallback((eventId: string) => {
    commit((s) => {
      const e = s.events.find((x) => x.id === eventId);
      if (!e) return s;
      const log: AuditLog = {
        id: nextId("AUD"),
        timestamp: nowStamp(),
        source: e.source,
        sourceText: e.text,
        detected: e.event,
        activityId: e.candidates[0]?.activityId ?? "—",
        confidence: e.candidates[0]?.confidence ?? null,
        field: "Match",
        previous: "AI Suggested",
        next: "Flagged for planner review",
        reviewer: ROLE_LABEL[s.role],
        status: "Flagged",
      };
      return {
        ...s,
        events: s.events.map((x) => (x.id === eventId ? { ...x, status: "flagged" } : x)),
        audit: [log, ...s.audit],
      };
    });
  }, []);

  const timeAgentCommit = useCallback(
    (text: string, ex: Extraction, activityId: string, confidence: number) => {
      const s = stateRef.current;
      const ev = makeEvent(
        nextId("EVT"),
        "TIME-AGENT",
        "Time Agent (Supervisor)",
        text,
        ex,
        s.activities,
      );

      const a = s.activities.find((x) => x.id === activityId)!;
      const { next, field, prev, val } = applyEvent(a, ex);
      next.verification = "Supervisor Reported";
      next.aiConfidence = confidence;

      commit((st) => ({
        ...st,
        activities: st.activities.map((x) => (x.id === a.id ? next : x)),
        events: [{ ...ev, status: "approved", approvedActivityId: a.id }, ...st.events],
        audit: [
          {
            id: nextId("AUD"),
            timestamp: nowStamp(),
            source: "Time Agent",
            sourceText: text,
            detected: ex.event,
            activityId: a.id,
            confidence,
            field,
            previous: prev,
            next: val,
            reviewer: `${ROLE_LABEL[st.role]} (confirmed)`,
            status: "Approved",
          },
          ...st.audit,
        ],
      }));

      api
        .commitTimeAgent({
          text,
          activityId,
          confidence,
          reviewer: ROLE_LABEL[s.role],
          extraction: ex,
        })
        .catch(() => {});

      return "applied";
    },
    [],
  );

  const unmatchedAction = useCallback(
    (id: string, action: "create" | "send" | "dismiss" | "link", activityId?: string) => {
      commit((s) => {
        const u = s.unmatched.find((x) => x.id === id);
        if (!u) return s;
        let activities = s.activities;
        let newId = "—";
        if (action === "create") {
          const base = u.closest ? s.activities.find((a) => a.id === u.closest) : undefined;
          newId = `NEW-${u.area?.slice(-1) ?? "X"}-${String(s.activities.filter((a) => a.isNew).length + 1).padStart(3, "0")}`;
          activities = [
            ...s.activities,
            {
              id: newId,
              name: u.text.replace(/\.$/, "").slice(0, 60),
              level: "L6",
              wbs: base?.wbs ?? "OIL-REF.NEW",
              unit: base?.unit ?? "Unassigned",
              discipline: u.discipline ?? "Piping",
              area: u.area ?? base?.area ?? "Area A",
              plannedStart: u.date,
              plannedFinish: u.date,
              duration: 1,
              actualStart: u.date,
              actualFinish: /installed|built|fitted|cast|completed/i.test(u.text) ? u.date : null,
              progress: /installed|built|fitted|cast|completed/i.test(u.text) ? 100 : 10,
              dependencies: base ? [base.id] : [],
              contractor: base?.contractor ?? "TBD",
              verification: "Planner Verified",
              aiConfidence: u.aiConfidence,
              isNew: true,
            },
          ];
        }
        const status =
          action === "create"
            ? "Activity Created"
            : action === "send"
              ? "Sent to Planner"
              : "Dismissed";
        const log: AuditLog = {
          id: nextId("AUD"),
          timestamp: nowStamp(),
          source: u.source,
          sourceText: u.text,
          detected: "UNMATCHED",
          activityId: newId,
          confidence: u.aiConfidence,
          field: "Unmatched observation",
          previous: "Open",
          next: status,
          reviewer: ROLE_LABEL[s.role],
          status:
            action === "create" ? "Created" : action === "send" ? "Escalated" : "Dismissed",
        };

        api.assignUnmatched(id, action === "link" ? "dismiss" : action, ROLE_LABEL[s.role]).catch(() => {});

        return {
          ...s,
          activities,
          unmatched: s.unmatched.map((x) => (x.id === id ? { ...x, status } : x)),
          audit: [log, ...s.audit],
        };
      });
    },
    [],
  );

  const resolveConflict = useCallback(
    (id: string, progress: number, note: string, verified: boolean) => {
      commit((s) => {
        const c = s.conflicts.find((x) => x.id === id);
        if (!c) return s;
        const a = s.activities.find((x) => x.id === c.activityId)!;
        const next: Activity = {
          ...a,
          progress,
          actualFinish: progress >= 100 ? TODAY : null,
          verification: "Planner Verified",
        };
        const log: AuditLog = {
          id: nextId("AUD"),
          timestamp: nowStamp(),
          source: c.sources.map((x) => x.document).join(" vs "),
          sourceText: note || "Conflict resolved after source review",
          detected: c.kind,
          activityId: a.id,
          confidence: null,
          field: "Actual Progress",
          previous: `${a.progress}%`,
          next: `${progress}%`,
          reviewer: ROLE_LABEL[s.role],
          status: "Resolved",
        };

        api
          .resolveConflict({
            id,
            progress,
            note,
            verified,
            reviewer: ROLE_LABEL[s.role],
          })
          .catch(() => {});

        return {
          ...s,
          activities: s.activities.map((x) => (x.id === a.id ? next : x)),
          conflicts: s.conflicts.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: verified ? "Verified" : "Resolved",
                  resolution: `${progress}% — ${note || "confirmed by reviewer"}`,
                }
              : x,
          ),
          audit: [log, ...s.audit],
        };
      });
    },
    [],
  );

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      hydrated,
      selectedActivity,
      openActivity,
      setRole: (role) => commit((s) => ({ ...s, role })),
      canApprove: state.role === "planner" || state.role === "manager",
      addReport,
      addUploadedFile,
      processReport,
      approveEvent,
      rejectEvent,
      flagEvent,
      timeAgentCommit,
      unmatchedAction,
      resolveConflict,
      updateSettings: (p) => commit((s) => ({ ...s, settings: { ...s.settings, ...p } })),
      reset: () => {
        localStorage.removeItem(KEY);
        commit(() => ({ ...initial(), role: stateRef.current.role }));
        api.reseedDatabase().catch(() => {});
      },
    }),
    [
      state,
      hydrated,
      selectedActivity,
      addReport,
      addUploadedFile,
      processReport,
      approveEvent,
      rejectEvent,
      flagEvent,
      timeAgentCommit,
      unmatchedAction,
      resolveConflict,
    ],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}

export function useActivity(id: string | null | undefined) {
  const { activities } = useStore();
  return activities.find((a) => a.id === id);
}
