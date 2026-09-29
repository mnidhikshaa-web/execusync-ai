export type Discipline =
  | "Civil"
  | "Piping"
  | "Mechanical"
  | "Rotating"
  | "Electrical"
  | "Instrumentation"
  | "HSE";

export type Role = "manager" | "planner" | "supervisor" | "contractor" | "executive";

export type ActivityStatus = "Completed" | "In Progress" | "Delayed" | "Not Started";
export type Verification =
  | "AI Suggested"
  | "Planner Verified"
  | "System Recorded"
  | "Supervisor Reported";
export type EventType = "START" | "END" | "PROGRESS";

export interface Activity {
  id: string;
  name: string;
  level: "L5" | "L6";
  wbs: string;
  unit: string;
  discipline: Discipline;
  area: string;
  plannedStart: string;
  plannedFinish: string;
  duration: number;
  actualStart: string | null;
  actualFinish: string | null;
  progress: number;
  dependencies: string[];
  contractor: string;
  verification: Verification;
  aiConfidence: number | null;
  isNew?: boolean;
}

export interface SiteReport {
  id: string;
  name: string;
  type:
    | "Daily Progress Report"
    | "Excel / CSV"
    | "Site Diary"
    | "Schedule Extract"
    | "Contractor Report";
  fileType: string;
  source: string;
  date: string;
  discipline: string;
  status: "Uploaded" | "Processing" | "Processed" | "Needs Review";
  lines: string[];
  rawText?: string;
  uploadedAt?: string;
}

export interface Candidate {
  activityId: string;
  confidence: number;
  reasons: string[];
  ambiguities: string[];
}

export interface ExtractedEvent {
  id: string;
  reportId: string;
  source: string;
  text: string;
  discipline: Discipline | null;
  description: string;
  area: string | null;
  event: EventType;
  date: string;
  time: string | null;
  progress: number | null;
  extractionConfidence: number;
  candidates: Candidate[];
  status: "pending" | "approved" | "rejected" | "flagged" | "unmatched";
  approvedActivityId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  source: string;
  sourceText: string;
  detected: string;
  activityId: string;
  confidence: number | null;
  field: string;
  previous: string;
  next: string;
  reviewer: string;
  status: "Approved" | "Rejected" | "Flagged" | "Created" | "Resolved" | "Dismissed" | "Escalated";
}

export interface Unmatched {
  id: string;
  text: string;
  source: string;
  date: string;
  discipline: Discipline | null;
  area: string | null;
  occurrences?: number;
  closest: string | null;
  closestConfidence: number;
  aiConfidence: number;
  explanation: string;
  status: "Open" | "Sent to Planner" | "Activity Created" | "Dismissed";
}

export interface ConflictSource {
  source: string;
  document: string;
  timestamp: string;
  progress: number;
  author: string;
  note: string;
}

export interface Conflict {
  id: string;
  activityId: string;
  kind: "PROGRESS CONFLICT" | "STATUS CONFLICT";
  sources: ConflictSource[];
  status: "Open" | "Resolved" | "Verified";
  resolution?: string;
}

export interface MemoryRecord {
  id?: string;
  activityType: string;
  discipline: Discipline;
  occurrences: number;
  plannedAvg: number;
  actualAvg: number;
  causes: { cause: string; share: number }[];
  contractor: string;
  location: string;
  previousProjects: string[];
}

export interface CrossLink {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  chain: { activityId: string; state: string; tone: "ok" | "warn" | "risk" | "info" }[];
  insight: string;
}

export interface RiskSignal {
  id: string;
  activityId: string;
  activityName: string;
  discipline: Discipline;
  area: string;
  severity: "high" | "medium" | "low";
  varianceDays: number;
  forecastFinish: string;
  plannedFinish: string;
  progress: number;
  signals: string[];
  recommendation: string;
}

export interface Settings {
  highThreshold: number;
  reviewThreshold: number;
  unmatchedThreshold: number;
  aiProvider?: "demo" | "gemini";
}
