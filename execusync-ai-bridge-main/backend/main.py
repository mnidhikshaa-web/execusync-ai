import os
import datetime
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, Base, get_db
from .models import (
    Project, Discipline, Activity, SiteReport, ReportEvent,
    UnmatchedActivity, Conflict, CrossDisciplineLink, ProjectMemory, RiskSignal, AuditLog
)
from .schemas import (
    ActivitySchema, ReportEventSchema, SiteReportSchema, ConflictSchema,
    UnmatchedSchema, AuditLogSchema, TimeAgentInput, TimeAgentCommit,
    ConflictResolveInput, MemoryQueryInput
)
from .seed import seed_database, TODAY, add_days
from .ai.extraction import extract_entities
from .ai.matcher import match_activity_to_schedule
from .ai.risk_engine import compute_project_risks, diff_days
from .ai.memory import answer_memory_query

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB & seed if empty
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    if db.query(Activity).count() == 0:
        seed_database(db)
    yield

app = FastAPI(
    title="EXECUSYNC AI API",
    description="Planning-to-Execution Intelligence Platform for Infrastructure Project Management (Oil India Limited SIH Prototype)",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def create_audit(db: Session, source: str, source_text: str, detected: str, activity_id: str, field: str, prev: str, next_val: str, reviewer: str = "Project Planner", status_val: str = "Approved", confidence: float = None):
    now_str = datetime.datetime.now().strftime("%d %b %Y, %I:%M %p")
    audit_id = f"AUD-{datetime.datetime.now().strftime('%M%S')}"
    log = AuditLog(
        id=audit_id,
        timestamp=now_str,
        source=source,
        source_text=source_text,
        detected=detected,
        activity_id=activity_id,
        confidence=confidence,
        field=field,
        previous=prev,
        next_value=next_val,
        reviewer=reviewer,
        status=status_val
    )
    db.add(log)
    db.commit()

# 1. Health
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "EXECUSYNC AI FastAPI Backend", "timestamp": datetime.datetime.utcnow().isoformat()}

# 2. Projects
@app.get("/api/projects")
def get_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()

