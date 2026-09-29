import fs from "fs";
import path from "path";
import type {
  Activity,
  AuditLog,
  Conflict,
  CrossLink,
  Discipline,
  ExtractedEvent,
  MemoryRecord,
  RiskSignal,
  Settings,
  SiteReport,
  Unmatched,
} from "./types";

const DB_FILE = path.join(process.cwd(), "server", "data", "database.json");

export const TODAY = "2026-09-28";

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.round((da - db) / (1000 * 60 * 60 * 24));
}

export function nowStamp(): string {
  const d = new Date();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = d.getDate();
  const mon = months[d.getMonth()];
  const yr = d.getFullYear();
  let hr = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const ampm = hr >= 12 ? "PM" : "AM";
  if (hr > 12) hr -= 12;
  if (hr === 0) hr = 12;
  return `${day} ${mon} ${yr}, ${String(hr).padStart(2, "0")}:${min} ${ampm}`;
}

export const PROJECT_INFO = {
  id: "OIL-REF-2026-01",
  name: "Refinery Expansion & Utilities Project",
  status: "In Progress",
  client: "Oil India Limited (demonstration)",
  location: "Synthetic Site — Upper Assam",
  baseline: "BL-03 (approved 12 Jan 2026)",
  start: "2026-01-15",
  finish: "2027-06-30",
  dataLabel: "Synthetic Demonstration Data",
};

export const DISCIPLINES: Discipline[] = [
  "Civil",
  "Piping",
  "Mechanical",
  "Rotating",
  "Electrical",
  "Instrumentation",
  "HSE",
];

export const AREAS: Record<string, string> = {
  "Area A": "Crude Distillation Unit (CDU-II)",
  "Area B": "Diesel Hydrotreater (DHDT)",
  "Area C": "Utilities & Offsites (U&O)",
};

export const CONTRACTORS: Record<Discipline, string> = {
  Civil: "Brahmaputra Civil Works",
  Piping: "Assam Pipeline Constructors",
  Mechanical: "Northeast Mech Erectors",
  Rotating: "Kaziranga Rotating Services",
  Electrical: "Digboi Electricals Pvt Ltd",
  Instrumentation: "Tezpur Instrumentation Co.",
  HSE: "Site HSE Cell",
};

const DCODE: Record<Discipline, string> = {
  Civil: "CIV",
  Piping: "PIP",
  Mechanical: "MEC",
  Rotating: "ROT",
  Electrical: "ELE",
  Instrumentation: "INS",
  HSE: "HSE",
};

export const UNITS: Record<string, string> = {
  "Area A": "U2 – Crude Unit Construction",
  "Area B": "U3 – Hydrotreater Construction",
  "Area C": "U4 – Utilities Construction",
};

type SeedRow = [string, string, Discipline, string, number, number, "C" | "P" | "D" | "N", number, number, string[]?];

