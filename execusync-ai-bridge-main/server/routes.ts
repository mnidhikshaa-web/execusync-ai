import { Router, Request, Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { db, PROJECT_INFO, TODAY, nowStamp, addDays, diffDays } from "./db";
import { getAIProvider, norm } from "./ai-engine";
import type { Activity, AuditLog, ExtractedEvent, SiteReport, Unmatched } from "./types";

export const apiRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// 1. Health check
apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "EXECUSYNC AI API", timestamp: new Date().toISOString() });
});

// 2. Project metadata
apiRouter.get("/project", (_req, res) => {
  res.json(PROJECT_INFO);
});

// 3. Activities
apiRouter.get("/activities", (req, res) => {
  let list = db.getActivities();
  const { discipline, area, status, search, level } = req.query as Record<string, string>;

  if (discipline && discipline !== "All") {
    list = list.filter((a) => a.discipline.toLowerCase() === discipline.toLowerCase());
  }
  if (area && area !== "All") {
    list = list.filter((a) => a.area.toLowerCase() === area.toLowerCase());
  }
  if (level && level !== "All") {
    list = list.filter((a) => a.level === level);
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (a) =>
        a.id.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.wbs.toLowerCase().includes(q) ||
        a.contractor.toLowerCase().includes(q),
    );
  }

  res.json(list);
});

apiRouter.get("/activities/:id", (req, res) => {
  const act = db.getActivity(req.params.id);
  if (!act) return res.status(404).json({ error: "Activity not found" });
  res.json(act);
});

apiRouter.post("/activities", (req, res) => {
  const body = req.body as Partial<Activity>;
  if (!body.name || !body.discipline || !body.area) {
    return res.status(400).json({ error: "Missing required fields: name, discipline, area" });
  }

  const id = body.id || db.nextId(`ACT-${body.discipline?.slice(0, 3).toUpperCase()}`);
  const newActivity: Activity = {
    id,
    name: body.name,
    level: body.level || "L6",
    wbs: body.wbs || `OIL-REF.${body.area?.slice(-1)}.${body.discipline?.slice(0, 3).toUpperCase()}`,
    unit: body.unit || "Unassigned Unit",
    discipline: body.discipline,
    area: body.area,
    plannedStart: body.plannedStart || TODAY,
    plannedFinish: body.plannedFinish || addDays(TODAY, body.duration || 5),
    duration: body.duration || 5,
    actualStart: body.actualStart || null,
    actualFinish: body.actualFinish || null,
    progress: body.progress || 0,
    dependencies: body.dependencies || [],
    contractor: body.contractor || "TBD",
    verification: "Planner Verified",
    aiConfidence: body.aiConfidence || null,
    isNew: true,
  };

  db.addActivity(newActivity);

  db.addAuditLog({
    id: db.nextId("AUD"),
    timestamp: nowStamp(),
    source: "Manual Schedule Entry",
    sourceText: `Activity ${newActivity.id} created`,
    detected: "CREATE_ACTIVITY",
    activityId: newActivity.id,
    confidence: null,
    field: "Activity",
    previous: "—",
    next: newActivity.name,
    reviewer: "Project Planner",
    status: "Created",
  });

  res.status(201).json(newActivity);
});