@app.get("/api/projects/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p

# 3. Dashboard Data
@app.get("/api/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    acts = db.query(Activity).all()
    events = db.query(ReportEvent).all()
    unmatched = db.query(UnmatchedActivity).all()
    conflicts = db.query(Conflict).all()
    
    total = len(acts)
    completed = len([a for a in acts if a.status == "Completed"])
    in_progress = len([a for a in acts if a.status == "In Progress"])
    delayed = len([a for a in acts if a.status == "Delayed"])
    not_started = len([a for a in acts if a.status == "Not Started"])
    
    total_dur = sum(a.duration for a in acts)
    actual_prog = round(sum(a.duration * a.progress_percent for a in acts) / max(1, total_dur))
    
    planned_prog = round(sum(
        a.duration * max(0.0, min(1.0, max(0, diff_days(TODAY, a.planned_start)) / max(1, a.duration))) * 100.0
        for a in acts
    ) / max(1, total_dur))
    
    confs = [e.candidates[0]["confidence"] for e in events if e.candidates and len(e.candidates) > 0]
    avg_conf = round(sum(confs) / len(confs)) if confs else 92
    
    # Discipline Progress
    disc_data = []
    for d in ["Civil", "Piping", "Static Equipment", "Rotating Equipment", "Electrical", "Instrumentation", "HSE"]:
        d_acts = [a for a in acts if a.discipline == d]
        d_dur = sum(a.duration for a in d_acts)
        d_act_prog = round(sum(a.duration * a.progress_percent for a in d_acts) / max(1, d_dur)) if d_acts else 0
        d_plan_prog = round(sum(
            a.duration * max(0.0, min(1.0, max(0, diff_days(TODAY, a.planned_start)) / max(1, a.duration))) * 100.0
            for a in d_acts
        ) / max(1, d_dur)) if d_acts else 0
        disc_data.append({
            "discipline": d,
            "actual": d_act_prog,
            "planned": d_plan_prog,
            "count": len(d_acts),
            "delayed": len([a for a in d_acts if a.status == "Delayed"])
        })
        
    # S-Curve
    s_curve = []
    for w in range(-8, 5):
        d_str = add_days(TODAY, w * 7)
        p_val = round(sum(
            a.duration * max(0.0, min(1.0, max(0, diff_days(d_str, a.planned_start)) / max(1, a.duration))) * 100.0
            for a in acts
        ) / max(1, total_dur))
        act_val = None
        if w <= 0:
            act_val = round(sum(
                a.duration * min(1.0, max(0, diff_days(d_str, a.actual_start or TODAY)) / max(1, diff_days(a.actual_finish or TODAY, a.actual_start or TODAY))) * a.progress_percent
                for a in acts if a.actual_start and diff_days(d_str, a.actual_start) >= 0
            ) / max(1, total_dur))
        s_curve.append({"date": d_str, "planned": p_val, "actual": act_val})
        
    return {
        "kpis": {
            "total": total,
            "completed": completed,
            "inProgress": in_progress,
            "delayed": delayed,
            "notStarted": not_started,
            "unmatched": len([u for u in unmatched if u.status == "Open"]),
            "conflicts": len([c for c in conflicts if c.status == "Open"]),
            "confidence": avg_conf,
            "progress": actual_prog,
            "planned": planned_prog
        },
        "disciplines": disc_data,
        "sCurve": s_curve,
        "recentEvents": [
            {"id": e.id, "text": e.text, "source": e.source, "discipline": e.discipline, "confidence": e.extraction_confidence, "status": e.status}
            for e in events[:5]
        ],
        "recentAudit": [
            {"id": a.id, "timestamp": a.timestamp, "activityId": a.activity_id, "field": a.field, "prev": a.previous, "next": a.next_value, "reviewer": a.reviewer, "status": a.status}
            for a in db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(5).all()
        ]
    }

# 4. Activities
@app.get("/api/activities")
def get_activities(discipline: Optional[str] = None, area: Optional[str] = None, status: Optional[str] = None, search: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Activity)
    if discipline and discipline != "All":
        q = q.filter(Activity.discipline == discipline)
    if area and area != "All":
        q = q.filter(Activity.area == area)
    if status and status != "All":
        q = q.filter(Activity.status == status)
    if search:
        s_term = f"%{search}%"
        q = q.filter((Activity.id.ilike(s_term)) | (Activity.activity_name.ilike(s_term)) | (Activity.wbs_code.ilike(s_term)))
    
    acts = q.all()
    return [
        {
            "id": a.id,
            "name": a.activity_name,
            "level": a.level,
            "wbs": a.wbs_code,
            "unit": a.unit,
            "discipline": a.discipline,
            "area": a.area,
            "plannedStart": a.planned_start,
            "plannedFinish": a.planned_finish,
            "duration": a.duration,
            "actualStart": a.actual_start,
            "actualFinish": a.actual_finish,
            "progress": a.progress_percent,
            "status": a.status,
            "contractor": a.contractor,
            "verification": a.verification,
            "aiConfidence": a.ai_confidence,
            "dependencies": a.dependencies or [],
            "isNew": a.is_new
        }
        for a in acts
    ]

@app.get("/api/activities/{activity_id}")
def get_activity_detail(activity_id: str, db: Session = Depends(get_db)):
    a = db.query(Activity).filter(Activity.id == activity_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {
        "id": a.id,
        "name": a.activity_name,
        "level": a.level,
        "wbs": a.wbs_code,
        "unit": a.unit,
        "discipline": a.discipline,
        "area": a.area,
        "plannedStart": a.planned_start,
        "plannedFinish": a.planned_finish,
        "duration": a.duration,
        "actualStart": a.actual_start,
        "actualFinish": a.actual_finish,
        "progress": a.progress_percent,
        "status": a.status,
        "contractor": a.contractor,
        "verification": a.verification,
        "aiConfidence": a.ai_confidence,
        "dependencies": a.dependencies or [],
        "isNew": a.is_new
    }

# 5. Site Reports
@app.get("/api/site-reports")
def get_site_reports(db: Session = Depends(get_db)):
    rpts = db.query(SiteReport).order_by(SiteReport.uploaded_at.desc()).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "type": r.report_type,
            "fileType": r.file_type,
            "source": r.source,
            "date": r.report_date,
            "discipline": r.discipline,
            "status": r.status,
            "lines": r.lines or [],
            "uploadedAt": r.uploaded_at.isoformat() if r.uploaded_at else None
        }
        for r in rpts
    ]

@app.post("/api/site-reports/upload")
async def upload_site_report(file: Optional[UploadFile] = File(None), demo_type: Optional[str] = Form(None), raw_text: Optional[str] = Form(None), db: Session = Depends(get_db)):
    lines = []
    name = "Uploaded_Report.txt"
    file_type = "TXT"
    report_type = "Daily Progress Report"
    
    if demo_type == "daily":
        name = "DPR_028_Area-A-B_28Sep2026.pdf"
        file_type = "PDF"
        report_type = "Daily Progress Report"
        lines = [
            "24 inch spool erection started in Area A today at 09:30.",
            "Foundation F102 concreting completed yesterday.",
            "Pipe supports for rack PR-1 installed about 75 percent.",
            "Cable tray Unit 2 installation reached 80 percent.",
            "Pressure transmitter PT-101 mounted, 50% complete.",
            "Column C-101 internals tray installation progressing, 45%.",
            "Temporary bypass pipe installed near P-101 suction.",
            "18 inch line YY erection progressed to 55% in Area A.",
            "Compressor K-201 alignment works resumed, 30% done.",
            "MCC panel erection in substation SS-2 completed.",
            "Scaffold inspection completed Area A."
        ]
    elif demo_type == "sheet":
        name = "Discipline_Progress_Wk39.xlsx"
        file_type = "XLSX"
        report_type = "Excel / CSV"
        lines = [
            "Fire and gas detector loop check Area C 60%",
            "Cooling tower fan CT-1 installation 80%",
            "Air cooler AC-3 setting Area B 55%",
            "Underground drainage network Area B 40%",
            "Impulse line tubing Area A 35%",
            "Temporary cable pulling winch foundation cast Area A"
        ]
    elif demo_type == "diary":
        name = "SiteDiary_Supervisor_RK_28Sep.docx"
        file_type = "DOCX"
        report_type = "Site Diary"
        lines = [
            "Pump P-103 coupling alignment reached 50 percent in Area B.",
            "8 inch line PR-07 erection at 60% Area B.",
            "Line 16 inch ZZ weld NDT progressed 70%.",
            "Extra manual isolation valve fitted on firewater ring, not in drawing."
        ]
    elif file:
        name = file.filename
        file_type = name.split(".")[-1].upper()
        content = await file.read()
        text = content.decode("utf-8", errors="ignore")
        lines = [l.strip() for l in text.splitlines() if len(l.strip()) > 8]
    elif raw_text:
        lines = [l.strip() for l in raw_text.splitlines() if len(l.strip()) > 8]
        
    report_id = f"RPT-0{db.query(SiteReport).count() + 28}"
    rpt = SiteReport(
        id=report_id,
        name=name,
        source=name.replace(".pdf", "").replace(".xlsx", "").replace(".docx", ""),
        report_type=report_type,
        file_type=file_type,
        report_date=TODAY,
        discipline="Multi-discipline",
        status="Uploaded",
        lines=lines,
        raw_text="\n".join(lines)
    )
    db.add(rpt)
    db.commit()
    db.refresh(rpt)
    return {"id": rpt.id, "name": rpt.name, "status": rpt.status, "linesCount": len(lines)}

@app.post("/api/site-reports/process")
def process_site_report(report_id: str, db: Session = Depends(get_db)):
    rpt = db.query(SiteReport).filter(SiteReport.id == report_id).first()
    if not rpt:
        raise HTTPException(status_code=404, detail="Site report not found")
        
    activities = db.query(Activity).all()
    created_events = []
    
    for idx, line in enumerate(rpt.lines or []):
        ex = extract_entities(line, rpt.report_date)
        candidates = match_activity_to_schedule(line, ex, activities)
        
        top_conf = candidates[0]["confidence"] if candidates else 0.0
        is_unmatched = top_conf < 65.0
        
        evt_id = f"EVT-0{db.query(ReportEvent).count() + 100 + idx}"
        evt = ReportEvent(
            id=evt_id,
            report_id=rpt.id,
            source=rpt.source,
            text=line,
            discipline=ex["discipline"],
            description=ex["description"],
            area=ex["area"],
            event_type=ex["event_type"],
            event_date=ex["event_date"],
            event_time=ex["event_time"],
            progress=ex["progress"],
            extraction_confidence=ex["confidence"],
            candidates=candidates,
            status="unmatched" if is_unmatched else "pending"
        )
        db.add(evt)
        created_events.append(evt)
        
        if is_unmatched:
            unm_id = f"UNM-0{db.query(UnmatchedActivity).count() + 20 + idx}"
            unm = UnmatchedActivity(
                id=unm_id,
                text=line,
                source=rpt.source,
                date=ex["event_date"],
                discipline=ex["discipline"],
                area=ex["area"],
                occurrences=1,
                closest=candidates[0]["activityId"] if candidates else None,
                closest_confidence=top_conf,
                ai_confidence=82.0,
                explanation="Field observation scope not mapped in baseline schedule.",
                status="Open"
            )
            db.add(unm)
            
    rpt.status = "Processed"
    db.commit()
    return {"success": True, "reportId": rpt.id, "processedEvents": len(created_events)}

# 6. Matches & Verification
@app.get("/api/matches")
def get_matches(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(ReportEvent)
    if status:
        q = q.filter(ReportEvent.status == status)
    events = q.all()
    return [
        {
            "id": e.id,
            "reportId": e.report_id,
            "source": e.source,
            "text": e.text,
            "discipline": e.discipline,
            "description": e.description,
            "area": e.area,
            "event": e.event_type,
            "date": e.event_date,
            "time": e.event_time,
            "progress": e.progress,
            "extractionConfidence": e.extraction_confidence,
            "candidates": e.candidates or [],
            "status": e.status,
            "approvedActivityId": e.approved_activity_id
        }
        for e in events
    ]

@app.post("/api/matches/{event_id}/approve")
def approve_match(event_id: str, activity_id: Optional[str] = None, reviewer: str = "Project Planner", db: Session = Depends(get_db)):
    evt = db.query(ReportEvent).filter(ReportEvent.id == event_id).first()
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
        
    target_id = activity_id or (evt.candidates[0]["activityId"] if evt.candidates else None)
    act = db.query(Activity).filter(Activity.id == target_id).first()
    if not act:
        raise HTTPException(status_code=404, detail="Target activity not found")
        
    prev_prog = act.progress_percent
    prev_val = f"{prev_prog:.0f}%"
    field_name = "Actual Progress"
    next_val = prev_val
    
    if evt.event_type == "START":
        field_name = "Actual Start"
        prev_val = act.actual_start or "—"
        act.actual_start = act.actual_start or evt.event_date
        act.progress_percent = max(act.progress_percent, evt.progress or 10.0)
        act.status = "In Progress"
        next_val = act.actual_start
    elif evt.event_type == "END":
        field_name = "Actual Finish"
        prev_val = act.actual_finish or "—"
        act.actual_start = act.actual_start or evt.event_date
        act.actual_finish = evt.event_date
        act.progress_percent = 100.0
        act.status = "Completed"
        next_val = evt.event_date
    else:
        act.actual_start = act.actual_start or evt.event_date
        act.progress_percent = max(0.0, min(100.0, evt.progress if evt.progress is not None else act.progress_percent))
        if act.progress_percent == 100.0:
            act.actual_finish = evt.event_date
            act.status = "Completed"
        else:
            act.status = "In Progress"
        next_val = f"{act.progress_percent:.0f}%"
        
    act.verification = "Planner Verified"
    top_cand = next((c for c in evt.candidates if c.get("activityId") == target_id), None)
    act.ai_confidence = top_cand["confidence"] if top_cand else evt.extraction_confidence
    
    evt.status = "approved"
    evt.approved_activity_id = act.id
    
    create_audit(
        db=db,
        source=evt.source,
        source_text=evt.text,
        detected=f"{evt.event_type} {evt.progress or ''}".strip(),
        activity_id=act.id,
        field=field_name,
        prev=prev_val,
        next_val=next_val,
        reviewer=reviewer,
        status_val="Approved",
        confidence=act.ai_confidence
    )
    
    db.commit()
    return {"success": True, "activityId": act.id, "progress": act.progress_percent, "status": act.status}

@app.post("/api/matches/{event_id}/reject")
def reject_match(event_id: str, reviewer: str = "Project Planner", db: Session = Depends(get_db)):
    evt = db.query(ReportEvent).filter(ReportEvent.id == event_id).first()
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
        
    evt.status = "rejected"
    create_audit(
        db=db,
        source=evt.source,
        source_text=evt.text,
        detected=evt.event_type,
        activity_id=evt.candidates[0]["activityId"] if evt.candidates else "—",
        field="Match",
        prev="AI Suggested",
        next_val="Rejected — baseline untouched",
        reviewer=reviewer,
        status_val="Rejected"
    )
    db.commit()
    return {"success": True, "eventId": evt.id}

# 7. Unmatched Scope
@app.get("/api/unmatched")
def get_unmatched(db: Session = Depends(get_db)):
    items = db.query(UnmatchedActivity).all()
    return [
        {
            "id": u.id,
            "text": u.text,
            "source": u.source,
            "date": u.date,
            "discipline": u.discipline,
            "area": u.area,
            "occurrences": u.occurrences,
            "closest": u.closest,
            "closestConfidence": u.closest_confidence,
            "aiConfidence": u.ai_confidence,
            "explanation": u.explanation,
            "status": u.status
        }
        for u in items
    ]

@app.post("/api/unmatched/{unmatched_id}/assign")
def assign_unmatched(unmatched_id: str, action: str = "create", reviewer: str = "Project Planner", db: Session = Depends(get_db)):
    u = db.query(UnmatchedActivity).filter(UnmatchedActivity.id == unmatched_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Unmatched item not found")
        
    if action == "create":
        new_id = f"NEW-{u.area[-1] if u.area else 'A'}-{db.query(Activity).count() + 1:03d}"
        new_act = Activity(
            id=new_id,
            project_id="OIL-REF-2026-01",
            activity_code=new_id,
            activity_name=u.text[:60],
            level="L6",
            wbs_code=f"OIL-REF.{u.area[-1] if u.area else 'A'}.{u.discipline[:3].upper() if u.discipline else 'PIP'}",
            parent_wbs="OIL-REF.NEW",
            unit="Unassigned Field Scope",
            discipline=u.discipline or "Piping",
            area=u.area or "Area A",
            planned_start=u.date,
            planned_finish=u.date,
            duration=1,
            actual_start=u.date,
            actual_finish=u.date if any(w in u.text.lower() for w in ["installed", "built", "completed"]) else None,
            progress_percent=100.0 if any(w in u.text.lower() for w in ["installed", "built", "completed"]) else 15.0,
            status="Completed" if any(w in u.text.lower() for w in ["installed", "built", "completed"]) else "In Progress",
            contractor="TBD",
            verification="Planner Verified",
            ai_confidence=u.ai_confidence,
            is_new=True
        )
        db.add(new_act)
        u.status = "Activity Created"
        create_audit(db=db, source=u.source, source_text=u.text, detected="NEW_SCOPE", activity_id=new_id, field="Scope Addition", prev="Open", next_val=f"Created {new_id}", reviewer=reviewer, status_val="Created")
    elif action == "send":
        u.status = "Sent to Planner"
    else:
        u.status = "Dismissed"
        
    db.commit()
    return {"success": True, "status": u.status}

# 8. Conflicts
@app.get("/api/conflicts")
def get_conflicts(db: Session = Depends(get_db)):
    c_list = db.query(Conflict).all()
    return [
        {
            "id": c.id,
            "activityId": c.activity_id,
            "kind": c.kind,
            "sources": c.sources or [],
            "status": c.status,
            "resolution": c.resolution
        }
        for c in c_list
    ]

@app.post("/api/conflicts/{conflict_id}/resolve")
def resolve_conflict(conflict_id: str, payload: ConflictResolveInput, db: Session = Depends(get_db)):
    c = db.query(Conflict).filter(Conflict.id == conflict_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Conflict not found")
        
    act = db.query(Activity).filter(Activity.id == c.activity_id).first()
    if act:
        prev_p = act.progress_percent
        act.progress_percent = payload.progress
        act.status = "Completed" if payload.progress >= 100.0 else "In Progress"
        act.verification = "Planner Verified"
        
        c.status = "Verified" if payload.verified else "Resolved"
        c.resolution = f"{payload.progress:.0f}% — {payload.note or 'Planner arbitrated'}"
        
        create_audit(
            db=db,
            source=" vs ".join([s["document"] for s in (c.sources or [])]),
            source_text=payload.note or "Conflict resolved following site source audit",
            detected=c.kind,
            activity_id=act.id,
            field="Actual Progress",
            prev=f"{prev_p:.0f}%",
            next_val=f"{payload.progress:.0f}%",
            reviewer=payload.reviewer or "Project Planner",
            status_val="Resolved"
        )
        db.commit()
        return {"success": True, "conflictId": c.id, "activityId": act.id, "resolvedProgress": act.progress_percent}

# 9. Cross-Discipline
@app.get("/api/cross-discipline")
def get_cross_discipline(db: Session = Depends(get_db)):
    links = db.query(CrossDisciplineLink).all()
    return [
        {
            "id": l.id,
            "title": l.title,
            "severity": l.severity,
            "chain": l.chain or [],
            "insight": l.insight
        }
        for l in links
    ]

# 10. Project Memory
@app.get("/api/project-memory")
def get_project_memory(db: Session = Depends(get_db)):
    mems = db.query(ProjectMemory).all()
    return [
        {
            "id": m.id,
            "activityType": m.activity_type,
            "discipline": m.discipline,
            "occurrences": m.occurrences,
            "plannedAvg": m.planned_avg,
            "actualAvg": m.actual_avg,
            "causes": m.causes or [],
            "contractor": m.contractor,
            "location": m.location,
            "previousProjects": m.previous_projects or []
        }
        for m in mems
    ]

@app.post("/api/project-memory/query")
def query_project_memory(payload: MemoryQueryInput, db: Session = Depends(get_db)):
    mems = db.query(ProjectMemory).all()
    ans = answer_memory_query(payload.query, mems)
    return {"query": payload.query, "answer": ans}

# 11. Early Warning Risk Signals
@app.get("/api/risk-signals")
def get_risk_signals(db: Session = Depends(get_db)):
    acts = db.query(Activity).all()
    confs = db.query(Conflict).all()
    unms = db.query(UnmatchedActivity).all()
    signals = compute_project_risks(acts, confs, unms)
    return signals

# 12. Time Agent
@app.post("/api/time-agent")
def time_agent_process(payload: TimeAgentInput, db: Session = Depends(get_db)):
    text = payload.text.strip()
    ex = extract_entities(text, TODAY)
    acts = db.query(Activity).all()
    candidates = match_activity_to_schedule(text, ex, acts)
    
    top = candidates[0] if candidates else None
    act_obj = db.query(Activity).filter(Activity.id == top["activityId"]).first() if top else None
    
    return {
        "text": text,
        "extraction": ex,
        "topCandidate": {
            "activityId": top["activityId"] if top else None,
            "activityName": act_obj.activity_name if act_obj else (top["activityId"] if top else "None"),
            "discipline": act_obj.discipline if act_obj else ex["discipline"],
            "area": act_obj.area if act_obj else ex["area"],
            "confidence": top["confidence"] if top else 0.0,
            "reasons": top["reasons"] if top else [],
            "ambiguities": top["ambiguities"] if top else []
        } if top else None,
        "allCandidates": candidates
    }

@app.post("/api/time-agent/commit")
def time_agent_commit(payload: TimeAgentCommit, db: Session = Depends(get_db)):
    act = db.query(Activity).filter(Activity.id == payload.activityId).first()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found")
        
    ex = payload.extraction or extract_entities(payload.text, TODAY)
    prev_prog = act.progress_percent
    prev_val = f"{prev_prog:.0f}%"
    field_name = "Actual Progress"
    next_val = prev_val
    
    if ex["event_type"] == "START":
        field_name = "Actual Start"
        prev_val = act.actual_start or "—"
        act.actual_start = act.actual_start or ex["event_date"]
        act.progress_percent = max(act.progress_percent, ex["progress"] or 10.0)
        act.status = "In Progress"
        next_val = act.actual_start
    elif ex["event_type"] == "END":
        field_name = "Actual Finish"
        prev_val = act.actual_finish or "—"
        act.actual_start = act.actual_start or ex["event_date"]
        act.actual_finish = ex["event_date"]
        act.progress_percent = 100.0
        act.status = "Completed"
        next_val = ex["event_date"]
    else:
        act.actual_start = act.actual_start or ex["event_date"]
        act.progress_percent = max(0.0, min(100.0, ex["progress"] if ex["progress"] is not None else act.progress_percent))
        if act.progress_percent == 100.0:
            act.actual_finish = ex["event_date"]
            act.status = "Completed"
        else:
            act.status = "In Progress"
        next_val = f"{act.progress_percent:.0f}%"
        
    act.verification = "Supervisor Reported"
    act.ai_confidence = payload.confidence
    
    evt_id = f"EVT-TA-{datetime.datetime.now().strftime('%M%S')}"
    evt = ReportEvent(
        id=evt_id,
        report_id="TIME-AGENT",
        source="Time Agent (Supervisor)",
        text=payload.text,
        discipline=ex["discipline"],
        description=ex["description"],
        area=ex["area"],
        event_type=ex["event_type"],
        event_date=ex["event_date"],
        progress=ex["progress"],
        extraction_confidence=payload.confidence,
        candidates=[{"activityId": act.id, "confidence": payload.confidence, "reasons": ["Supervisor voice/text update"]}],
        status="approved",
        approved_activity_id=act.id
    )
    db.add(evt)
    
    create_audit(
        db=db,
        source="Time Agent (Supervisor)",
        source_text=payload.text,
        detected=f"{ex['event_type']} {ex['progress'] or ''}".strip(),
        activity_id=act.id,
        field=field_name,
        prev=prev_val,
        next_val=next_val,
        reviewer=f"{payload.reviewer} (confirmed)",
        status_val="Approved",
        confidence=payload.confidence
    )
    db.commit()
    return {"success": True, "activityId": act.id, "progress": act.progress_percent, "status": act.status}

# 13. Audit Logs
@app.get("/api/audit-logs")
def get_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).all()
    return [
        {
            "id": l.id,
            "timestamp": l.timestamp,
            "source": l.source,
            "sourceText": l.source_text,
            "detected": l.detected,
            "activityId": l.activity_id,
            "confidence": l.confidence,
            "field": l.field,
            "previous": l.previous,
            "next": l.next_value,
            "reviewer": l.reviewer,
            "status": l.status
        }
        for l in logs
    ]

# 14. Reset / Seed
@app.post("/api/seed")
def reseed(db: Session = Depends(get_db)):
    seed_database(db)
    return {"success": True, "message": "Database reset and reseeded with 48 synthetic activities!"}
