import datetime
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    role = Column(String(50), default="planner")
    name = Column(String(100))

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(50), primary_key=True, index=True) # e.g. OIL-REF-2026-01
    name = Column(String(200), nullable=False)
    client = Column(String(200), default="Oil India Limited (demonstration)")
    location = Column(String(200), default="Synthetic Site — Upper Assam")
    status = Column(String(50), default="Active")
    baseline = Column(String(100), default="BL-03 (approved 12 Jan 2026)")
    planned_start = Column(String(20), default="2026-01-15")
    planned_finish = Column(String(20), default="2027-06-30")
    data_label = Column(String(100), default="Synthetic Demonstration Data")

class Discipline(Base):
    __tablename__ = "disciplines"

    code = Column(String(10), primary_key=True) # CIV, PIP, MEC, ROT, ELE, INS, HSE
    name = Column(String(50), nullable=False)
    contractor = Column(String(100))

class Activity(Base):
    __tablename__ = "activities"

    id = Column(String(50), primary_key=True, index=True) # e.g. PIP-L6-001 or PIP-A-0245
    project_id = Column(String(50), ForeignKey("projects.id"), default="OIL-REF-2026-01")
    activity_code = Column(String(50), index=True)
    activity_name = Column(String(200), nullable=False)
    level = Column(String(10), default="L6") # L5 or L6
    wbs_code = Column(String(100), index=True)
    parent_wbs = Column(String(100))
    unit = Column(String(100))
    discipline = Column(String(50), index=True)
    area = Column(String(50), index=True)
    planned_start = Column(String(20), nullable=False)
    planned_finish = Column(String(20), nullable=False)
    duration = Column(Integer, default=5)
    actual_start = Column(String(20), nullable=True)
    actual_finish = Column(String(20), nullable=True)
    progress_percent = Column(Float, default=0.0)
    status = Column(String(50), default="Not Started") # Completed, In Progress, Delayed, Not Started
    contractor = Column(String(100))
    verification = Column(String(50), default="System Recorded") # AI Suggested, Planner Verified, System Recorded, Supervisor Reported
    ai_confidence = Column(Float, nullable=True)
    dependencies = Column(JSON, default=list)
    is_new = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class SiteReport(Base):
    __tablename__ = "site_reports"

    id = Column(String(50), primary_key=True, index=True) # e.g. RPT-028
    project_id = Column(String(50), default="OIL-REF-2026-01")
    name = Column(String(200), nullable=False)
    source = Column(String(100))
    report_type = Column(String(50), default="Daily Progress Report")
    file_type = Column(String(20), default="TXT")
    report_date = Column(String(20))
    discipline = Column(String(100), default="Multi-discipline")
    status = Column(String(50), default="Uploaded") # Uploaded, Processing, Processed, Needs Review
    lines = Column(JSON, default=list)
    raw_text = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

class ReportEvent(Base):
    __tablename__ = "report_events"

    id = Column(String(50), primary_key=True, index=True) # e.g. EVT-0091
    report_id = Column(String(50), ForeignKey("site_reports.id"))
    source = Column(String(100))
    text = Column(Text, nullable=False)
    discipline = Column(String(50), nullable=True)
    description = Column(String(200))
    area = Column(String(50), nullable=True)
    event_type = Column(String(20), default="PROGRESS") # START, END, PROGRESS, BLOCKED
    event_date = Column(String(20))
    event_time = Column(String(20), nullable=True)
    progress = Column(Float, nullable=True)
    extraction_confidence = Column(Float, default=90.0)
    candidates = Column(JSON, default=list) # List of matched candidate activities with scores and reasons
    status = Column(String(50), default="pending") # pending, approved, rejected, flagged, unmatched
    approved_activity_id = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class UnmatchedActivity(Base):
    __tablename__ = "unmatched_activities"

    id = Column(String(50), primary_key=True, index=True) # e.g. UNM-011
    text = Column(Text, nullable=False)
    source = Column(String(100))
    date = Column(String(20))
    discipline = Column(String(50), nullable=True)
    area = Column(String(50), nullable=True)
    occurrences = Column(Integer, default=1)
    closest = Column(String(50), nullable=True)
    closest_confidence = Column(Float, default=0.0)
    ai_confidence = Column(Float, default=80.0)
    explanation = Column(Text)
    status = Column(String(50), default="Open") # Open, Sent to Planner, Activity Created, Dismissed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Conflict(Base):
    __tablename__ = "conflicts"

    id = Column(String(50), primary_key=True, index=True) # e.g. CON-004
    activity_id = Column(String(50), nullable=False)
    kind = Column(String(50), default="PROGRESS CONFLICT")
    sources = Column(JSON, default=list) # List of conflicting reports
    status = Column(String(50), default="Open") # Open, Resolved, Verified
    resolution = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class CrossDisciplineLink(Base):
    __tablename__ = "cross_discipline_links"

    id = Column(String(50), primary_key=True, index=True) # e.g. XD-01
    title = Column(String(200), nullable=False)
    severity = Column(String(20), default="medium") # high, medium, low
    chain = Column(JSON, default=list)
    insight = Column(Text)

class ProjectMemory(Base):
    __tablename__ = "project_memory"

    id = Column(String(50), primary_key=True, index=True) # e.g. MEM-01
    activity_type = Column(String(200), nullable=False)
    discipline = Column(String(50), nullable=False)
    occurrences = Column(Integer, default=1)
    planned_avg = Column(Float, default=5.0)
    actual_avg = Column(Float, default=6.5)
    causes = Column(JSON, default=list) # [{cause: "Material", share: 38}, ...]
    contractor = Column(String(100))
    location = Column(String(200))
    previous_projects = Column(JSON, default=list)

class RiskSignal(Base):
    __tablename__ = "risk_signals"

    id = Column(String(50), primary_key=True, index=True) # e.g. RSK-001
    activity_id = Column(String(50), nullable=False)
    activity_name = Column(String(200))
    discipline = Column(String(50))
    area = Column(String(50))
    severity = Column(String(20), default="medium") # high, medium, low
    variance_days = Column(Integer, default=0)
    forecast_finish = Column(String(20))
    planned_finish = Column(String(20))
    progress = Column(Float, default=0.0)
    signals = Column(JSON, default=list)
    recommendation = Column(Text)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(50), primary_key=True, index=True) # e.g. AUD-0141
    timestamp = Column(String(50))
    source = Column(String(100))
    source_text = Column(Text)
    detected = Column(String(100))
    activity_id = Column(String(50))
    confidence = Column(Float, nullable=True)
    field = Column(String(50))
    previous = Column(String(100))
    next_value = Column(String(100))
    reviewer = Column(String(100), default="Project Planner")
    status = Column(String(50), default="Approved")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
