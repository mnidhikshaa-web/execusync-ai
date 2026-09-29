import datetime
from sqlalchemy.orm import Session
from .database import engine, Base, SessionLocal
from .models import (
    Project, Discipline, Activity, SiteReport, ReportEvent,
    UnmatchedActivity, Conflict, CrossDisciplineLink, ProjectMemory, AuditLog, User
)

TODAY = "2026-09-28"

def add_days(date_str: str, days: int) -> str:
    dt = datetime.datetime.strptime(date_str, "%Y-%m-%d") + datetime.timedelta(days=days)
    return dt.strftime("%Y-%m-%d")

RAW_ACTIVITIES = [
    # id, name, discipline, area, offset_days, duration, state, progress, slip, deps
    ("CIV-L5-001", "Site Grading & Compaction Area A", "Civil", "Area A", -60, 10, "C", 100.0, 1, []),
    ("CIV-L5-002", "Foundation F-102 Concreting", "Civil", "Area A", -8, 10, "P", 85.0, 1, []),
    ("CIV-L5-003", "Pipe Rack PR-1 Foundations", "Civil", "Area A", -45, 14, "C", 100.0, 2, []),
    ("CIV-L6-001", "Equipment Foundation F-108", "Civil", "Area A", -30, 12, "C", 100.0, 0, []),
    ("CIV-L6-002", "Anchor Bolt Grouting F-108", "Civil", "Area A", -20, 4, "C", 100.0, 1, ["CIV-L6-001"]),
    ("CIV-L5-004", "Pump Foundation P-101 Plinth", "Civil", "Area B", -40, 8, "C", 100.0, 0, []),
    ("CIV-L5-005", "Underground Drainage Network", "Civil", "Area B", -12, 20, "D", 30.0, 5, []),
    ("CIV-L6-003", "Cable Trench Excavation Unit 2", "Civil", "Area C", -35, 10, "C", 100.0, 2, []),
    ("CIV-L5-006", "Road & Paving Utilities Block", "Civil", "Area C", 6, 15, "N", 0.0, 0, []),
    
    ("PIP-L6-001", "Pipe Rack PR-1 Steel Erection", "Piping", "Area A", -32, 12, "C", 100.0, 1, ["CIV-L5-003"]),
    ("PIP-L6-002", "Erect Line 24\"-XX in Area A", "Piping", "Area A", -3, 5, "D", 0.0, 0, ["PIP-L6-001"]),
    ("PIP-L6-003", "Erect Line 18\"-YY", "Piping", "Area A", -4, 7, "P", 40.0, 1, ["PIP-L6-001"]),
    ("PIP-L5-001", "Spool Fabrication Batch 3", "Piping", "Area A", -28, 14, "C", 100.0, 2, []),
    ("PIP-L6-004", "Weld NDT Line 16\"-ZZ", "Piping", "Area A", -6, 8, "P", 55.0, 1, []),
    ("PIP-L6-005", "Install Pipe Supports PR-1", "Piping", "Area A", -9, 12, "P", 60.0, 2, ["PIP-L6-001"]),
    ("PIP-L6-006", "Erect Line 12\"-HT-04", "Piping", "Area B", -14, 10, "D", 45.0, 4, []),
    ("PIP-L6-007", "Erect Line 8\"-PR-07", "Piping", "Area B", -5, 8, "P", 35.0, 1, []),
    ("PIP-L5-002", "Hydrotest Loop HT-12", "Piping", "Area B", 4, 5, "N", 0.0, 0, ["PIP-L6-006"]),
    ("PIP-L5-003", "Cooling Water Header 30\"-CW", "Piping", "Area C", -20, 15, "D", 50.0, 3, []),
    ("PIP-L6-008", "Firewater Line 10\"-FW Erection", "Piping", "Area C", -38, 14, "C", 100.0, 1, []),
    
    ("STA-L6-001", "Static Equipment Installation V-201", "Static Equipment", "Area A", -25, 10, "C", 100.0, 1, ["CIV-L6-001"]),
    ("STA-L6-002", "Heat Exchanger E-204 Setting", "Static Equipment", "Area A", -18, 8, "C", 100.0, 0, []),
    ("STA-L6-003", "Column C-101 Internals Installation", "Static Equipment", "Area A", -7, 14, "P", 35.0, 2, []),
    ("STA-L5-001", "Storage Tank T-301 Shell Erection", "Static Equipment", "Area B", -50, 30, "C", 100.0, 2, []),
    ("STA-L6-004", "Air Cooler AC-3 Setting", "Static Equipment", "Area B", -6, 10, "P", 40.0, 1, []),
    
    ("ROT-L6-001", "Install Pump P-101", "Rotating Equipment", "Area B", 1, 6, "N", 0.0, 0, ["CIV-L5-004"]),
    ("ROT-L6-002", "Compressor K-201 Alignment", "Rotating Equipment", "Area A", -10, 10, "D", 20.0, 5, []),
    ("ROT-L6-003", "Pump P-102 Grouting", "Rotating Equipment", "Area B", -22, 4, "C", 100.0, 0, []),
    ("ROT-L5-001", "Cooling Tower Fan CT-1 Installation", "Rotating Equipment", "Area C", -9, 12, "P", 70.0, 0, []),
    ("ROT-L6-004", "Pump P-103 Coupling Alignment", "Rotating Equipment", "Area B", -2, 5, "P", 25.0, 1, []),
    
    ("ELE-L6-001", "Substation SS-2 Earthing Grid", "Electrical", "Area A", -40, 12, "C", 100.0, 1, []),
    ("ELE-L6-002", "Install Cable Tray Unit 2", "Electrical", "Area A", -10, 14, "P", 65.0, 2, ["CIV-L6-003"]),
    ("ELE-L6-003", "Pull Power Cable Unit 2", "Electrical", "Area A", -2, 10, "D", 0.0, 0, ["ELE-L6-002", "PIP-L6-002"]),
    ("ELE-L6-004", "Transformer TR-2 Installation", "Electrical", "Area B", -26, 6, "C", 100.0, 1, []),
    ("ELE-L6-005", "Install MCC Panel MCC-01 SS-2", "Electrical", "Area B", -12, 14, "P", 75.0, 1, []),
    ("ELE-L5-001", "Area Lighting Utilities Block", "Electrical", "Area C", -5, 10, "P", 30.0, 0, []),
    ("ELE-L6-006", "Earthing Utilities Block", "Electrical", "Area C", -28, 8, "C", 100.0, 0, []),
    
    ("INS-L6-001", "Instrument Tray Routing", "Instrumentation", "Area A", -16, 10, "C", 100.0, 1, []),
    ("INS-L6-002", "Install Pressure Transmitter PT-101", "Instrumentation", "Area A", -4, 6, "P", 30.0, 1, ["PIP-L6-002"]),
    ("INS-L5-001", "Instrument Calibration Batch 1", "Instrumentation", "Area A", 3, 5, "N", 0.0, 0, ["INS-L6-002"]),
    ("INS-L6-003", "Impulse Line Tubing", "Instrumentation", "Area A", -3, 9, "P", 20.0, 1, []),
    ("INS-L6-004", "Control Valve CV-110 Installation", "Instrumentation", "Area B", -9, 7, "D", 20.0, 4, []),
    ("INS-L6-005", "Junction Box Installation", "Instrumentation", "Area B", -20, 8, "C", 100.0, 0, []),
    ("INS-L5-002", "Fire & Gas Detector Loop Check", "Instrumentation", "Area C", -6, 10, "P", 45.0, 0, []),
    
    ("HSE-L6-001", "Fire Protection Inspection", "HSE", "Area A", -14, 3, "C", 100.0, 0, []),
    ("HSE-L6-002", "Scaffolding Safety Audit Area A", "HSE", "Area A", -2, 4, "P", 50.0, 0, []),
    ("HSE-L6-003", "Confined Space Permit Drill", "HSE", "Area B", -30, 2, "C", 100.0, 0, []),
    ("HSE-L5-001", "Fire Water Network Flush", "HSE", "Area C", -18, 7, "C", 100.0, 1, []),
]