// 4. Schedule Import (CSV / XLSX)
apiRouter.post("/schedule/import", upload.single("file"), (req, res) => {
  try {
    let rows: any[] = [];
    if (req.file) {
      const ext = req.file.originalname.split(".").pop()?.toLowerCase();
      if (ext === "csv" || ext === "txt") {
        const text = req.file.buffer.toString("utf-8");
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
          const obj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            obj[h] = vals[idx] || "";
          });
          rows.push(obj);
        }
      } else if (ext === "xlsx" || ext === "xls") {
        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        rows = XLSX.utils.sheet_to_json(worksheet);
      }
    } else if (req.body.rows) {
      rows = Array.isArray(req.body.rows) ? req.body.rows : JSON.parse(req.body.rows);
    }

    if (!rows.length) {
      return res.status(400).json({ error: "No rows found in uploaded file." });
    }

    const imported: Activity[] = [];
    for (const r of rows) {
      const id = r["Activity ID"] || r["id"] || r["ActivityID"] || db.nextId("ACT-IMP");
      const name = r["Activity Name"] || r["name"] || r["ActivityName"] || "Unnamed Activity";
      const discipline = r["Discipline"] || r["discipline"] || "Piping";
      const area = r["Area"] || r["area"] || "Area A";
      const plannedStart = r["Planned Start"] || r["plannedStart"] || TODAY;
      const plannedFinish = r["Planned Finish"] || r["plannedFinish"] || addDays(plannedStart, 10);
      const duration = Number(r["Duration"] || r["duration"] || 10);

      const act: Activity = {
        id,
        name,
        level: (r["Level"] || r["level"] || "L5") as "L5" | "L6",
        wbs: r["WBS"] || r["wbs"] || `OIL-REF.${area.slice(-1)}.${discipline.slice(0, 3).toUpperCase()}`,
        unit: r["Unit"] || r["unit"] || "Imported Unit",
        discipline: discipline as any,
        area,
        plannedStart,
        plannedFinish,
        duration,
        actualStart: r["Actual Start"] || r["actualStart"] || null,
        actualFinish: r["Actual Finish"] || r["actualFinish"] || null,
        progress: Number(r["Progress"] || r["progress"] || 0),
        dependencies: r["Dependencies"] ? String(r["Dependencies"]).split(";") : [],
        contractor: r["Contractor"] || r["contractor"] || "TBD",
        verification: "System Recorded",
        aiConfidence: null,
      };

      const existing = db.getActivity(id);
      if (existing) {
        db.updateActivity(id, act);
      } else {
        db.addActivity(act);
      }
      imported.push(act);
    }

    db.addAuditLog({
      id: db.nextId("AUD"),
      timestamp: nowStamp(),
      source: "Schedule Import Prototype",
      sourceText: `Imported ${imported.length} activities`,
      detected: "SCHEDULE_IMPORT",
      activityId: "—",
      confidence: null,
      field: "Schedule Baseline",
      previous: "—",
      next: `${imported.length} activities imported`,
      reviewer: "Project Planner",
      status: "Approved",
    });

    res.json({ success: true, count: imported.length, activities: imported });
  } catch (err: any) {
    console.error("Schedule import error:", err);
    res.status(500).json({ error: "Failed to process schedule file: " + err.message });
  }
});

// 5. Reports (Ingestion)
apiRouter.get("/reports", (_req, res) => {
  res.json(db.getReports());
});

apiRouter.get("/reports/:id", (req, res) => {
  const r = db.getReport(req.params.id);
  if (!r) return res.status(404).json({ error: "Report not found" });
  res.json(r);
});

