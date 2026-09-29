import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  PageHeader,
  Panel,
  Chip,
  ConfidenceBadge,
  Mono,
} from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { TODAY } from "@/lib/dates";
import {
  Clock,
  Download,
  Filter,
  History,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

export const Route = createFileRoute("/_console/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail — EXECUSYNC AI" },
      { name: "description", content: "Complete immutable audit log of all schedule updates, AI matches, and planner approvals." },
    ],
  }),
  component: AuditTrailLog,
});

function AuditTrailLog() {
  const { audit, openActivity } = useStore();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("All");

  const filteredLogs = useMemo(() => {
    return audit.filter((log) => {
      const matchesSearch =
        search === "" ||
        log.activityId.toLowerCase().includes(search.toLowerCase()) ||
        log.source.toLowerCase().includes(search.toLowerCase()) ||
        log.sourceText.toLowerCase().includes(search.toLowerCase()) ||
        log.reviewer.toLowerCase().includes(search.toLowerCase()) ||
        log.field.toLowerCase().includes(search.toLowerCase());

      const matchesAction = actionFilter === "All" || log.status === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [audit, search, actionFilter]);

  const handleExportCSV = () => {
    const headers = "Audit ID,Timestamp,Reviewer,Activity ID,Action,Field,Previous Value,New Value,Source Document,Observation Text,AI Confidence\n";
    const rows = filteredLogs
      .map((l) =>
        [
          l.id,
          `"${l.timestamp}"`,
          `"${l.reviewer}"`,
          l.activityId,
          l.status,
          `"${l.field}"`,
          `"${l.previous}"`,
          `"${l.next}"`,
          `"${l.source}"`,
          `"${l.sourceText.replace(/"/g, '""')}"`,
          l.confidence || "—",
        ].join(","),
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ExecuSync_Audit_Trail_${TODAY}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance & Compliance"
        title="Schedule Execution Audit Trail"
        description="Immutable governance log recording every AI match suggestion, human planner verification, supervisor submission, conflict resolution, and schedule baseline update."
        actions={
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent"
          >
            <Download className="h-3.5 w-3.5" /> Export Audit Log CSV
          </button>
        }
      />

      {/* Search & Filter Bar */}
      <div className="space-y-3 rounded-md border border-border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search audit trail by Activity ID, Reviewer, Source, or Field..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-sm border border-border bg-background py-2 pl-9 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Action Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1 font-semibold text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Filter Action:
          </div>
          {["All", "Approved", "Rejected", "Flagged", "Created", "Resolved", "Dismissed"].map((st) => (
            <button
              key={st}
              onClick={() => setActionFilter(st)}
              className={`rounded-sm px-2.5 py-1 text-xs transition ${
                actionFilter === st ? "bg-primary text-primary-foreground font-semibold" : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {st} ({audit.filter((l) => (st === "All" ? true : l.status === st)).length})
            </button>
          ))}
        </div>
      </div>

      {/* Audit Logs Table */}
      <Panel title="Audit Records Register" icon={History} bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Timestamp / Log ID</th>
                <th className="px-3 py-3">Reviewer / Actor</th>
                <th className="px-3 py-3">Activity ID</th>
                <th className="px-3 py-3">Action</th>
                <th className="px-4 py-3">Schedule Mutation</th>
                <th className="px-4 py-3">Source & Observation</th>
                <th className="px-3 py-3">AI Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No audit records match your query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="transition hover:bg-accent/40">
                      <td className="px-4 py-3 font-mono">
                        <div className="font-semibold text-primary">{log.id}</div>
                        <div className="text-[10px] text-muted-foreground">{log.timestamp}</div>
                      </td>
                      <td className="px-3 py-3 font-medium text-foreground">
                        {log.reviewer}
                      </td>
                      <td className="px-3 py-3 font-mono font-bold">
                        {log.activityId !== "—" ? (
                          <button
                            onClick={() => openActivity(log.activityId)}
                            className="text-primary hover:underline"
                          >
                            {log.activityId}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Chip
                          tone={
                            log.status === "Approved"
                              ? "success"
                              : log.status === "Rejected"
                                ? "danger"
                                : log.status === "Created"
                                  ? "info"
                                  : log.status === "Resolved"
                                    ? "success"
                                    : "warning"
                          }
                        >
                          {log.status}
                        </Chip>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[11px] text-muted-foreground">{log.field}</div>
                        <div className="font-mono text-xs">
                          <span className="line-through text-muted-foreground mr-1.5">{log.previous}</span>
                          → <span className="font-semibold text-success">{log.next}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="truncate text-foreground font-medium">"{log.sourceText}"</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{log.source}</div>
                      </td>
                      <td className="px-3 py-3">
                        <ConfidenceBadge value={log.confidence} showBand={false} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
