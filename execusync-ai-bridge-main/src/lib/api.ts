import type {
  Activity,
  AuditLog,
  Conflict,
  CrossLink,
  ExtractedEvent,
  MemoryRecord,
  RiskSignal,
  Settings,
  SiteReport,
  Unmatched,
} from "./types";

const API_BASE = "http://localhost:8000/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (e: any) {
    console.warn(`[ExecuSync API] Request to ${url} failed:`, e.message);
    throw e;
  }
}

export const api = {
  // Health
  checkHealth: () => request<{ status: string }>("/health"),

  // Project & Dashboard
  getProject: () => request<any>("/projects/OIL-REF-2026-01"),
  getDashboard: () => request<any>("/dashboard"),

  // Activities
  getActivities: (params?: { discipline?: string; area?: string; status?: string; search?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<Activity[]>(`/activities${query ? `?${query}` : ""}`);
  },
  getActivity: (id: string) => request<Activity>(`/activities/${id}`),

  // Site Reports (Ingestion)
  getReports: () => request<SiteReport[]>("/site-reports"),
  uploadReportFile: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_BASE}/site-reports/upload`, { method: "POST", body: fd });
    if (!res.ok) throw new Error("Failed to upload report");
    return res.json();
  },
  loadDemoReport: (demoType: "daily" | "sheet" | "diary") => {
    const fd = new FormData();
    fd.append("demo_type", demoType);
    return fetch(`${API_BASE}/site-reports/upload`, { method: "POST", body: fd }).then((r) => r.json());
  },
  processReport: (id: string) =>
    request<{ success: boolean; reportId: string; processedEvents: number }>(`/site-reports/process?report_id=${id}`, {
      method: "POST",
    }),

  // Events & AI Matches
  getMatches: (status?: string) => {
    const query = status ? `?status=${status}` : "";
    return request<ExtractedEvent[]>(`/matches${query}`);
  },
  approveEvent: (eventId: string, activityId?: string, reviewer: string = "Project Planner") =>
    request<{ success: boolean; activityId: string; progress: number; status: string }>(
      `/matches/${eventId}/approve?activity_id=${activityId || ""}&reviewer=${encodeURIComponent(reviewer)}`,
      { method: "POST" },
    ),
  rejectEvent: (eventId: string, reviewer: string = "Project Planner") =>
    request<{ success: boolean; eventId: string }>(
      `/matches/${eventId}/reject?reviewer=${encodeURIComponent(reviewer)}`,
      { method: "POST" },
    ),

  // Time Agent
  processTimeAgent: (text: string) =>
    request<{ text: string; extraction: any; topCandidate: any; allCandidates: any[] }>("/time-agent", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  commitTimeAgent: (payload: {
    text: string;
    activityId: string;
    confidence: number;
    reviewer?: string;
    extraction?: any;
  }) =>
    request<{ success: boolean; activityId: string; progress: number; status: string }>(
      "/time-agent/commit",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),

  // Unmatched Activities
  getUnmatched: () => request<Unmatched[]>("/unmatched"),
  assignUnmatched: (id: string, action: "create" | "send" | "dismiss", reviewer: string = "Project Planner") =>
    request<{ success: boolean; status: string }>(
      `/unmatched/${id}/assign?action=${action}&reviewer=${encodeURIComponent(reviewer)}`,
      { method: "POST" },
    ),

  // Conflicts
  getConflicts: () => request<Conflict[]>("/conflicts"),
  resolveConflict: (payload: { id: string; progress: number; note: string; verified?: boolean; reviewer?: string }) =>
    request<{ success: boolean; conflictId: string; activityId: string; resolvedProgress: number }>(
      `/conflicts/${payload.id}/resolve`,
      {
        method: "POST",
        body: JSON.stringify({
          progress: payload.progress,
          note: payload.note,
          verified: payload.verified ?? true,
          reviewer: payload.reviewer || "Project Planner",
        }),
      },
    ),

  // Cross-Discipline
  getCrossDiscipline: () => request<CrossLink[]>("/cross-discipline"),

  // Project Memory
  getMemory: () => request<MemoryRecord[]>("/project-memory"),
  queryMemory: (query: string) =>
    request<{ query: string; answer: string }>("/project-memory/query", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  // Risks
  getRisks: () => request<RiskSignal[]>("/risk-signals"),

  // Audit Logs
  getAuditLogs: () => request<AuditLog[]>("/audit-logs"),

  // Reseed / Reset
  reseedDatabase: () => request<{ success: boolean; message: string }>("/seed", { method: "POST" }),
};
