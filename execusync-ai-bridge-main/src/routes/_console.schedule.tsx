import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  PageHeader,
  Panel,
  Chip,
  StatusChip,
  VerifyBadge,
  ConfidenceBadge,
  Bar,
  Mono,
} from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { DISCIPLINES, AREAS } from "@/lib/data";
import { fmt, TODAY } from "@/lib/dates";
import { statusOf, startVariance, forecastVariance } from "@/lib/derive";
import type { Activity, Discipline } from "@/lib/types";
import {
  Download,
  Filter,
  ListTree,
  Plus,
  Search,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_console/schedule")({
  head: () => ({
    meta: [
      { title: "L5/L6 Schedule Explorer — EXECUSYNC AI" },
      { name: "description", content: "Explore, filter, and inspect baseline vs actual progress for L5/L6 activities." },
    ],
  }),
  component: ScheduleExplorer,
});

function ScheduleExplorer() {
  const { activities, openActivity, addUploadedFile } = useStore();
  const [search, setSearch] = useState("");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("All");
  const [selectedArea, setSelectedArea] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedLevel, setSelectedLevel] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"plannedStart" | "progress" | "variance" | "id">("plannedStart");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Filter & Sort Logic
  const filteredActivities = useMemo(() => {
    return activities
      .filter((a) => {
        const st = statusOf(a);
        const matchesSearch =
          search === "" ||
          a.id.toLowerCase().includes(search.toLowerCase()) ||
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.wbs.toLowerCase().includes(search.toLowerCase()) ||
          a.contractor.toLowerCase().includes(search.toLowerCase());

        const matchesDisc = selectedDiscipline === "All" || a.discipline === selectedDiscipline;
        const matchesArea = selectedArea === "All" || a.area === selectedArea;
        const matchesStatus = selectedStatus === "All" || st === selectedStatus;
        const matchesLevel = selectedLevel === "All" || a.level === selectedLevel;

        return matchesSearch && matchesDisc && matchesArea && matchesStatus && matchesLevel;
      })
      .sort((a, b) => {
        if (sortBy === "progress") return b.progress - a.progress;
        if (sortBy === "id") return a.id.localeCompare(b.id);
        if (sortBy === "variance") {
          const varA = startVariance(a) ?? 0;
          const varB = startVariance(b) ?? 0;
          return varB - varA;
        }
        return a.plannedStart.localeCompare(b.plannedStart);
      });
  }, [activities, search, selectedDiscipline, selectedArea, selectedStatus, selectedLevel, sortBy]);

  const handleExportCSV = () => {
    const headers = "Activity ID,Level,WBS,Activity Name,Discipline,Area,Planned Start,Planned Finish,Duration (days),Actual Start,Actual Finish,Progress (%),Status,Contractor\n";
    const rows = filteredActivities
      .map((a) =>
        [
          a.id,
          a.level,
          a.wbs,
          `"${a.name}"`,
          a.discipline,
          a.area,
          a.plannedStart,
          a.plannedFinish,
          a.duration,
          a.actualStart || "—",
          a.actualFinish || "—",
          a.progress,
          statusOf(a),
          `"${a.contractor}"`,
        ].join(","),
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ExecuSync_L5_L6_Schedule_${TODAY}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Schedule Intelligence"
        title="L5/L6 Schedule Explorer"
        description="Structured activity schedule linked directly to site daily execution records."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent"
            >
              <Download className="h-3.5 w-3.5" /> Export Schedule CSV
            </button>
            <button
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Upload className="h-3.5 w-3.5" /> Import Schedule (CSV/XLSX)
            </button>
          </div>
        }
      />

      {/* Search & Filter Bar */}
      <div className="space-y-3 rounded-md border border-border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by Activity ID, Name, WBS code, or Contractor..."
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

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Sort by:
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-sm border border-border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
            >
              <option value="plannedStart">Planned Start Date</option>
              <option value="progress">Actual Progress %</option>
              <option value="variance">Start Variance (Slip)</option>
              <option value="id">Activity ID</option>
            </select>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1 font-semibold text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Discipline:
          </div>
          {["All", ...DISCIPLINES].map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDiscipline(d)}
              className={`rounded-sm px-2.5 py-1 text-xs transition ${
                selectedDiscipline === d ? "bg-primary text-primary-foreground font-semibold" : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Area:</span>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="rounded-sm border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="All">All Areas</option>
              {Object.keys(AREAS).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-sm border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Delayed">Delayed</option>
              <option value="Not Started">Not Started</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Level:</span>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="rounded-sm border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="All">All Levels</option>
              <option value="L5">L5</option>
              <option value="L6">L6</option>
            </select>
          </div>

          <div className="ml-auto text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredActivities.length}</span> of {activities.length} activities
          </div>
        </div>
      </div>

      {/* Schedule Table */}
      <Panel title="L5/L6 Activity Master Table" icon={ListTree} bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Activity ID / WBS</th>
                <th className="px-4 py-3">Activity Name</th>
                <th className="px-3 py-3">Discipline & Area</th>
                <th className="px-3 py-3">Baseline Dates</th>
                <th className="px-3 py-3">Actual Dates</th>
                <th className="px-4 py-3">Actual Progress</th>
                <th className="px-3 py-3">Variance</th>
                <th className="px-3 py-3">AI Confidence</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    No activities match your current search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredActivities.map((a) => {
                  const st = statusOf(a);
                  const sv = startVariance(a);
                  const fv = forecastVariance(a);
                  return (
                    <tr
                      key={a.id}
                      onClick={() => openActivity(a.id)}
                      className="cursor-pointer transition hover:bg-accent/40"
                    >
                      <td className="px-4 py-3 font-mono">
                        <div className="font-semibold text-primary">{a.id}</div>
                        <div className="text-[10px] text-muted-foreground">{a.wbs}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{a.name}</div>
                        <div className="text-[11px] text-muted-foreground">{a.contractor}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div>{a.discipline}</div>
                        <div className="text-[11px] text-muted-foreground">{a.area}</div>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px]">
                        <div>{fmt(a.plannedStart)}</div>
                        <div className="text-muted-foreground">→ {fmt(a.plannedFinish)} ({a.duration}d)</div>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px]">
                        {a.actualStart ? (
                          <div>
                            <span className="text-foreground">{fmt(a.actualStart)}</span>
                            <div className="text-muted-foreground">
                              {a.actualFinish ? `→ ${fmt(a.actualFinish)}` : "→ In progress"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 w-32">
                        <div className="mb-1 flex justify-between font-mono text-[11px]">
                          <span>{a.progress}%</span>
                        </div>
                        <Bar value={a.progress} tone={st === "Delayed" ? "danger" : st === "Completed" ? "success" : "info"} />
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px]">
                        {sv !== null ? (
                          <span className={sv > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                            {sv > 0 ? `+${sv} d` : `${sv} d`}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <ConfidenceBadge value={a.aiConfidence} showBand={false} />
                      </td>
                      <td className="px-3 py-3">
                        <StatusChip status={st} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openActivity(a.id);
                          }}
                          className="rounded-sm border border-border px-2 py-1 text-[11px] text-primary hover:border-primary hover:bg-accent"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Schedule Import Prototype Modal */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Schedule Baseline (CSV / XLSX)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <p className="text-muted-foreground">
              Upload a schedule extract containing Activity ID, WBS, Name, Discipline, Area, Planned Start, Planned Finish, and Duration.
            </p>
            <div className="rounded-md border border-dashed border-border p-6 text-center">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <div className="mt-2 font-medium">Select schedule CSV / XLSX file</div>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await addUploadedFile(file);
                    setIsImportOpen(false);
                  }
                }}
                className="mt-3 text-xs"
              />
            </div>
            <div className="rounded bg-muted/50 p-2.5 font-mono text-[11px] text-muted-foreground">
              Supported Columns: Activity ID, Activity Name, WBS, Discipline, Area, Planned Start, Planned Finish, Duration, Contractor
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