const SEED_ROWS: SeedRow[] = [
  ["CIV-A-0101", "Site Grading & Compaction Area A", "Civil", "Area A", -60, 10, "C", 100, 1],
  ["CIV-A-0102", "Foundation F-102 Concreting", "Civil", "Area A", -8, 10, "P", 85, 1],
  ["CIV-A-0105", "Pipe Rack PR-1 Foundations", "Civil", "Area A", -45, 14, "C", 100, 2],
  ["CIV-A-0108", "Equipment Foundation F-108", "Civil", "Area A", -30, 12, "C", 100, 0],
  ["CIV-A-0110", "Anchor Bolt Grouting F-108", "Civil", "Area A", -20, 4, "C", 100, 1, ["CIV-A-0108"]],
  ["CIV-B-0112", "Pump Foundation P-101 Plinth", "Civil", "Area B", -40, 8, "C", 100, 0],
  ["CIV-B-0118", "Underground Drainage Network", "Civil", "Area B", -12, 20, "D", 30, 5],
  ["CIV-C-0124", "Cable Trench Excavation Unit 2", "Civil", "Area C", -35, 10, "C", 100, 2],
  ["CIV-C-0130", "Road & Paving Utilities Block", "Civil", "Area C", 6, 15, "N", 0, 0],
  ["PIP-A-0240", "Pipe Rack PR-1 Steel Erection", "Piping", "Area A", -32, 12, "C", 100, 1, ["CIV-A-0105"]],
  ["PIP-A-0245", 'Erect Line 24"-XX', "Piping", "Area A", -3, 5, "D", 0, 0, ["PIP-A-0240", "PIP-A-0252"]],
  ["PIP-A-0246", 'Erect Line 18"-YY', "Piping", "Area A", -4, 7, "P", 40, 1, ["PIP-A-0240"]],
  ["PIP-A-0252", "Spool Fabrication Batch 3", "Piping", "Area A", -28, 14, "C", 100, 2],
  ["PIP-A-0258", 'Weld NDT Line 16"-ZZ', "Piping", "Area A", -6, 8, "P", 55, 1],
  ["PIP-A-0271", "Install Pipe Supports PR-1", "Piping", "Area A", -9, 12, "P", 60, 2, ["PIP-A-0240"]],
  ["PIP-B-0277", 'Erect Line 12"-HT-04', "Piping", "Area B", -14, 10, "D", 45, 4],
  ["PIP-B-0280", 'Erect Line 8"-PR-07', "Piping", "Area B", -5, 8, "P", 35, 1],
  ["PIP-B-0283", "Hydrotest Loop HT-12", "Piping", "Area B", 4, 5, "N", 0, 0, ["PIP-B-0277"]],
  ["PIP-C-0290", 'Cooling Water Header 30"-CW', "Piping", "Area C", -20, 15, "D", 50, 3],
  ["PIP-C-0294", 'Firewater Line 10"-FW Erection', "Piping", "Area C", -38, 14, "C", 100, 1],
  ["MEC-A-0501", "Static Equipment Installation V-201", "Mechanical", "Area A", -25, 10, "C", 100, 1, ["CIV-A-0108"]],
  ["MEC-A-0505", "Heat Exchanger E-204 Setting", "Mechanical", "Area A", -18, 8, "C", 100, 0],
  ["MEC-A-0508", "Column C-101 Internals Installation", "Mechanical", "Area A", -7, 14, "P", 35, 2],
  ["MEC-B-0514", "Storage Tank T-301 Shell Erection", "Mechanical", "Area B", -50, 30, "C", 100, 2],
  ["MEC-B-0518", "Air Cooler AC-3 Setting", "Mechanical", "Area B", -6, 10, "P", 40, 1],
  ["MEC-A-0510", "Pump Installation P-101", "Rotating", "Area B", 1, 6, "N", 0, 0, ["CIV-B-0112"]],
  ["ROT-A-0520", "Compressor K-201 Alignment", "Rotating", "Area A", -10, 10, "D", 20, 5],
  ["ROT-B-0526", "Pump P-102 Grouting", "Rotating", "Area B", -22, 4, "C", 100, 0],
  ["ROT-C-0532", "Cooling Tower Fan CT-1 Installation", "Rotating", "Area C", -9, 12, "P", 70, 0],
  ["ROT-B-0538", "Pump P-103 Coupling Alignment", "Rotating", "Area B", -2, 5, "P", 25, 1],
  ["ELE-A-0308", "Substation SS-2 Earthing Grid", "Electrical", "Area A", -40, 12, "C", 100, 1],
  ["ELE-A-0314", "Install Cable Tray Unit 2", "Electrical", "Area A", -10, 14, "P", 65, 2, ["CIV-C-0124"]],
  ["ELE-A-0320", "Pull Power Cable Unit 2", "Electrical", "Area A", -2, 10, "D", 0, 0, ["ELE-A-0314", "PIP-A-0245"]],
  ["ELE-B-0326", "Transformer TR-2 Installation", "Electrical", "Area B", -26, 6, "C", 100, 1],
  ["ELE-B-0332", "MCC Panel Erection SS-2", "Electrical", "Area B", -12, 14, "P", 75, 1],
  ["ELE-C-0338", "Area Lighting Utilities Block", "Electrical", "Area C", -5, 10, "P", 30, 0],
  ["ELE-C-0342", "Earthing Utilities Block", "Electrical", "Area C", -28, 8, "C", 100, 0],
  ["INS-A-0408", "Instrument Tray Routing", "Instrumentation", "Area A", -16, 10, "C", 100, 1],
  ["INS-A-0415", "Install Pressure Transmitter PT-2401", "Instrumentation", "Area A", -4, 6, "P", 30, 1, ["PIP-A-0245"]],
  ["INS-A-0421", "Instrument Calibration Batch 1", "Instrumentation", "Area A", 3, 5, "N", 0, 0, ["INS-A-0415"]],
  ["INS-A-0445", "Impulse Line Tubing", "Instrumentation", "Area A", -3, 9, "P", 20, 1],
  ["INS-B-0427", "Control Valve CV-110 Installation", "Instrumentation", "Area B", -9, 7, "D", 20, 4],
  ["INS-B-0433", "Junction Box Installation", "Instrumentation", "Area B", -20, 8, "C", 100, 0],
  ["INS-C-0439", "Fire & Gas Detector Loop Check", "Instrumentation", "Area C", -6, 10, "P", 45, 0],
  ["HSE-A-0601", "Fire Protection Inspection", "HSE", "Area A", -14, 3, "C", 100, 0],
  ["HSE-A-0605", "Scaffolding Safety Audit Area A", "HSE", "Area A", -2, 4, "P", 50, 0],
  ["HSE-B-0610", "Confined Space Permit Drill", "HSE", "Area B", -30, 2, "C", 100, 0],
  ["HSE-C-0615", "Fire Water Network Flush", "HSE", "Area C", -18, 7, "C", 100, 1],
];

