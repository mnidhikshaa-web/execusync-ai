import datetime
from typing import List, Dict, Any

TODAY = "2026-09-28"

def diff_days(d1_str: str, d2_str: str) -> int:
    try:
        d1 = datetime.datetime.strptime(d1_str, "%Y-%m-%d")
        d2 = datetime.datetime.strptime(d2_str, "%Y-%m-%d")
        return (d1 - d2).days
    except Exception:
        return 0

def add_days(d_str: str, days: int) -> str:
    try:
        d = datetime.datetime.strptime(d_str, "%Y-%m-%d")
        return (d + datetime.timedelta(days=days)).strftime("%Y-%m-%d")
    except Exception:
        return d_str

def compute_project_risks(activities: List[Any], conflicts: List[Any], unmatched: List[Any]) -> List[Dict[str, Any]]:
    signals = []
    
    for a in activities:
        if a.actual_finish or a.progress_percent >= 100.0:
            continue
            
        st = a.status
        act_id = a.id
        planned_start = a.planned_start
        planned_finish = a.planned_finish
        actual_start = a.actual_start
        duration = a.duration
        progress = a.progress_percent
        
        start_slip = diff_days(actual_start, planned_start) if actual_start else diff_days(TODAY, planned_start)
        days_remaining_to_plan = diff_days(planned_finish, TODAY)
        
        related_unmatched = [u for u in unmatched if u.closest == act_id and u.status == "Open"]
        active_conflict = next((c for c in conflicts if c.activity_id == act_id and c.status == "Open"), None)
        has_downstream = any(act_id in (act.dependencies or []) for act in activities)
        
        reasons = []
        severity = "low"
        variance_days = 0
        
        if days_remaining_to_plan < 0:
            severity = "high"
            variance_days = abs(days_remaining_to_plan) + int(duration * ((100.0 - progress) / 100.0))
            reasons.append(f"Activity is past planned finish date ({planned_finish}) with {100.0 - progress:.0f}% progress remaining.")
        elif start_slip > 2:
            severity = "high" if start_slip > 5 else "medium"
            variance_days = start_slip
            reasons.append(f"Actual start slipped by +{start_slip} days against baseline schedule.")
            
        if active_conflict:
            severity = "high"
            reasons.append(f"Active multi-source progress dispute logged on site ({active_conflict.id}).")
            
        if related_unmatched:
            if severity == "low":
                severity = "medium"
            reasons.append(f"{len(related_unmatched)} unrepresented field observation(s) recorded near this work package.")
            
        if has_downstream and (severity in ["high", "medium"]):
            reasons.append("Critical path predecessor: delays will directly cascade to downstream disciplines.")
            
        if reasons:
            rem_days = max(1, int(duration * ((100.0 - progress) / 100.0)))
            est_finish = add_days(TODAY, rem_days)
            signals.append({
                "id": f"RSK-{act_id}",
                "activityId": act_id,
                "activityName": a.activity_name,
                "discipline": a.discipline,
                "area": a.area,
                "severity": severity,
                "varianceDays": max(variance_days, diff_days(est_finish, planned_finish)),
                "forecastFinish": est_finish,
                "plannedFinish": planned_finish,
                "progress": progress,
                "signals": reasons,
                "recommendation": "Expedite resource allocation and verify physical site readiness." if severity == "high" else "Review daily contractor progress reports and coordinate handoff."
            })
            
    prio = {"high": 3, "medium": 2, "low": 1}
    signals.sort(key=lambda s: (prio[s["severity"]], s["varianceDays"]), reverse=True)
    return signals