apiRouter.post("/reports/upload", upload.single("file"), async (req, res) => {
  try {
    let name = "Uploaded_Report.txt";
    let fileType = "TXT";
    let type: SiteReport["type"] = "Daily Progress Report";
    let lines: string[] = [];
    let rawText = "";

    if (req.file) {
      name = req.file.originalname;
      const ext = name.split(".").pop()?.toUpperCase() || "TXT";
      fileType = ext;

      if (["TXT", "CSV", "MD"].includes(ext)) {
        rawText = req.file.buffer.toString("utf-8");
        lines = rawText
          .split(/\r?\n/)
          .map((l) => l.replace(/[,;\t]+/g, " ").trim())
          .filter((l) => l.length > 8);
      } else if (ext === "XLSX" || ext === "XLS") {
        type = "Excel / CSV";
        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
        lines = json
          .map((row) => row.filter(Boolean).join(" ").trim())
          .filter((l) => l.length > 8);
        rawText = lines.join("\n");
      } else if (ext === "PDF") {
        rawText = req.file.buffer.toString("latin1");
        // Lightweight text extraction from readable PDF streams
        const matches = rawText.match(/\(([^)]+)\)\s*Tj/g) || [];
        if (matches.length) {
          lines = matches.map((m) => m.replace(/[()]/g, "").replace(/\s*Tj$/, "").trim()).filter((l) => l.length > 8);
        } else {
          // Fallback or demo PDF text
          lines = [
            "24 inch spool erection started in Area A today at 09:30.",
            "Foundation F102 concreting completed yesterday.",
            "Pipe supports for rack PR-1 installed about 75 percent.",
            "Cable tray Unit 2 installation reached 80 percent.",
          ];
        }
      } else if (ext === "DOCX") {
        type = "Site Diary";
        rawText = req.file.buffer.toString("latin1");
        lines = [
          "Pump P-103 coupling alignment reached 50 percent in Area B.",
          "8 inch line PR-07 erection at 60% Area B.",
          "Line 16 inch ZZ weld NDT progressed 70%.",
        ];
      }
    } else if (req.body.demoType) {
      // 1-Click Load Pre-set Demo Reports
      const dt = req.body.demoType;
      if (dt === "daily") {
        name = "DPR_028_Area-A-B_28Sep2026.pdf";
        type = "Daily Progress Report";
        fileType = "PDF";
        lines = [
          "24 inch spool erection started in Area A today at 09:30.",
          "Foundation F102 concreting completed yesterday.",
          "Pipe supports for rack PR-1 installed about 75 percent.",
          "Cable tray Unit 2 installation reached 80 percent.",
          "Pressure transmitter PT-2401 mounted, 50% complete.",
          "Column C-101 internals tray installation progressing, 45%.",
          "Temporary bypass pipe installed near P-101 suction.",
          "18 inch line YY erection progressed to 55% in Area A.",
          "Compressor K-201 alignment works resumed, 30% done.",
          "MCC panel erection in substation SS-2 completed.",
          "Scaffold inspection completed Area A.",
          "Hydrotest pump mobilised for loop HT-12.",
        ];
      } else if (dt === "sheet") {
        name = "Discipline_Progress_Wk39.xlsx";
        type = "Excel / CSV";
        fileType = "XLSX";
        lines = [
          "Fire and gas detector loop check Area C 60%",
          "Cooling tower fan CT-1 installation 80%",
          "Air cooler AC-3 setting Area B 55%",
          "Underground drainage network Area B 40%",
          "Impulse line tubing Area A 35%",
          "Temporary cable pulling winch foundation cast Area A",
        ];
      } else if (dt === "diary") {
        name = "SiteDiary_Supervisor_RK_28Sep.docx";
        type = "Site Diary";
        fileType = "DOCX";
        lines = [
          "Pump P-103 coupling alignment reached 50 percent in Area B.",
          "8 inch line PR-07 erection at 60% Area B.",
          "Line 16 inch ZZ weld NDT progressed 70%.",
          "Extra manual isolation valve fitted on firewater ring, not in drawing.",
        ];
      }
      rawText = lines.join("\n");
    }

    const id = db.nextId("RPT");
    const rpt: SiteReport = {
      id,
      name,
      type,
      fileType,
      source: name.replace(/\.[^/.]+$/, ""),
      date: TODAY,
      discipline: "Multi-discipline",
      status: "Uploaded",
      lines: lines.slice(0, 40),
      rawText: rawText.slice(0, 2000),
      uploadedAt: new Date().toISOString(),
    };

    db.addReport(rpt);
    res.status(201).json(rpt);
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to upload report: " + err.message });
  }
});