export function buildSeedActivities(): Activity[] {
  return SEED_ROWS.map(([id, name, discipline, area, off, dur, st, prog, slip, deps], i) => {
    const plannedStart = addDays(TODAY, off);
    const plannedFinish = addDays(plannedStart, dur);
    let actualStart: string | null = null;
    let actualFinish: string | null = null;
    if (st === "C") {
      actualStart = addDays(plannedStart, slip);
      actualFinish = addDays(plannedFinish, slip + (i % 2));
    } else if (st === "P" || (st === "D" && prog > 0)) {
      actualStart = addDays(plannedStart, Math.min(slip, -off));
    }
    return {
      id,
      name,
      level: i % 3 === 0 ? "L6" : "L5",
      wbs: `OIL-REF.${UNITS[area]!.slice(0, 2)}.${area.slice(-1)}.${DCODE[discipline]}`,
      unit: UNITS[area]!,
      discipline,
      area,
      plannedStart,
      plannedFinish,
      duration: dur,
      actualStart,
      actualFinish,
      progress: prog,
      dependencies: deps ?? [],
      contractor: CONTRACTORS[discipline],
      verification: st === "N" ? "System Recorded" : "Planner Verified",
      aiConfidence: st === "N" || prog === 0 ? null : 88 + (i % 10),
    };
  });
}

