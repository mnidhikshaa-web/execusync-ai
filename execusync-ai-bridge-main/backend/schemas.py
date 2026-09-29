from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict

class ActivitySchema(BaseModel):
    id: str
    name: str
    level: str = "L6"
    wbs: str
    unit: Optional[str] = None
    discipline: str
    area: str
    plannedStart: str
    plannedFinish: str
    duration: int
    actualStart: Optional[str] = None
    actualFinish: Optional[str] = None
    progress: float = 0.0
    status: str = "Not Started"
    contractor: Optional[str] = None
    verification: str = "System Recorded"
    aiConfidence: Optional[float] = None
    dependencies: List[str] = []
    isNew: bool = False

    class Config:
        from_attributes = True

class ReportEventSchema(BaseModel):
    id: str
    reportId: str
    source: str
    text: str
    discipline: Optional[str] = None
    description: str
    area: Optional[str] = None
    event: str
    date: str
    time: Optional[str] = None
    progress: Optional[float] = None
    extractionConfidence: float
    candidates: List[Dict[str, Any]] = []
    status: str
    approvedActivityId: Optional[str] = None

class SiteReportSchema(BaseModel):
    id: str
    name: str
    type: str
    fileType: str
    source: str
    date: str
    discipline: str
    status: str
    lines: List[str] = []
    uploadedAt: Optional[str] = None

class ConflictSchema(BaseModel):
    id: str
    activityId: str
    kind: str
    sources: List[Dict[str, Any]] = []
    status: str
    resolution: Optional[str] = None

class UnmatchedSchema(BaseModel):
    id: str
    text: str
    source: str
    date: str
    discipline: Optional[str] = None
    area: Optional[str] = None
    occurrences: int = 1
    closest: Optional[str] = None
    closestConfidence: float = 0.0
    aiConfidence: float = 80.0
    explanation: str
    status: str

class AuditLogSchema(BaseModel):
    id: str
    timestamp: str
    source: str
    sourceText: str
    detected: str
    activityId: str
    confidence: Optional[float] = None
    field: str
    previous: str
    next: str
    reviewer: str
    status: str

class TimeAgentInput(BaseModel):
    text: str

class TimeAgentCommit(BaseModel):
    text: str
    activityId: str
    confidence: float
    reviewer: Optional[str] = "Site Supervisor"
    extraction: Optional[Dict[str, Any]] = None

class ConflictResolveInput(BaseModel):
    progress: float
    note: str
    verified: bool = True
    reviewer: Optional[str] = "Project Planner"

class MemoryQueryInput(BaseModel):
    query: str