// 6. Process Report (Extract Events + Match Schedule)
apiRouter.post("/reports/:id/process", async (req, res) => {
  const rpt = db.getReport(req.params.id);
  if (!rpt) return res.status(404).json({ error: "Report not found" });

  const existing = db.getEvents().filter((e) => e.reportId === rpt.id);
  if (existing.length > 0) {
    return res.json({ message: "Report already processed", events: existing });
  }

  const ai = getAIProvider(db.getSettings().aiProvider);
  const activities = db.getActivities();
  const settings = db.getSettings();

  const generatedEvents: ExtractedEvent[] = [];
  const generatedUnmatched: Unmatched[] = [];

  for (const line of rpt.lines) {
    const ex = await ai.extract(line, rpt.date);
    const candidates = await ai.match(line, ex, activities);
    const eventId = db.nextId("EVT");

    const isUnmatched = (candidates[0]?.confidence || 0) < settings.unmatchedThreshold;

    const evt: ExtractedEvent = {
      id: eventId,
      reportId: rpt.id,
      source: rpt.source,
      text: line,
      discipline: ex.discipline,
      description: ex.description,
      area: ex.area,
      event: ex.event,
      date: ex.date,
      time: ex.time,
      progress: ex.progress,
      extractionConfidence: ex.confidence,
      candidates,
      status: isUnmatched ? "unmatched" : "pending",
    };

    generatedEvents.push(evt);

    if (isUnmatched) {
      // Check if similar unmatched exists to increase occurrences
      const existingUnmatched = db.getUnmatched().find((u) => u.text.toLowerCase() === line.toLowerCase());
      if (existingUnmatched) {
        db.updateUnmatched(existingUnmatched.id, { occurrences: existingUnmatched.occurrences + 1 });
      } else {
        generatedUnmatched.push({
          id: db.nextId("UNM"),
          text: line,
          source: rpt.source,
          date: ex.date,
          discipline: ex.discipline,
          area: ex.area,
          occurrences: 1,
          closest: candidates[0]?.activityId || null,
          closestConfidence: candidates[0]?.confidence || 0,
          aiConfidence: Math.min(92, ex.confidence - 4),
          explanation: /temporary|extra|additional|not in drawing/i.test(line)
            ? "Site execution appears more granular than baseline schedule — field-directed / temporary scope."
            : "No existing L5/L6 activity exceeded the matching confidence threshold.",
          status: "Open",
        });
      }
    }
  }

  db.addEvents(generatedEvents);
  if (generatedUnmatched.length > 0) {
    db.addUnmatched(generatedUnmatched);
  }

  db.updateReport(rpt.id, {
    status: generatedUnmatched.length > 0 ? "Needs Review" : "Processed",
  });

  res.json({
    success: true,
    reportId: rpt.id,
    eventsCount: generatedEvents.length,
    unmatchedCount: generatedUnmatched.length,
    events: generatedEvents,
  });
});

// 7. Events & Matching
apiRouter.get("/events", (req, res) => {
  let list = db.getEvents();
  const { status, reportId } = req.query as Record<string, string>;
  if (status) list = list.filter((e) => e.status === status);
  if (reportId) list = list.filter((e) => e.reportId === reportId);
  res.json(list);
});

// Approve Match
apiRouter.post("/events/:id/approve", (req, res) => {
  const e = db.getEvent(req.params.id);
  if (!e) return res.status(404).json({ error: "Event not found" });

  const targetActivityId = req.body.activityId || e.candidates[0]?.activityId;
  const act = db.getActivity(targetActivityId);
  if (!act) return res.status(404).json({ error: "Target activity not found in schedule" });

  const reviewer = req.body.reviewer || "Project Planner";

  let field = "Actual Progress";
  let prev = `${act.progress}%`;
  let nextVal = prev;
  const updatedAct: Partial<Activity> = { ...act };

  if (e.event === "START") {
    field = "Actual Start";
    prev = act.actualStart || "—";
    updatedAct.actualStart = act.actualStart || e.date;
    updatedAct.progress = Math.max(act.progress, e.progress || 5);
    nextVal = updatedAct.actualStart;
  } else if (e.event === "END") {
    field = "Actual Finish";
    prev = act.actualFinish || "—";
    updatedAct.actualStart = act.actualStart || e.date;
    updatedAct.actualFinish = e.date;
    updatedAct.progress = 100;
    nextVal = e.date;
  } else {
    updatedAct.actualStart = act.actualStart || e.date;
    updatedAct.progress = Math.max(0, Math.min(100, e.progress ?? act.progress));
    if (updatedAct.progress === 100) updatedAct.actualFinish = e.date;
    nextVal = `${updatedAct.progress}%`;
  }

  const matchCandidate = e.candidates.find((c) => c.activityId === targetActivityId);
  updatedAct.verification = "Planner Verified";
  updatedAct.aiConfidence = matchCandidate?.confidence || e.extractionConfidence;

  db.updateActivity(act.id, updatedAct);
  db.updateEvent(e.id, { status: "approved", approvedActivityId: act.id });

  const auditLog: AuditLog = {
    id: db.nextId("AUD"),
    timestamp: nowStamp(),
    source: e.source,
    sourceText: e.text,
    detected: `${e.event}${e.progress !== null ? ` ${e.progress}%` : ""}`,
    activityId: act.id,
    confidence: matchCandidate?.confidence || null,
    field,
    previous: prev,
    next: nextVal,
    reviewer,
    status: "Approved",
  };

  db.addAuditLog(auditLog);

  res.json({ success: true, event: db.getEvent(e.id), activity: db.getActivity(act.id), auditLog });
});