CONTRACTORS = {
    "Civil": "Brahmaputra Civil Works",
    "Piping": "Assam Pipeline Constructors",
    "Static Equipment": "Northeast Mech Erectors",
    "Rotating Equipment": "Kaziranga Rotating Services",
    "Electrical": "Digboi Electricals Pvt Ltd",
    "Instrumentation": "Tezpur Instrumentation Co.",
    "HSE": "Site HSE Cell",
}

UNITS = {
    "Area A": "U2 – Crude Distillation Unit (CDU-II)",
    "Area B": "U3 – Diesel Hydrotreater (DHDT)",
    "Area C": "U4 – Utilities & Offsites (U&O)",
}

def seed_database(db: Session = None):
    close_after = False
    if db is None:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_after = True
    else:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        
    try:
        # 1. Project
        proj = Project(
            id="OIL-REF-2026-01",
            name="Refinery Expansion & Utilities Project",
            client="Oil India Limited (demonstration)",
            location="Synthetic Site — Upper Assam",
            status="Active",
            baseline="BL-03 (approved 12 Jan 2026)",
            planned_start="2026-01-15",
            planned_finish="2027-06-30",
            data_label="Synthetic Demonstration Data"
        )
        db.add(proj)
        
        # 2. Users
        users = [
            User(username="planner@execusync.demo", role="planner", name="Project Planner"),
            User(username="supervisor@execusync.demo", role="supervisor", name="Site Supervisor"),
            User(username="manager@execusync.demo", role="manager", name="Project Manager"),
            User(username="executive@execusync.demo", role="executive", name="Executive Viewer"),
        ]
        db.add_all(users)
        
        # 3. Disciplines
        for disc, contractor in CONTRACTORS.items():
            db.add(Discipline(code=disc[:3].upper(), name=disc, contractor=contractor))
            
        # 4. Activities (48 L5/L6 activities)
        for row in RAW_ACTIVITIES:
            act_id, name, discipline, area, off, dur, st_code, prog, slip, deps = row
            planned_start = add_days(TODAY, off)
            planned_finish = add_days(planned_start, dur)
            actual_start = None
            actual_finish = None
            
            status = "Not Started"
            if st_code == "C":
                status = "Completed"
                actual_start = add_days(planned_start, slip)
                actual_finish = add_days(planned_finish, slip)
            elif st_code == "P":
                status = "In Progress"
                actual_start = add_days(planned_start, slip)
            elif st_code == "D":
                status = "Delayed"
                if prog > 0:
                    actual_start = add_days(planned_start, slip)
            
            act = Activity(
                id=act_id,
                project_id="OIL-REF-2026-01",
                activity_code=act_id,
                activity_name=name,
                level="L5" if "-L5-" in act_id else "L6",
                wbs_code=f"OIL-REF.{area[-1]}.{discipline[:3].upper()}",
                parent_wbs=f"OIL-REF.{area[-1]}",
                unit=UNITS[area],
                discipline=discipline,
                area=area,
                planned_start=planned_start,
                planned_finish=planned_finish,
                duration=dur,
                actual_start=actual_start,
                actual_finish=actual_finish,
                progress_percent=prog,
                status=status,
                contractor=CONTRACTORS[discipline],
                verification="Planner Verified" if status != "Not Started" else "System Recorded",
                ai_confidence=88.0 + (len(act_id) % 10) if status != "Not Started" else None,
                dependencies=deps,
                is_new=False
            )
            db.add(act)
            
        # 5. Site Reports
        r1 = SiteReport(
            id="RPT-027",
            name="DPR_027_Area-A-C_27Sep2026.pdf",
            source="Daily Progress Report #027",
            report_type="Daily Progress Report",
            file_type="PDF",
            report_date=add_days(TODAY, -1),
            discipline="Multi-discipline",
            status="Processed",
            lines=[
                "Line 16 inch ZZ weld NDT progressed 62%.",
                "Area lighting utilities block poles erected, 40% done Area C.",
                "Control valve CV-110 installation started on Area B."
            ]
        )
        db.add(r1)
        
        # 6. Report Events
        e1 = ReportEvent(
            id="EVT-0091",
            report_id="RPT-027",
            source="Daily Progress Report #027",
            text="Line 16 inch ZZ weld NDT progressed 62%.",
            discipline="Piping",
            description="Line 16 inch ZZ weld NDT",
            area="Area A",
            event_type="PROGRESS",
            event_date=add_days(TODAY, -1),
            progress=62.0,
            extraction_confidence=94.0,
            candidates=[{"activityId": "PIP-L6-004", "confidence": 95.0, "reasons": ["Discipline matches: Piping", "Line size matches: 16 inch", "Semantic similarity on: weld, ndt"], "ambiguities": []}],
            status="pending"
        )
        e2 = ReportEvent(
            id="EVT-0092",
            report_id="RPT-027",
            source="Daily Progress Report #027",
            text="Area lighting utilities block poles erected, 40% done Area C.",
            discipline="Electrical",
            description="Area lighting utilities block poles",
            area="Area C",
            event_type="PROGRESS",
            event_date=add_days(TODAY, -1),
            progress=40.0,
            extraction_confidence=92.0,
            candidates=[{"activityId": "ELE-L5-001", "confidence": 91.0, "reasons": ["Discipline matches: Electrical", "Area matches: Area C", "Semantic similarity on: lighting, utilities"], "ambiguities": []}],
            status="pending"
        )
        e3 = ReportEvent(
            id="EVT-0093",
            report_id="RPT-027",
            source="Daily Progress Report #027",
            text="Control valve CV-110 installation started on Area B.",
            discipline="Instrumentation",
            description="Control valve CV-110 installation",
            area="Area B",
            event_type="START",
            event_date=add_days(TODAY, -1),
            progress=10.0,
            extraction_confidence=95.0,
            candidates=[{"activityId": "INS-L6-004", "confidence": 96.0, "reasons": ["Discipline matches: Instrumentation", "Equipment / tag reference matches: CV110", "Area matches: Area B"], "ambiguities": []}],
            status="pending"
        )
        db.add_all([e1, e2, e3])
        
        # 7. Unmatched Scope
        u1 = UnmatchedActivity(
            id="UNM-011",
            text="Temporary scaffold access platform built near column C-101 for internals work.",
            source="Daily Progress Report #027",
            date=add_days(TODAY, -1),
            discipline="Static Equipment",
            area="Area A",
            occurrences=4,
            closest="STA-L6-003",
            closest_confidence=48.0,
            ai_confidence=84.0,
            explanation="Enabling work performed on site that is not represented as a discrete L6 baseline activity.",
            status="Open"
        )
        u2 = UnmatchedActivity(
            id="UNM-012",
            text="Additional drain funnel installed at P-102 baseplate per field instruction FI-219.",
            source="Assam Pipeline Constructors Weekly #38",
            date=add_days(TODAY, -2),
            discipline="Piping",
            area="Area B",
            occurrences=2,
            closest="ROT-L6-003",
            closest_confidence=41.0,
            ai_confidence=79.0,
            explanation="Field-instruction scope addition that has no corresponding baseline schedule item.",
            status="Open"
        )
        db.add_all([u1, u2])
        
        # 8. Conflicts
        c1 = Conflict(
            id="CON-004",
            activity_id="PIP-L6-006",
            kind="PROGRESS CONFLICT",
            status="Open",
            sources=[
                {"source": "Contractor Daily Report", "document": "APC_Daily_27Sep.xlsx", "timestamp": f"{add_days(TODAY, -1)} 18:10", "progress": 100.0, "author": "Assam Pipeline Constructors", "note": "Line 12\"-HT-04 erection complete, ready for hydrotest."},
                {"source": "Supervisor Site Diary", "document": "SiteDiary_Supervisor_RK_27Sep.docx", "timestamp": f"{add_days(TODAY, -1)} 17:45", "progress": 70.0, "author": "R. Kalita (Site Supervisor)", "note": "Final two spools pending, bolting incomplete at flange F-7."}
            ]
        )
        c2 = Conflict(
            id="CON-005",
            activity_id="ELE-L6-005",
            kind="STATUS CONFLICT",
            status="Open",
            sources=[
                {"source": "Discipline Tracker", "document": "Discipline_Progress_Wk39.xlsx", "timestamp": f"{add_days(TODAY, -1)} 09:00", "progress": 75.0, "author": "Electrical Planning Desk", "note": "MCC panels 6 of 8 erected."},
                {"source": "Contractor Daily Report", "document": "DEPL_DPR_27Sep.pdf", "timestamp": f"{add_days(TODAY, -1)} 19:20", "progress": 95.0, "author": "Digboi Electricals Pvt Ltd", "note": "All MCC panels erected, glanding in progress."}
            ]
        )
        db.add_all([c1, c2])
        
        # 9. Cross Discipline Links
        x1 = CrossDisciplineLink(
            id="XD-01",
            title="Foundation release to cable pulling chain",
            severity="high",
            chain=[
                {"activityId": "CIV-L5-002", "state": "Foundation F102 near completion", "tone": "ok"},
                {"activityId": "PIP-L6-002", "state": "Line 24\" erection started late", "tone": "warn"},
                {"activityId": "ELE-L6-003", "state": "Cable pulling blocked — rack occupied", "tone": "risk"},
                {"activityId": "INS-L6-002", "state": "Transmitter hook-up waiting on line", "tone": "warn"}
            ],
            insight="Piping erection on PR-1 is occupying the shared rack tier. Electrical cable pulling cannot begin until Line 24\" is supported, cascading into instrument hook-up."
        )
        x2 = CrossDisciplineLink(
            id="XD-02",
            title="Pump P-101 installation readiness",
            severity="medium",
            chain=[
                {"activityId": "CIV-L5-004", "state": "Plinth complete & cured", "tone": "ok"},
                {"activityId": "ROT-L6-001", "state": "Pump setting planned 29 Sep", "tone": "info"},
                {"activityId": "PIP-L6-006", "state": "Suction line progress disputed (CON-004)", "tone": "risk"}
            ],
            insight="Pump P-101 can be set on schedule, but suction piping progress is in conflict between sources (CON-004). Resolve before hook-up is scheduled."
        )
        x3 = CrossDisciplineLink(
            id="XD-03",
            title="Compressor alignment vs. HSE permits",
            severity="low",
            chain=[
                {"activityId": "HSE-L6-002", "state": "Scaffold audit in progress", "tone": "info"},
                {"activityId": "ROT-L6-002", "state": "Alignment resumed after hold", "tone": "warn"},
                {"activityId": "ELE-L6-002", "state": "Tray above K-201 at 65%", "tone": "info"}
            ],
            insight="Overhead cable tray work above K-201 overlaps the compressor alignment window. Consider permit sequencing to avoid simultaneous operations."
        )
        db.add_all([x1, x2, x3])
        
        # 10. Project Memory
        mem_items = [
            ProjectMemory(id="MEM-01", activity_type="24 inch Pipe Erection", discipline="Piping", occurrences=18, planned_avg=5.2, actual_avg=6.7, causes=[{"cause": "Material availability", "share": 38}, {"cause": "Crane availability", "share": 27}, {"cause": "Manpower", "share": 21}, {"cause": "Weather", "share": 14}], contractor="Assam Pipeline Constructors", location="Pipe racks, process units", previous_projects=["NRL Expansion 2019", "Duliajan GCS Revamp 2021", "Numaligarh DHDT 2023"]),
            ProjectMemory(id="MEM-02", activity_type="Static Equipment Installation", discipline="Static Equipment", occurrences=26, planned_avg=8.0, actual_avg=9.1, causes=[{"cause": "Crane availability", "share": 41}, {"cause": "Foundation readiness", "share": 29}, {"cause": "Vendor documentation", "share": 18}, {"cause": "Weather", "share": 12}], contractor="Northeast Mech Erectors", location="Process units", previous_projects=["Duliajan GCS Revamp 2021", "Bongaigaon CDU 2022"]),
            ProjectMemory(id="MEM-03", activity_type="Pump Installation & Alignment", discipline="Rotating Equipment", occurrences=34, planned_avg=5.5, actual_avg=7.4, causes=[{"cause": "Grouting cure time", "share": 33}, {"cause": "Piping strain rework", "share": 31}, {"cause": "Vendor specialist", "share": 22}, {"cause": "Manpower", "share": 14}], contractor="Kaziranga Rotating Services", location="Pump alleys", previous_projects=["NRL Expansion 2019", "Numaligarh DHDT 2023"]),
            ProjectMemory(id="MEM-04", activity_type="Equipment Foundation Concreting", discipline="Civil", occurrences=41, planned_avg=9.0, actual_avg=9.6, causes=[{"cause": "Weather", "share": 46}, {"cause": "Concrete supply", "share": 28}, {"cause": "Rebar inspection", "share": 26}], contractor="Brahmaputra Civil Works", location="All units", previous_projects=["Bongaigaon CDU 2022", "Duliajan GCS Revamp 2021"]),
            ProjectMemory(id="MEM-05", activity_type="Cable Tray & Power Cable Pulling", discipline="Electrical", occurrences=22, planned_avg=11.0, actual_avg=13.2, causes=[{"cause": "Rack access (piping clash)", "share": 44}, {"cause": "Cable delivery", "share": 30}, {"cause": "Manpower", "share": 26}], contractor="Digboi Electricals Pvt Ltd", location="Rack tiers, trenches", previous_projects=["NRL Expansion 2019", "Numaligarh DHDT 2023"]),
            ProjectMemory(id="MEM-06", activity_type="Instrument Installation & Calibration", discipline="Instrumentation", occurrences=29, planned_avg=6.0, actual_avg=6.8, causes=[{"cause": "Line readiness", "share": 40}, {"cause": "Calibration equipment", "share": 25}, {"cause": "Vendor documentation", "share": 35}], contractor="Tezpur Instrumentation Co.", location="Process units", previous_projects=["Bongaigaon CDU 2022"]),
        ]
        db.add_all(mem_items)
        
        # 11. Audit Logs
        logs = [
            AuditLog(id="AUD-0141", timestamp="27 Sep 2026, 06:12 PM", source="Daily Progress Report #027", source_text="PR-1 pipe support installation continuing, approx 60%.", detected="PROGRESS 60%", activity_id="PIP-L6-005", confidence=93.0, field="Actual Progress", previous="48%", next_value="60%", reviewer="Project Planner", status="Approved"),
            AuditLog(id="AUD-0140", timestamp="27 Sep 2026, 05:40 PM", source="Daily Progress Report #027", source_text="Transformer TR-2 installation completed and handed over.", detected="END", activity_id="ELE-L6-004", confidence=97.0, field="Actual Finish", previous="—", next_value="23 Sep 2026", reviewer="Project Planner", status="Approved"),
            AuditLog(id="AUD-0139", timestamp="27 Sep 2026, 11:05 AM", source="Assam Pipeline Constructors Weekly #38", source_text="Line 12 HT-04 erection 100%.", detected="END", activity_id="PIP-L6-006", confidence=88.0, field="Actual Finish", previous="—", next_value="—", reviewer="System", status="Flagged"),
            AuditLog(id="AUD-0138", timestamp="26 Sep 2026, 04:22 PM", source="Supervisor Site Diary 26-Sep", source_text="K-201 alignment on hold for shim plates.", detected="PROGRESS", activity_id="ROT-L6-002", confidence=91.0, field="Actual Progress", previous="20%", next_value="20%", reviewer="Project Manager", status="Approved")
        ]
        db.add_all(logs)
        
        db.commit()
        print("Database seeded successfully with 48 activities and full synthetic data!")
    finally:
        if close_after:
            db.close()

if __name__ == "__main__":
    seed_database()