export function buildInitialDb() {
  const activities = buildSeedActivities();

  const reports: SiteReport[] = [
    {
      id: "RPT-027",
      name: "DPR_027_Area-A-C_27Sep2026.pdf",
      type: "Daily Progress Report",
      fileType: "PDF",
      source: "Daily Progress Report #027",
      date: addDays(TODAY, -1),
      discipline: "Multi-discipline",
      status: "Processed",
      lines: [
        "Line 16 inch ZZ weld NDT progressed 62%.",
        "Area lighting utilities block poles erected, 40% done Area C.",
        "Control valve CV-110 installation started on Area B.",
      ],
      uploadedAt: `${addDays(TODAY, -1)} 18:00:00`,
    },
    {
      id: "RPT-026",
      name: "Contractor_APC_Weekly_38.xlsx",
      type: "Contractor Report",
      fileType: "XLSX",
      source: "Assam Pipeline Constructors Weekly #38",
      date: addDays(TODAY, -2),
      discipline: "Piping",
      status: "Processed",
      lines: ["Line 12 HT-04 erection 100%."],
      uploadedAt: `${addDays(TODAY, -2)} 17:30:00`,
    },
    {
      id: "RPT-025",
      name: "Schedule_Extract_P6_BL03.csv",
      type: "Schedule Extract",
      fileType: "CSV",
      source: "Primavera P6 Extract",
      date: addDays(TODAY, -3),
      discipline: "All",
      status: "Processed",
      lines: [],
      uploadedAt: `${addDays(TODAY, -3)} 09:00:00`,
    },
  ];

  const events: ExtractedEvent[] = [
    {
      id: "EVT-0091",
      reportId: "RPT-027",
      source: "Daily Progress Report #027",
      text: "Line 16 inch ZZ weld NDT progressed 62%.",
      discipline: "Piping",
      description: "Line 16 inch ZZ weld NDT",
      area: "Area A",
      event: "PROGRESS",
      date: addDays(TODAY, -1),
      time: null,
      progress: 62,
      extractionConfidence: 94,
      candidates: [
        {
          activityId: "PIP-A-0258",
          confidence: 95,
          reasons: ["Discipline matches: Piping", "Line size matches: 16 inch", "Semantic similarity on: weld, ndt"],
          ambiguities: [],
        },
      ],
      status: "pending",
    },
    {
      id: "EVT-0092",
      reportId: "RPT-027",
      source: "Daily Progress Report #027",
      text: "Area lighting utilities block poles erected, 40% done Area C.",
      discipline: "Electrical",
      description: "Area lighting utilities block poles",
      area: "Area C",
      event: "PROGRESS",
      date: addDays(TODAY, -1),
      time: null,
      progress: 40,
      extractionConfidence: 92,
      candidates: [
        {
          activityId: "ELE-C-0338",
          confidence: 91,
          reasons: ["Discipline matches: Electrical", "Area matches: Area C", "Semantic similarity on: lighting, utilities"],
          ambiguities: [],
        },
      ],
      status: "pending",
    },
    {
      id: "EVT-0093",
      reportId: "RPT-027",
      source: "Daily Progress Report #027",
      text: "Control valve CV-110 installation started on Area B.",
      discipline: "Instrumentation",
      description: "Control valve CV-110 installation",
      area: "Area B",
      event: "START",
      date: addDays(TODAY, -1),
      time: null,
      progress: 10,
      extractionConfidence: 95,
      candidates: [
        {
          activityId: "INS-B-0427",
          confidence: 96,
          reasons: ["Discipline matches: Instrumentation", "Equipment / tag reference matches: CV110", "Area matches: Area B"],
          ambiguities: [],
        },
      ],
      status: "pending",
    },
  ];

  const unmatched: Unmatched[] = [
    {
      id: "UNM-011",
      text: "Temporary scaffold access platform built near column C-101 for internals work.",
      source: "Daily Progress Report #027",
      date: addDays(TODAY, -1),
      discipline: "Mechanical",
      area: "Area A",
      occurrences: 4,
      closest: "MEC-A-0508",
      closestConfidence: 48,
      aiConfidence: 84,
      explanation: "Enabling work performed on site that is not represented as a discrete L6 activity.",
      status: "Open",
    },
    {
      id: "UNM-012",
      text: "Additional drain funnel installed at P-102 baseplate per field instruction FI-219.",
      source: "Assam Pipeline Constructors Weekly #38",
      date: addDays(TODAY, -2),
      discipline: "Piping",
      area: "Area B",
      occurrences: 2,
      closest: "ROT-B-0526",
      closestConfidence: 41,
      aiConfidence: 79,
      explanation: "Field-instruction scope that appears to have no baseline schedule activity.",
      status: "Open",
    },
  ];

  const conflicts: Conflict[] = [
    {
      id: "CON-004",
      activityId: "PIP-B-0277",
      kind: "PROGRESS CONFLICT",
      status: "Open",
      sources: [
        {
          source: "Contractor Daily Report",
          document: "APC_Daily_27Sep.xlsx",
          timestamp: `${addDays(TODAY, -1)} 18:10`,
          progress: 100,
          author: "Assam Pipeline Constructors",
          note: 'Line 12"-HT-04 erection complete, ready for hydrotest.',
        },
        {
          source: "Supervisor Site Diary",
          document: "SiteDiary_Supervisor_RK_27Sep.docx",
          timestamp: `${addDays(TODAY, -1)} 17:45`,
          progress: 70,
          author: "R. Kalita (Site Supervisor)",
          note: "Final two spools pending, bolting incomplete at flange F-7.",
        },
      ],
    },
    {
      id: "CON-005",
      activityId: "ELE-B-0332",
      kind: "STATUS CONFLICT",
      status: "Open",
      sources: [
        {
          source: "Discipline Tracker",
          document: "Discipline_Progress_Wk39.xlsx",
          timestamp: `${addDays(TODAY, -1)} 09:00`,
          progress: 75,
          author: "Electrical Planning Desk",
          note: "MCC panels 6 of 8 erected.",
        },
        {
          source: "Contractor Daily Report",
          document: "DEPL_DPR_27Sep.pdf",
          timestamp: `${addDays(TODAY, -1)} 19:20`,
          progress: 95,
          author: "Digboi Electricals Pvt Ltd",
          note: "All MCC panels erected, glanding in progress.",
        },
      ],
    },
  ];

  const crossLinks: CrossLink[] = [
    {
      id: "XD-01",
      title: "Foundation release to cable pulling chain",
      severity: "high",
      chain: [
        { activityId: "CIV-A-0102", state: "Foundation F102 near completion", tone: "ok" },
        { activityId: "PIP-A-0245", state: 'Line 24" erection started late', tone: "warn" },
        { activityId: "ELE-A-0320", state: "Cable pulling blocked — rack occupied", tone: "risk" },
        { activityId: "INS-A-0415", state: "Transmitter hook-up waiting on line", tone: "warn" },
      ],
      insight:
        'Piping erection on PR-1 is occupying the shared rack tier. Electrical cable pulling cannot begin until Line 24" is supported, which may cascade into instrument hook-up.',
    },
    {
      id: "XD-02",
      title: "Pump P-101 installation readiness",
      severity: "medium",
      chain: [
        { activityId: "CIV-B-0112", state: "Plinth complete & cured", tone: "ok" },
        { activityId: "MEC-A-0510", state: "Pump setting planned 29 Sep", tone: "info" },
        { activityId: "PIP-B-0277", state: "Suction line progress disputed", tone: "risk" },
      ],
      insight:
        "Pump P-101 can be set on schedule, but suction piping progress is in conflict between sources (CON-004). Resolve before hook-up is scheduled.",
    },
    {
      id: "XD-03",
      title: "Compressor alignment vs. HSE permits",
      severity: "low",
      chain: [
        { activityId: "HSE-A-0605", state: "Scaffold audit in progress", tone: "info" },
        { activityId: "ROT-A-0520", state: "Alignment resumed after hold", tone: "warn" },
        { activityId: "ELE-A-0314", state: "Tray above K-201 at 65%", tone: "info" },
      ],
      insight:
        "Overhead cable tray work above K-201 overlaps the compressor alignment window. Consider permit sequencing to avoid simultaneous operations.",
    },
  ];

  const memory: MemoryRecord[] = [
    {
      id: "MEM-01",
      activityType: "24 inch Pipe Erection",
      discipline: "Piping",
      occurrences: 18,
      plannedAvg: 5.2,
      actualAvg: 6.7,
      causes: [
        { cause: "Material availability", share: 38 },
        { cause: "Crane availability", share: 27 },
        { cause: "Manpower", share: 21 },
        { cause: "Weather", share: 14 },
      ],
      contractor: "Assam Pipeline Constructors",
      location: "Pipe racks, process units",
      previousProjects: ["NRL Expansion 2019", "Duliajan GCS Revamp 2021", "Numaligarh DHDT 2023"],
    },
    {
      id: "MEM-02",
      activityType: "Static Equipment Installation",
      discipline: "Mechanical",
      occurrences: 26,
      plannedAvg: 8.0,
      actualAvg: 9.1,
      causes: [
        { cause: "Crane availability", share: 41 },
        { cause: "Foundation readiness", share: 29 },
        { cause: "Vendor documentation", share: 18 },
        { cause: "Weather", share: 12 },
      ],
      contractor: "Northeast Mech Erectors",
      location: "Process units",
      previousProjects: ["Duliajan GCS Revamp 2021", "Bongaigaon CDU 2022"],
    },
    {
      id: "MEM-03",
      activityType: "Pump Installation & Alignment",
      discipline: "Rotating",
      occurrences: 34,
      plannedAvg: 5.5,
      actualAvg: 7.4,
      causes: [
        { cause: "Grouting cure time", share: 33 },
        { cause: "Piping strain rework", share: 31 },
        { cause: "Vendor specialist", share: 22 },
        { cause: "Manpower", share: 14 },
      ],
      contractor: "Kaziranga Rotating Services",
      location: "Pump alleys",
      previousProjects: ["NRL Expansion 2019", "Numaligarh DHDT 2023"],
    },
    {
      id: "MEM-04",
      activityType: "Equipment Foundation Concreting",
      discipline: "Civil",
      occurrences: 41,
      plannedAvg: 9.0,
      actualAvg: 9.6,
      causes: [
        { cause: "Weather", share: 46 },
        { cause: "Concrete supply", share: 28 },
        { cause: "Rebar inspection", share: 26 },
      ],
      contractor: "Brahmaputra Civil Works",
      location: "All units",
      previousProjects: ["Bongaigaon CDU 2022", "Duliajan GCS Revamp 2021"],
    },
    {
      id: "MEM-05",
      activityType: "Cable Tray & Power Cable Pulling",
      discipline: "Electrical",
      occurrences: 22,
      plannedAvg: 11.0,
      actualAvg: 13.2,
      causes: [
        { cause: "Rack access (piping clash)", share: 44 },
        { cause: "Cable delivery", share: 30 },
        { cause: "Manpower", share: 26 },
      ],
      contractor: "Digboi Electricals Pvt Ltd",
      location: "Rack tiers, trenches",
      previousProjects: ["NRL Expansion 2019", "Numaligarh DHDT 2023"],
    },
    {
      id: "MEM-06",
      activityType: "Instrument Installation & Calibration",
      discipline: "Instrumentation",
      occurrences: 29,
      plannedAvg: 6.0,
      actualAvg: 6.8,
      causes: [
        { cause: "Line readiness", share: 40 },
        { cause: "Calibration equipment", share: 25 },
        { cause: "Vendor documentation", share: 35 },
      ],
      contractor: "Tezpur Instrumentation Co.",
      location: "Process units",
      previousProjects: ["Bongaigaon CDU 2022"],
    },
    {
      id: "MEM-07",
      activityType: "Hydrotest Loop",
      discipline: "Piping",
      occurrences: 15,
      plannedAvg: 4.0,
      actualAvg: 5.6,
      causes: [
        { cause: "Punch list closure", share: 42 },
        { cause: "Water availability", share: 23 },
        { cause: "Test pack documentation", share: 35 },
      ],
      contractor: "Assam Pipeline Constructors",
      location: "All units",
      previousProjects: ["Duliajan GCS Revamp 2021", "Numaligarh DHDT 2023"],
    },
  ];

  const audit: AuditLog[] = [
    {
      id: "AUD-0141",
      timestamp: "27 Sep 2026, 06:12 PM",
      source: "Daily Progress Report #027",
      sourceText: "PR-1 pipe support installation continuing, approx 60%.",
      detected: "PROGRESS 60%",
      activityId: "PIP-A-0271",
      confidence: 93,
      field: "Actual Progress",
      previous: "48%",
      next: "60%",
      reviewer: "Project Planner",
      status: "Approved",
    },
    {
      id: "AUD-0140",
      timestamp: "27 Sep 2026, 05:40 PM",
      source: "Daily Progress Report #027",
      sourceText: "Transformer TR-2 installation completed and handed over.",
      detected: "END",
      activityId: "ELE-B-0326",
      confidence: 97,
      field: "Actual Finish",
      previous: "—",
      next: "23 Sep 2026",
      reviewer: "Project Planner",
      status: "Approved",
    },
    {
      id: "AUD-0139",
      timestamp: "27 Sep 2026, 11:05 AM",
      source: "Assam Pipeline Constructors Weekly #38",
      sourceText: "Line 12 HT-04 erection 100%.",
      detected: "END",
      activityId: "PIP-B-0277",
      confidence: 88,
      field: "Actual Finish",
      previous: "—",
      next: "—",
      reviewer: "System",
      status: "Flagged",
    },
    {
      id: "AUD-0138",
      timestamp: "26 Sep 2026, 04:22 PM",
      source: "Supervisor Site Diary 26-Sep",
      sourceText: "K-201 alignment on hold for shim plates.",
      detected: "PROGRESS",
      activityId: "ROT-A-0520",
      confidence: 91,
      field: "Actual Progress",
      previous: "20%",
      next: "20%",
      reviewer: "Project Manager",
      status: "Approved",
    },
  ];

  const settings: Settings = {
    highThreshold: 90,
    reviewThreshold: 75,
    unmatchedThreshold: 65,
    aiProvider: "demo",
  };

  return {
    activities,
    reports,
    events,
    unmatched,
    conflicts,
    crossLinks,
    memory,
    audit,
    settings,
    seq: 300,
  };
}