// Reject Match
apiRouter.post("/events/:id/reject", (req, res) => {
  const e = db.getEvent(req.params.id);
  if (!e) return res.status(404).json({ error: "Event not found" });

  const reviewer = req.body.reviewer || "Project Planner";
  db.updateEvent(e.id, { status: "rejected" });

  const auditLog: AuditLog = {
    id: db.nextId("AUD"),
    timestamp: nowStamp(),
    source: e.source,
    sourceText: e.text,
    detected: e.event,
    activityId: e.candidates[0]?.activityId || "—",
    confidence: e.candidates[0]?.confidence || null,
    field: "Match Suggestion",
    previous: "AI Suggested",
    next: "Rejected — baseline untouched",
    reviewer,
    status: "Rejected",
  };
  db.addAuditLog(auditLog);

  res.json({ success: true, event: db.getEvent(e.id), auditLog });
});

// Flag Event
apiRouter.post("/events/:id/flag", (req, res) => {
  const e = db.getEvent(req.params.id);
  if (!e) return res.status(404).json({ error: "Event not found" });

  const reviewer = req.body.reviewer || "Project Planner";
  db.updateEvent(e.id, { status: "flagged" });

  const auditLog: AuditLog = {
    id: db.nextId("AUD"),
    timestamp: nowStamp(),
    source: e.source,
    sourceText: e.text,
    detected: e.event,
    activityId: e.candidates[0]?.activityId || "—",
    confidence: e.candidates[0]?.confidence || null,
    field: "Match Suggestion",
    previous: "AI Suggested",
    next: "Flagged for manual review",
    reviewer,
    status: "Flagged",
  };
  db.addAuditLog(auditLog);

  res.json({ success: true, event: db.getEvent(e.id), auditLog });
});

// 8. Time Agent
apiRouter.post("/time-agent/process", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Missing text input" });

  const ai = getAIProvider(db.getSettings().aiProvider);
  const activities = db.getActivities();

  const extraction = await ai.extract(text, TODAY);
  const candidates = await ai.match(text, extraction, activities);

  res.json({ extraction, candidates });
});

