import re
import datetime
from typing import Dict, Any, Optional

TODAY = "2026-09-28"

DISC_KEYWORDS = [
    ("Instrumentation", re.compile(r"\b(transmitter|instrument|calibration|impulse|detector|loop check|control valve|junction box|pt-?\d+|cv-?\d+)\b", re.IGNORECASE)),
    ("Mechanical", re.compile(r"\b(column|exchanger|vessel|tank|air cooler|internals|static equipment)\b", re.IGNORECASE)),
    ("Electrical", re.compile(r"\b(cable|tray|mcc|transformer|substation|earthing|lighting|power|electrical)\b", re.IGNORECASE)),
    ("Civil", re.compile(r"\b(foundation|concret\w*|grading|trench|drainage|paving|plinth|grout\w*|civil)\b", re.IGNORECASE)),
    ("Rotating", re.compile(r"\b(pump|compressor|fan|coupling|alignment)\b", re.IGNORECASE)),
    ("HSE", re.compile(r"\b(scaffold\w*|permit|safety|fire protection|hse|audit)\b", re.IGNORECASE)),
    ("Piping", re.compile(r"\b(spool|line|pipe|piping|weld|ndt|hydrotest|header|bypass|valve)\b", re.IGNORECASE)),
]

def extract_entities(text: str, fallback_date: str = TODAY) -> Dict[str, Any]:
    lower = text.lower()
    
    # 1. Discipline Identification
    discipline = None
    for disc_name, pattern in DISC_KEYWORDS:
        if pattern.search(text):
            discipline = disc_name
            break
            
    # 2. Area Identification
    area_match = re.search(r"\barea\s*([abc])\b", text, re.IGNORECASE)
    area = f"Area {area_match.group(1).upper()}" if area_match else None
    
    # 3. Progress Percentage
    pct_match = re.search(r"(\d{1,3})\s*(%|percent)", text, re.IGNORECASE)
    progress = min(100.0, float(pct_match.group(1))) if pct_match else None
    
    # 4. Event Type & Action
    event_type = "PROGRESS"
    action = "progress"
    
    if re.search(r"\b(started|start|commenced|mobilised|begun|began)\b", text, re.IGNORECASE) and progress is None:
        event_type = "START"
        action = "start"
    elif re.search(r"\b(completed|complete|finished|handed over)\b", text, re.IGNORECASE) and progress is None:
        event_type = "END"
        action = "completion"
    elif progress == 100.0:
        event_type = "END"
        action = "completion"
    elif progress is None and re.search(r"\b(installed|mounted|fitted|built|cast|erected)\b", text, re.IGNORECASE):
        event_type = "END"
        action = "installation"
        
    # 5. Time extraction
    time_match = re.search(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b", text, re.IGNORECASE)
    time_str = None
    if time_match and (time_match.group(2) or time_match.group(3)):
        h = int(time_match.group(1))
        m = time_match.group(2) or "00"
        ap = (time_match.group(3) or ("am" if "morning" in lower or h < 12 else "pm")).upper()
        if h > 12:
            h -= 12
        time_str = f"{h:02d}:{m} {ap}"
        
    # 6. Date
    event_date = fallback_date
    if "yesterday" in lower:
        dt = datetime.datetime.strptime(fallback_date, "%Y-%m-%d") - datetime.timedelta(days=1)
        event_date = dt.strftime("%Y-%m-%d")
        
    # 7. Normalized Description
    cleaned_desc = re.sub(
        r"\b(started|completed|today|yesterday|reached|progressed to|progressing|in area [abc]|at \d{1,2}(:\d{2})?\s*(am|pm)?|this morning|about|approx\.?|\d{1,3}\s*(%|percent)( complete| done)?)\b",
        "",
        text,
        flags=re.IGNORECASE
    )
    cleaned_desc = re.sub(r"[,.]+", " ", cleaned_desc).strip()
    cleaned_desc = re.sub(r"\s+", " ", cleaned_desc)
    description = (cleaned_desc[:1].upper() + cleaned_desc[1:]) if cleaned_desc else text
    
    # 8. Confidence
    confidence = min(99.0, 80.0 + (8.0 if discipline else 0.0) + (4.0 if area else 0.0) + (5.0 if progress is not None or event_type != "PROGRESS" else 0.0) + (2.0 if time_str else 0.0))
    
    return {
        "discipline": discipline,
        "description": description,
        "area": area,
        "event_type": event_type,
        "action": action,
        "event_date": event_date,
        "event_time": time_str,
        "progress": progress,
        "confidence": confidence,
        "source_text": text
    }
