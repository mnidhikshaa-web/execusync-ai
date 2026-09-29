# SIH judge demo walkthrough

All displayed project, report, contractor, and historical records are synthetic. No live Oil India data is connected.

1. Start the application with `npm run dev:fullstack` and open the Vite URL.
2. Choose **Project Planner** at demo access. The executive dashboard shows schedule totals, status counts, progress, unmatched observations, and conflicts.
3. Open **Data Ingestion Center**.
4. Under **Judge-friendly demo reports**, load **Daily Progress Report #028**.
5. Select **Process Report** on the newly added report. Deterministic extraction creates events and schedule candidates.
6. Review the event cards. Open **AI Activity Matching** or **AI Extraction** to inspect candidate evidence and parsed fields.
7. Open **Planner Review Center**. Inspect source text, confidence, match factors, and alternatives; choose an activity if needed.
8. Select **Approve Match** for a high-confidence event. Approvals update actual progress and write an audit record. The baseline dates are preserved.
9. Return to **L5/L6 Schedule Explorer** and open the activity to inspect planned and actual dates/progress.
10. Return to the dashboard to see recalculated totals and progress.
11. Open **Audit Trail** and inspect timestamp, reviewer, source, activity, and old/new values.
12. Open **Missing Activity Detector** to route, ignore, link, or mark a synthetic unmatched observation as a new activity. The system does not auto-create scope.
13. Open **Data Conflicts** to compare contradictory source records and record a reviewed progress resolution.
14. Open **Cross-Discipline Intelligence** for potential dependency impacts that require coordination review.
15. Open **Project Memory** and query historical synthetic records, for example “What caused previous piping delays?”
16. Open **Early Warning Radar** and inspect the evidence behind schedule-risk signals.
17. Open **Time Agent** and enter: `Piping line 24 inch erection started at 9:30 AM Area A`.
18. Inspect parsed event, suggested activity, confidence, and evidence. Select the correct candidate if needed, then choose **Confirm update**. High-confidence entries update actuals; lower-confidence entries enter planner review.
19. Reopen the schedule and dashboard to verify the change.

## Supported input limits

The upload control accepts `.csv` and `.txt` files up to 5 MB. XLSX/PDF/OCR and microphone transcription are not implemented. The preloaded synthetic report cards are deterministic demonstration fixtures, not uploaded PDFs/XLSX files.
