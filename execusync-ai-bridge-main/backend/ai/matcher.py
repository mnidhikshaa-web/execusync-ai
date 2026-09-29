import re
from typing import List, Dict, Any

SYNONYMS = {
    "spool": "line", "spools": "line", "pipe": "line", "piping": "line", "erection": "erect", "erected": "erect", "erecting": "erect",
    "installed": "install", "installation": "install", "installing": "install", "mounted": "install", "mounting": "install", "fitted": "install", "setting": "set",
    "concreting": "concrete", "concreted": "concrete", "cast": "concrete", "supports": "support", "trays": "tray", "transmitter": "transmitter",
    "panels": "panel", "calibrated": "calibration", "inspection": "inspect", "inspected": "inspect", "audit": "inspect", "scaffold": "scaffolding",
    "aligned": "alignment", "align": "alignment", "pulling": "pull", "pulled": "pull", "cables": "cable", "detectors": "detector",
}

STOP_WORDS = set([
    "the", "in", "at", "of", "for", "to", "a", "an", "on", "and", "today", "yesterday",
    "started", "start", "completed", "complete", "done", "reached", "progressed", "progressing",
    "about", "approx", "percent", "inch", "area", "unit", "works", "work", "near", "per",
    "is", "was", "this", "morning", "l1", "l2", "l3", "l5", "l6", "piping", "electrical", "civil",
    "mechanical", "instrumentation"
])

def normalize_text_tokens(text: str):
    t = text.lower()
    t = re.sub(r"\bline\s+(\d{1,2})\b(?!\s*(%|percent|inch|\"))", r"line size\1 ", t)
    t = re.sub(r"(\d+)\s*(?:\"|”|inch|in\b)", r" size\1 ", t)
    
    tags = set()
    for m in re.finditer(r"\b([A-Z]{1,3})[- ]?(\d{1,4})\b", text, re.IGNORECASE):
        prefix = m.group(1).upper()
        if prefix in ["PR", "PT", "CV", "HT", "SS", "TR", "AC", "CT", "F", "P", "K", "C", "E", "V", "T", "FI", "MCC"]:
            tags.add(prefix + str(int(m.group(2))))
    
    for m in re.finditer(r"\bunit\s*(\d)\b", text, re.IGNORECASE):
        tags.add("UNIT" + m.group(1))
        
    sizes = set()
    for m in re.finditer(r"size(\d+)", t):
        sizes.add(m.group(1))
        
    suffix = set()
    for m in re.finditer(r'(?:\"|inch)\s*-?\s*([A-Z]{2})\b(?!-?\d)|\b([A-Z])\2\b', text):
        sfx = m.group(1) or (m.group(2) + m.group(2))
        suffix.add(sfx.upper())
        
    words = re.sub(r"[^a-z0-9 ]", " ", t).split()
    filtered_words = [SYNONYMS.get(w, w) for w in words if w not in STOP_WORDS and not re.match(r"^size\d+$", w) and not re.match(r"^\d+$", w) and len(w) > 1]
    
    return {
        "tags": tags,
        "sizes": sizes,
        "suffix": suffix,
        "words": set(filtered_words)
    }

def match_activity_to_schedule(text: str, extraction: Dict[str, Any], activities: List[Any]) -> List[Dict[str, Any]]:
    obs_tokens = normalize_text_tokens(text)
    ext_disc = extraction.get("discipline")
    ext_area = extraction.get("area")
    ext_event = extraction.get("event_type")
    
    scored_candidates = []
    
    for act in activities:
        act_name = act.activity_name if hasattr(act, "activity_name") else act.get("name", "")
        act_id = act.id if hasattr(act, "id") else act.get("id", "")
        act_disc = act.discipline if hasattr(act, "discipline") else act.get("discipline", "")
        act_area = act.area if hasattr(act, "area") else act.get("area", "")
        act_start = act.actual_start if hasattr(act, "actual_start") else act.get("actualStart", None)
        act_finish = act.actual_finish if hasattr(act, "actual_finish") else act.get("actualFinish", None)
        
        act_tokens = normalize_text_tokens(act_name)
        
        score = 0.0
        reasons = []
        ambiguities = []
        breakdown = {}
        
        # 1. Discipline Match (22%)
        if ext_disc and ext_disc == act_disc:
            score += 0.22
            reasons.append(f"Discipline matches: {act_disc}")
            breakdown["discipline"] = 0.22
        else:
            score -= 0.12
            breakdown["discipline"] = -0.12
            
        # 2. Equipment / Tag Match (36%)
        shared_tags = list(obs_tokens["tags"].intersection(act_tokens["tags"]))
        if shared_tags:
            score += 0.36
            reasons.append(f"Equipment / tag reference matches: {', '.join(shared_tags)}")
            breakdown["tag"] = 0.36
            
        # 3. Line Size Match (30%)
        shared_sizes = list(obs_tokens["sizes"].intersection(act_tokens["sizes"]))
        if shared_sizes:
            score += 0.30
            reasons.append(f"Line size matches: {shared_sizes[0]} inch")
            breakdown["size"] = 0.30
        elif obs_tokens["sizes"] and act_tokens["sizes"]:
            score -= 0.20
            breakdown["size"] = -0.20
            
        # 4. Area Match (10%)
        if ext_area and ext_area == act_area:
            score += 0.10
            reasons.append(f"Area matches: {act_area}")
            breakdown["area"] = 0.10
        elif ext_area and ext_area != act_area:
            score -= 0.10
            breakdown["area"] = -0.10
            
        # 5. Semantic Words Similarity (34%)
        shared_words = list(obs_tokens["words"].intersection(act_tokens["words"]))
        if act_tokens["words"]:
            k = len(shared_words) / max(2, min(len(act_tokens["words"]), len(obs_tokens["words"])))
            semantic_score = min(0.34, k * 0.36)
            score += semantic_score
            breakdown["semantic"] = round(semantic_score, 2)
            if shared_words:
                shared_str = ', '.join([f'"{w}"' for w in shared_words])
                reasons.append(f"Semantic similarity on: {shared_str}")
                
        # 6. Suffix / Line Designation
        shared_suffix = list(obs_tokens["suffix"].intersection(act_tokens["suffix"]))
        if shared_suffix:
            score += 0.06
            reasons.append(f"Line designation matches: {shared_suffix[0]}")
        elif act_tokens["suffix"] and score > 0.5:
            ambiguities.append(f"{list(act_tokens['suffix'])[0]} line suffix was not explicitly mentioned.")
            
        # 7. Schedule Context
        if act_finish and ext_event != "END":
            score -= 0.15
            ambiguities.append("Activity is already recorded as complete.")
        elif score > 0.4:
            reasons.append("Schedule context matches (activity open in active execution window)")
            
        if ext_event == "START" and act_start and score > 0.5:
            ambiguities.append("Activity already has an actual start date recorded.")
            
        confidence = max(5.0, min(98.0, round(20.0 + score * 82.0)))
        
        scored_candidates.append({
            "activityId": act_id,
            "confidence": confidence,
            "reasons": reasons,
            "ambiguities": ambiguities,
            "breakdown": breakdown
        })
        
    scored_candidates.sort(key=lambda x: x["confidence"], reverse=True)
    top_candidates = scored_candidates[:3]
    
    if len(top_candidates) > 1 and (top_candidates[0]["confidence"] - top_candidates[1]["confidence"]) < 12 and top_candidates[0]["confidence"] > 60:
        top_candidates[0]["ambiguities"].append(f"Close alternative candidate: {top_candidates[1]['activityId']} ({top_candidates[1]['confidence']}%)")
        
    return top_candidates