apiRouter.post("/time-agent/commit", async (req, res) => {
  const { text, extraction, activityId, confidence, reviewer = "Site Supervisor" } = req.body;
  if (!text || !activityId) return res.status(400).json({ error: "Missing required commit fields" });

  const act = db.getActivity(activityId);
  if (!act) return res.status(404).json({ error: "Activity not found" });

  const ai = getAIProvider(db.getSettings().aiProvider);
  const ex = extraction || (await ai.extract(text, TODAY));

  let field = "Actual Progress";
  let prev = `${act.progress}%`;
  let nextVal = prev;
  const updatedAct: Partial<Activity> = { ...act };

  if (ex.event === "START") {
    field = "Actual Start";
    prev = act.actualStart || "—";
    updatedAct.actualStart = act.actualStart || ex.date;
    updatedAct.progress = Math.max(act.progress, ex.progress || 10);
    nextVal = updatedAct.actualStart;
  } else if (ex.event === "END") {
    field = "Actual Finish";
    prev = act.actualFinish || "—";
    updatedAct.actualStart = act.actualStart || ex.date;
    updatedAct.actualFinish = ex.date;
    updatedAct.progress = 100;
    nextVal = ex.date;
  } else {
    updatedAct.actualStart = act.actualStart || ex.date;
    updatedAct.progress = Math.max(0, Math.min(100, ex.progress ?? act.progress));
    if (updatedAct.progress === 100) updatedAct.actualFinish = ex.date;
    nextVal = `${updatedAct.progress}%`;
  }

  updatedAct.verification = "Supervisor Reported";
  updatedAct.aiConfidence = confidence || ex.confidence;

  db.updateActivity(act.id, updatedAct);

  const eventId = db.nextId("EVT");
  const evt: ExtractedEvent = {
    id: eventId,
    reportId: "TIME-AGENT",
    source: "Time Agent (Supervisor)",
    text,
    discipline: ex.discipline,
    description: ex.description,
    area: ex.area,
    event: ex.event,
    date: ex.date,
    time: ex.time,
    progress: ex.progress,
    extractionConfidence: ex.confidence,
    candidates: [{ activityId: act.id, confidence: confidence || 95, reasons: ["Supervisor confirmed"], ambiguities: [] }],
    status: "approved",
    approvedActivityId: act.id,
  };
  db.addEvents([evt]);

  const auditLog: AuditLog = {
    id: db.nextId("AUD"),
    timestamp: nowStamp(),
    source: "Time Agent (Site Observation)",
    sourceText: text,
    detected: `${ex.event}${ex.progress !== null ? ` ${ex.progress}%` : ""}`,
    activityId: act.id,
    confidence: confidence || 95,
    field,
    previous: prev,
    next: nextVal,
    reviewer: `${reviewer} (confirmed)`,
    status: "Approved",
  };
  db.addAuditLog(auditLog);

  res.json({ success: true, activity: db.getActivity(act.id), event: evt, auditLog });
});

// 9. Unmatched Scope
apiRouter.get("/unmatched", (_req, res) => {
  res.json(db.getUnmatched());
});

apiRouter.post("/unmatched/:id/create-activity", (req, res) => {
  const u = db.getUnmatched().find((x) => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: "Unmatched item not found" });

  const reviewer = req.body.reviewer || "Project Planner";
  const closestAct = u.closest ? db.getActivity(u.closest) : undefined;
  const newId = `NEW-${u.area?.slice(-1) || "X"}-${String(db.getActivities().filter((a) => a.isNew).length + 1).padStart(3, "0")}`;

  const isFinished = /installed|built|fitted|cast|completed/i.test(u.text);
  const newActivity: Activity = {
    id: newId,
    name: u.text.replace(/\.$/, "").slice(0, 60),
    level: "L6",
    wbs: closestAct?.wbs || `OIL-REF.NEW.${u.area?.slice(-1) || "A"}`,
    unit: closestAct?.unit || "Unassigned Scope",
    discipline: u.discipline || "Piping",
    area: u.area || closestAct?.area || "Area A",
    plannedStart: u.date,
    plannedFinish: u.date,
    duration: 1,
    actualStart: u.date,
    actualFinish: isFinished ? u.date : null,
    progress: isFinished ? 100 : 15,
    dependencies: closestAct ? [closestAct.id] : [],
    contractor: closestAct?.contractor || "TBD",
    verification: "Planner Verified",
    aiConfidence: u.aiConfidence,
    isNew: true,
  };

  db.addActivity(newActivity);
  db.updateUnmatched(u.id, { status: "Activity Created" });

  const auditLog: AuditLog = {
    id: db.nextId("AUD"),
    timestamp: nowStamp(),
    source: u.source,
    sourceText: u.text,
    detected: "UNMATCHED_SCOPE_RESOLVED",
    activityId: newId,
    confidence: u.aiConfidence,
    field: "Scope Addition",
    previous: "Unmatched Observation",
    next: `Created Activity ${newId} (${newActivity.name})`,
    reviewer,
    status: "Created",
  };
  db.addAuditLog(auditLog);

  res.json({ success: true, activity: newActivity, unmatched: db.getUnmatched().find((x) => x.id === u.id), auditLog });
});

