import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

try {
  process.loadEnvFile();
} catch {
  /* local .env is optional */
}
const port = Number(process.env.API_PORT ?? 4000);
const dbPath = resolve(process.env.DATABASE_PATH ?? "./data/execusync.sqlite");
mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS disciplines (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS contractors (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS wbs_nodes (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS site_reports (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS report_events (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS activity_matches (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS progress_updates (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS unmatched_activities (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS conflicts (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS cross_discipline_links (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS project_memory (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS risk_signals (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
`);

const collTables = {
  activities: "activities",
  reports: "site_reports",
  events: "report_events",
  unmatched: "unmatched_activities",
  conflicts: "conflicts",
  audit: "audit_logs",
};
function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,PUT,POST,OPTIONS",
  });
  res.end(JSON.stringify(body));
}
function persist(state) {
  if (
    !state ||
    !Array.isArray(state.activities) ||
    !Array.isArray(state.events) ||
    !Array.isArray(state.reports)
  )
    throw new Error("Invalid application state");
  const tx = db.prepare(
    "INSERT INTO app_state(id,payload,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at",
  );
  const upsert = Object.fromEntries(
    Object.values(collTables).map((table) => [
      table,
      db.prepare(
        `INSERT INTO ${table}(id,payload) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload`,
      ),
    ]),
  );
  const clear = Object.fromEntries(
    Object.values(collTables).map((table) => [table, db.prepare(`DELETE FROM ${table}`)]),
  );
  db.exec("BEGIN IMMEDIATE");
  try {
    tx.run(JSON.stringify(state), new Date().toISOString());
    for (const [key, table] of Object.entries(collTables)) {
      clear[table].run();
      for (const row of state[key] ?? []) upsert[table].run(String(row.id), JSON.stringify(row));
    }
    const saveRows = (table, rows) => {
      db.prepare(`DELETE FROM ${table}`).run();
      const stmt = db.prepare(`INSERT INTO ${table}(id,payload) VALUES(?,?)`);
      for (const row of rows) stmt.run(String(row.id), JSON.stringify(row));
    };
    const disciplines = [...new Set(state.activities.map((a) => a.discipline))].map((name) => ({
      id: name,
      name,
    }));
    saveRows("disciplines", disciplines);
    saveRows(
      "contractors",
      [...new Set(state.activities.map((a) => a.contractor))].map((name) => ({ id: name, name })),
    );
    saveRows("wbs_nodes", [
      ...new Map(
        state.activities.map((a) => [a.wbs, { id: a.wbs, name: a.wbs, level: a.level }]),
      ).values(),
    ]);
    saveRows("users", [{ id: "demo-planner", name: "Project Planner", role: "planner" }]);
    saveRows(
      "activity_matches",
      state.events.flatMap((event) =>
        (event.candidates ?? []).map((candidate, index) => ({
          id: `${event.id}-${candidate.activityId}`,
          eventId: event.id,
          activityId: candidate.activityId,
          confidence: candidate.confidence,
          reasons: candidate.reasons,
          rank: index + 1,
        })),
      ),
    );
    saveRows(
      "progress_updates",
      state.audit.map((item) => ({ ...item, id: item.id })),
    );
    saveRows(
      "cross_discipline_links",
      state.activities.flatMap((activity) =>
        (activity.dependencies ?? []).map((dependencyId) => ({
          id: `${dependencyId}-${activity.id}`,
          upstreamActivityId: dependencyId,
          downstreamActivityId: activity.id,
        })),
      ),
    );
    saveRows("project_memory", [
      {
        id: "MEM-PIPING",
        discipline: "Piping",
        activityType: "Pipe erection",
        plannedAvg: 5.2,
        actualAvg: 6.7,
        occurrences: 18,
      },
      {
        id: "MEM-CIVIL",
        discipline: "Civil",
        activityType: "Equipment foundation concreting",
        plannedAvg: 9,
        actualAvg: 9.6,
        occurrences: 41,
      },
      {
        id: "MEM-ELECTRICAL",
        discipline: "Electrical",
        activityType: "Cable tray installation",
        plannedAvg: 11,
        actualAvg: 13.2,
        occurrences: 22,
      },
    ]);
    const riskRows = state.activities
      .filter((a) => a.progress < 100 && a.plannedFinish < "2026-09-28")
      .map((a) => ({
        id: `RISK-${a.id}`,
        activityId: a.id,
        severity: "MEDIUM",
        evidence: `Progress ${a.progress}% past planned finish ${a.plannedFinish}`,
      }));
    saveRows("risk_signals", riskRows);
    const project = {
      id: "OIL-REF-2026-01",
      name: "Refinery Expansion & Utilities Project",
      status: "In Progress",
      synthetic: true,
    };
    db.prepare(
      "INSERT INTO projects(id,payload) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload",
    ).run(project.id, JSON.stringify(project));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
function currentState() {
  const row = db.prepare("SELECT payload FROM app_state WHERE id=1").get();
  return row ? JSON.parse(row.payload) : null;
}
const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") return json(res, 204, {});
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  try {
    if (url.pathname === "/api/health")
      return json(res, 200, { status: "ok", database: "sqlite", mode: "deterministic-demo" });
    if (req.method === "DELETE" && url.pathname === "/api/state") {
      db.prepare("DELETE FROM app_state WHERE id=1").run();
      for (const table of Object.values(collTables)) db.prepare(`DELETE FROM ${table}`).run();
      return json(res, 200, { reset: true });
    }
    if (req.method === "GET" && url.pathname === "/api/state")
      return json(res, 200, { state: currentState() });
    if (req.method === "PUT" && url.pathname === "/api/state") {
      let raw = "";
      for await (const part of req) {
        raw += part;
        if (raw.length > 12_000_000)
          return json(res, 413, { error: "State payload exceeds 12 MB" });
      }
      const body = JSON.parse(raw);
      persist(body.state);
      return json(res, 200, { saved: true, updatedAt: new Date().toISOString() });
    }
    const state = currentState();
    if (!state) return json(res, 503, { error: "Application state has not been initialized" });
    const paths = {
      "/api/projects": () => [
        {
          id: "OIL-REF-2026-01",
          name: "Refinery Expansion & Utilities Project",
          status: "In Progress",
          synthetic: true,
        },
      ],
      "/api/activities": () => state.activities,
      "/api/events": () => state.events,
      "/api/matches": () => state.events.map((e) => ({ ...e, candidates: e.candidates ?? [] })),
      "/api/unmatched": () => state.unmatched,
      "/api/conflicts": () => state.conflicts,
      "/api/audit-logs": () => state.audit,
      "/api/reports": () => state.reports,
    };
    if (req.method === "GET" && paths[url.pathname]) return json(res, 200, paths[url.pathname]());
    if (req.method === "GET" && url.pathname === "/api/dashboard")
      return json(res, 200, {
        activities: state.activities,
        events: state.events,
        unmatched: state.unmatched,
        conflicts: state.conflicts,
      });
    if (req.method === "GET" && url.pathname === "/api/project-memory") return json(res, 200, []);
    if (req.method === "GET" && url.pathname === "/api/risk-signals") return json(res, 200, []);
    if (req.method === "GET" && url.pathname === "/api/cross-discipline") return json(res, 200, []);
    if (req.method === "GET" && /^\/api\/(projects|activities)\//.test(url.pathname)) {
      const [resource, id] = url.pathname.split("/").slice(2);
      const row =
        resource === "projects"
          ? id === "OIL-REF-2026-01"
            ? {
                id,
                name: "Refinery Expansion & Utilities Project",
                status: "In Progress",
                synthetic: true,
              }
            : null
          : state.activities.find((a) => a.id === id);
      return row ? json(res, 200, row) : json(res, 404, { error: "Record not found" });
    }
    return json(res, 404, { error: "Route not found" });
  } catch (error) {
    console.error("API request failed:", error);
    return json(res, 400, { error: error instanceof Error ? error.message : "Invalid request" });
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`EXECUSYNC API listening on http://127.0.0.1:${port} (${dbPath})`),
);
process.on("SIGINT", () => {
  server.close();
  db.close();
  process.exit(0);
});
