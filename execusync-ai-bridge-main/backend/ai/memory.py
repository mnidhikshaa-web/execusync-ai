import re
from typing import List, Any

def answer_memory_query(query: str, memory_records: List[Any]) -> str:
    l = query.lower()
    
    if re.search(r"highest|worst|most variance|which discipline", l):
        sorted_mem = sorted(memory_records, key=lambda m: (m.actual_avg / m.planned_avg), reverse=True)
        if sorted_mem:
            r = sorted_mem[0]
            causes = r.causes or []
            top_cause = causes[0]["cause"].lower() if causes else "material delays"
            pct = int((r.actual_avg / r.planned_avg - 1) * 100)
            return f"Across {sum(m.occurrences for m in memory_records)} historical work packages, {r.discipline} (\"{r.activity_type}\") shows the highest relative schedule variance: planned {r.planned_avg} d vs actual {r.actual_avg} d (+{pct}%). Leading recorded cause: {top_cause}."
            
    matched_rec = None
    query_words = [w for w in re.split(r"\W+", l) if len(w) > 3]
    
    for m in memory_records:
        if any(w in m.activity_type.lower() for w in query_words) or m.discipline.lower() in l:
            matched_rec = m
            break
            
    if not matched_rec:
        return "No closely matching activity type found in project memory. Try asking about pipe erection, pump installation, foundation concreting, cable pulling, or instrumentation."
        
    variance = matched_rec.actual_avg - matched_rec.planned_avg
    causes_str = ", ".join([f"{c['cause']} ({c['share']}%)" for c in (matched_rec.causes or [])])
    
    if re.search(r"delay|cause|why", l):
        return f"\"{matched_rec.activity_type}\" has {matched_rec.occurrences} recorded occurrences. Leading delay causes: {causes_str}. Average schedule variance is +{variance:.1f} days."
        
    return f"\"{matched_rec.activity_type}\" is typically planned at {matched_rec.planned_avg} days and historically takes {matched_rec.actual_avg} days on average ({matched_rec.occurrences} occurrences, variance +{variance:.1f} d). Primary contractor: {matched_rec.contractor}."