apiRouter.post("/unmatched/:id/action", (req, res) => {
  const { action, reviewer = "Project Planner" } = req.body;
  const u = db.getUnmatched().find((x) => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: "Unmatched item not found" });

  const status = action === "send" ? "Sent to Planner" : "Dismissed";
  db.updateUnmatched(u.id, { status });

  const auditLog: AuditLog = {
    id: db.nextId("AUD"),
    timestamp: nowStamp(),
    source: u.source,
    sourceText: u.text,
    detected: "UNMATCHED_ACTION",
    activityId: "—",
    confidence: u.aiConfidence,
    field: "Unmatched Scope Status",
    previous: u.status,
    next: status,
    reviewer,
    status: action === "send" ? "Escalated" : "Dismissed",
  };
  db.addAuditLog(auditLog);

  res.json({ success: true, unmatched: db.getUnmatched().find((x) => x.id === u.id), auditLog });
});

// 10. Conflicts
apiRouter.get("/conflicts", (_req, res) => {
  res.json(db.getConflicts());
});

apiRouter.post("/conflicts/:id/resolve", (req, res) => {
  const { progress, note = "", verified = true, reviewer = "Project Planner" } = req.body;
  const c = db.getConflicts().find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: "Conflict not found" });

  const act = db.getActivity(c.activityId);
  if (!act) return res.status(404).json({ error: "Associated activity not found" });

  const prevProg = act.progress;
  const updatedAct: Partial<Activity> = {
    progress: Number(progress),
    actualFinish: Number(progress) >= 100 ? TODAY : act.actualFinish,
    verification: "Planner Verified",
  };
  db.updateActivity(act.id, updatedAct);

  db.updateConflict(c.id, {
    status: verified ? "Verified" : "Resolved",
    resolution: `${progress}% — ${note || "Resolved by planner verification"}`,
  });

  const auditLog: AuditLog = {
    id: db.nextId("AUD"),
    timestamp: nowStamp(),
    source: c.sources.map((s) => s.document).join(" vs "),
    sourceText: note || "Conflict resolved following site source audit",
    detected: c.kind,
    activityId: act.id,
    confidence: null,
    field: "Actual Progress",
    previous: `${prevProg}%`,
    next: `${progress}%`,
    reviewer,
    status: "Resolved",
  };
  db.addAuditLog(auditLog);

  res.json({ success: true, conflict: db.getConflicts().find((x) => x.id === c.id), activity: db.getActivity(act.id), auditLog });
});

// 11. Cross-Discipline
apiRouter.get("/cross-discipline", (_req, res) => {
  res.json(db.getCrossLinks());
});

// 12. Project Memory
apiRouter.get("/memory", (_req, res) => {
  res.json(db.getMemory());
});

apiRouter.post("/memory/query", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Query is required" });

  const ai = getAIProvider(db.getSettings().aiProvider);
  const memory = db.getMemory();
  const answer = await ai.answerMemory(query, memory);

  res.json({ query, answer });
});

// 13. Early Warning Risk Radar
apiRouter.get("/risks", (_req, res) => {
  res.json(db.computeRiskSignals());
});

// 14. Audit Log
apiRouter.get("/audit", (_req, res) => {
  res.json(db.getAudit());
});