export interface DatabaseSchema {
  activities: Activity[];
  reports: SiteReport[];
  events: ExtractedEvent[];
  unmatched: Unmatched[];
  conflicts: Conflict[];
  crossLinks: CrossLink[];
  memory: MemoryRecord[];
  audit: AuditLog[];
  settings: Settings;
  seq: number;
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error("Failed to read database file, initializing fresh seed:", e);
    }
    const init = buildInitialDb();
    this.saveData(init);
    return init;
  }

  private saveData(data: DatabaseSchema) {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write to database file:", e);
    }
  }

  public save() {
    this.saveData(this.data);
  }

  public reset() {
    this.data = buildInitialDb();
    this.save();
    return this.data;
  }

  public nextId(prefix: string): string {
    this.data.seq++;
    this.save();
    return `${prefix}-${String(this.data.seq).padStart(4, "0")}`;
  }

  // Activity methods
  public getActivities(): Activity[] {
    return this.data.activities;
  }

  public getActivity(id: string): Activity | undefined {
    return this.data.activities.find((a) => a.id === id);
  }

  public updateActivity(id: string, update: Partial<Activity>): Activity | undefined {
    const idx = this.data.activities.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;
    this.data.activities[idx] = { ...this.data.activities[idx], ...update };
    this.save();
    return this.data.activities[idx];
  }

  public addActivity(act: Activity) {
    this.data.activities.unshift(act);
    this.save();
    return act;
  }

  // Reports
  public getReports(): SiteReport[] {
    return this.data.reports;
  }

  public getReport(id: string): SiteReport | undefined {
    return this.data.reports.find((r) => r.id === id);
  }

  public addReport(rpt: SiteReport): SiteReport {
    this.data.reports.unshift(rpt);
    this.save();
    return rpt;
  }

  public updateReport(id: string, update: Partial<SiteReport>): SiteReport | undefined {
    const idx = this.data.reports.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    this.data.reports[idx] = { ...this.data.reports[idx], ...update };
    this.save();
    return this.data.reports[idx];
  }

  // Events
  public getEvents(): ExtractedEvent[] {
    return this.data.events;
  }

  public getEvent(id: string): ExtractedEvent | undefined {
    return this.data.events.find((e) => e.id === id);
  }

  public addEvents(newEvents: ExtractedEvent[]) {
    this.data.events = [...newEvents, ...this.data.events];
    this.save();
  }

  public updateEvent(id: string, update: Partial<ExtractedEvent>): ExtractedEvent | undefined {
    const idx = this.data.events.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    this.data.events[idx] = { ...this.data.events[idx], ...update };
    this.save();
    return this.data.events[idx];
  }

  // Unmatched
  public getUnmatched(): Unmatched[] {
    return this.data.unmatched;
  }

  public addUnmatched(items: Unmatched[]) {
    this.data.unmatched = [...items, ...this.data.unmatched];
    this.save();
  }

  public updateUnmatched(id: string, update: Partial<Unmatched>): Unmatched | undefined {
    const idx = this.data.unmatched.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    this.data.unmatched[idx] = { ...this.data.unmatched[idx], ...update };
    this.save();
    return this.data.unmatched[idx];
  }

  // Conflicts
  public getConflicts(): Conflict[] {
    return this.data.conflicts;
  }

  public updateConflict(id: string, update: Partial<Conflict>): Conflict | undefined {
    const idx = this.data.conflicts.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.data.conflicts[idx] = { ...this.data.conflicts[idx], ...update };
    this.save();
    return this.data.conflicts[idx];
  }

  // Cross links
  public getCrossLinks(): CrossLink[] {
    return this.data.crossLinks;
  }

  // Memory
  public getMemory(): MemoryRecord[] {
    return this.data.memory;
  }

  // Audit
  public getAudit(): AuditLog[] {
    return this.data.audit;
  }

  public addAuditLog(log: AuditLog) {
    this.data.audit.unshift(log);
    this.save();
  }

  // Settings
  public getSettings(): Settings {
    return this.data.settings;
  }

  public updateSettings(update: Partial<Settings>): Settings {
    this.data.settings = { ...this.data.settings, ...update };
    this.save();
    return this.data.settings;
  }

  // Dynamic Risk Signal generation
  public computeRiskSignals(): RiskSignal[] {
    const acts = this.data.activities;
    const signals: RiskSignal[] = [];

    for (const a of acts) {
      if (a.actualFinish || a.progress >= 100) continue;

      const delayedStart = a.actualStart ? diffDays(a.actualStart, a.plannedStart) : diffDays(TODAY, a.plannedStart);
      const remainingProgress = 100 - a.progress;
      const daysRemaining = diffDays(a.plannedFinish, TODAY);
      const isPastPlannedFinish = daysRemaining < 0;

      const activeUnmatched = this.data.unmatched.filter((u) => u.closest === a.id && u.status === "Open");
      const activeConflict = this.data.conflicts.find((c) => c.activityId === a.id && c.status === "Open");
      const hasDownstream = acts.some((x) => x.dependencies.includes(a.id));

      const reasons: string[] = [];
      let severity: "high" | "medium" | "low" = "low";
      let varianceDays = 0;

      if (isPastPlannedFinish) {
        severity = "high";
        varianceDays = Math.abs(daysRemaining) + Math.ceil(a.duration * (remainingProgress / 100));
        reasons.push(`Activity is past planned finish (${a.plannedFinish}) with ${remainingProgress}% progress pending`);
      } else if (delayedStart > 2) {
        severity = delayedStart > 5 ? "high" : "medium";
        varianceDays = delayedStart;
        reasons.push(`Actual start slipped by +${delayedStart} days against baseline`);
      }

      if (activeConflict) {
        severity = "high";
        reasons.push(`Progress report conflict active between site sources (CON-${activeConflict.id})`);
      }

      if (activeUnmatched.length > 0) {
        if (severity === "low") severity = "medium";
        reasons.push(`${activeUnmatched.length} unmapped field-level observations recorded near this activity`);
      }

      if (hasDownstream && (severity === "high" || severity === "medium")) {
        reasons.push("Critical path predecessor: delays will cascade into downstream activities");
      }

      if (reasons.length > 0) {
        const estFinish = addDays(TODAY, Math.max(1, Math.ceil(a.duration * (remainingProgress / 100))));
        signals.push({
          id: `RSK-${a.id}`,
          activityId: a.id,
          activityName: a.name,
          discipline: a.discipline,
          area: a.area,
          severity,
          varianceDays: Math.max(varianceDays, diffDays(estFinish, a.plannedFinish)),
          forecastFinish: estFinish,
          plannedFinish: a.plannedFinish,
          progress: a.progress,
          signals: reasons,
          recommendation:
            severity === "high"
              ? "Expedite resource allocation and verify physical site readiness immediately."
              : "Monitor daily progress reports and coordinate with contractor desk.",
        });
      }
    }

    signals.sort((x, y) => {
      const p = { high: 3, medium: 2, low: 1 };
      return p[y.severity] - p[x.severity] || y.varianceDays - x.varianceDays;
    });

    return signals;
  }
}

export const db = new Database();