// 15. Stats & S-Curve
apiRouter.get("/stats", (_req, res) => {
  const acts = db.getActivities();
  const events = db.getEvents();
  const unmatched = db.getUnmatched();
  const conflicts = db.getConflicts();

  const total = acts.length;
  let completed = 0;
  let inProgress = 0;
  let delayed = 0;
  let notStarted = 0;

  for (const a of acts) {
    if (a.actualFinish || a.progress >= 100) completed++;
    else if (!a.actualStart) {
      if (diffDays(TODAY, a.plannedStart) > 0) delayed++;
      else notStarted++;
    } else if (diffDays(a.actualStart, a.plannedStart) >= 3 || diffDays(TODAY, a.plannedFinish) > 0) {
      delayed++;
    } else {
      inProgress++;
    }
  }

  const totalDur = acts.reduce((s, a) => s + a.duration, 0);
  const overallProg = Math.round(acts.reduce((s, a) => s + a.duration * a.progress, 0) / Math.max(1, totalDur));

  // Planned progress at TODAY
  const plannedProg = Math.round(
    acts.reduce((s, a) => {
      const f = Math.max(0, Math.min(1, diffDays(TODAY, a.plannedStart) / a.duration));
      return s + a.duration * f * 100;
    }, 0) / Math.max(1, totalDur),
  );

  const confs = events.filter((e) => e.candidates[0]).map((e) => e.candidates[0].confidence);
  const avgConf = confs.length ? Math.round(confs.reduce((s, c) => s + c, 0) / confs.length) : 92;

  // Discipline breakdown
  const disciplines = ["Civil", "Piping", "Mechanical", "Rotating", "Electrical", "Instrumentation", "HSE"].map((d) => {
    const xs = acts.filter((a) => a.discipline === d);
    const dDur = xs.reduce((s, a) => s + a.duration, 0);
    const actual = Math.round(xs.reduce((s, a) => s + a.duration * a.progress, 0) / Math.max(1, dDur));
    const planned = Math.round(
      xs.reduce((s, a) => {
        const f = Math.max(0, Math.min(1, diffDays(TODAY, a.plannedStart) / a.duration));
        return s + a.duration * f * 100;
      }, 0) / Math.max(1, dDur),
    );
    return {
      discipline: d,
      actual,
      planned,
      count: xs.length,
      delayed: xs.filter((a) => !a.actualFinish && (diffDays(TODAY, a.plannedFinish) > 0 || (a.actualStart && diffDays(a.actualStart, a.plannedStart) >= 3))).length,
    };
  });

  // S-Curve points
  const sCurvePoints: { date: string; planned: number; actual: number | null }[] = [];
  for (let w = -8; w <= 4; w++) {
    const d = addDays(TODAY, w * 7);
    const p = Math.round(
      acts.reduce((s, a) => {
        const f = Math.max(0, Math.min(1, diffDays(d, a.plannedStart) / a.duration));
        return s + a.duration * f * 100;
      }, 0) / Math.max(1, totalDur),
    );
    let actP: number | null = null;
    if (w <= 0) {
      actP = Math.round(
        acts.reduce((s, a) => {
          if (!a.actualStart || diffDays(d, a.actualStart) < 0) return s;
          const end = a.actualFinish || TODAY;
          const span = Math.max(1, diffDays(end, a.actualStart));
          const f = Math.min(1, diffDays(d, a.actualStart) / span);
          return s + a.duration * f * a.progress;
        }, 0) / Math.max(1, totalDur),
      );
    }
    sCurvePoints.push({ date: d, planned: p, actual: actP });
  }

  res.json({
    kpis: {
      total,
      completed,
      inProgress,
      delayed,
      notStarted,
      unmatched: unmatched.filter((u) => u.status === "Open" || u.status === "Sent to Planner").length,
      conflicts: conflicts.filter((c) => c.status === "Open").length,
      confidence: avgConf,
      progress: overallProg,
      planned: plannedProg,
    },
    disciplines,
    sCurve: sCurvePoints,
  });
});

// 16. Settings
apiRouter.get("/settings", (_req, res) => {
  res.json(db.getSettings());
});

apiRouter.post("/settings", (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json(updated);
});

// 17. Reset Demo
apiRouter.post("/reset", (_req, res) => {
  const fresh = db.reset();
  res.json({ success: true, message: "Database reset to initial demo state", data: fresh });
});
