import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, Chip, Mono, Bar, StatusChip } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { PROJECT, CONTRACTORS, DISCIPLINES, AREAS, UNITS } from "@/lib/data";
import { fmt, TODAY } from "@/lib/dates";
import { statusOf } from "@/lib/derive";
import {
  ChevronDown,
  ChevronRight,
  FolderKanban,
  HardHat,
  Layers,
  Lock,
  Milestone,
  ShieldCheck,
  Building2,
} from "lucide-react";

export const Route = createFileRoute("/_console/project")({
  head: () => ({
    meta: [
      { title: "Project Overview — EXECUSYNC AI" },
      { name: "description", content: "Synthetic demonstration project structure, WBS hierarchy, and contract packages for Oil India Limited." },
    ],
  }),
  component: ProjectOverview,
});

function ProjectOverview() {
  const { activities, openActivity } = useStore();
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({
    "Area A": true,
    "Area B": false,
    "Area C": false,
  });

  const toggleUnit = (area: string) => {
    setExpandedUnits((prev) => ({ ...prev, [area]: !prev[area] }));
  };

  const milestones = [
    { name: "Site Civil Works & Grading", date: "2026-03-31", status: "Completed", actual: "2026-03-28" },
    { name: "Pipe Rack PR-1 Structural Handover", date: "2026-08-30", status: "Completed", actual: "2026-09-02" },
    { name: "Crude Column C-101 Internals Erection", date: "2026-10-15", status: "In Progress", actual: null },
    { name: "Substation SS-2 Power Energization", date: "2026-11-30", status: "Not Started", actual: null },
    { name: "Hydrotreater Loop Hydrotesting", date: "2027-01-15", status: "Not Started", actual: null },
    { name: "Integrated Plant Pre-Commissioning", date: "2027-06-30", status: "Not Started", actual: null },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Project Governance"
        title="Project Overview & WBS Structure"
        description="Refinery Expansion & Utilities Project (OIL-REF-2026-01) — Oil India Limited"
      />

      {/* Baseline Protection Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-success/10 p-2 text-success">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">Active Schedule Baseline: {PROJECT.baseline}</span>
              <Chip tone="success">Locked</Chip>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Planned start/finish dates are immutable reference baselines. Site execution updates only affect actuals and forecasts.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div>Start: <Mono className="text-foreground">{PROJECT.start}</Mono></div>
          <div>Target: <Mono className="text-foreground">{PROJECT.finish}</Mono></div>
        </div>
      </div>

      {/* Project Metadata Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-border bg-card p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Building2 className="h-4 w-4 text-primary" /> Client Organization
          </div>
          <div className="mt-1 text-sm font-bold text-foreground">{PROJECT.client}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{PROJECT.location}</div>
        </div>

        <div className="rounded-md border border-border bg-card p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Layers className="h-4 w-4 text-info" /> Total L5/L6 Scope
          </div>
          <div className="mt-1 text-sm font-bold text-foreground">{activities.length} Work Packages</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">7 Engineering Disciplines</div>
        </div>

        <div className="rounded-md border border-border bg-card p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <HardHat className="h-4 w-4 text-warning" /> Executing Contractors
          </div>
          <div className="mt-1 text-sm font-bold text-foreground">{Object.keys(CONTRACTORS).length} Specialized Firms</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">EPC & Field Packages</div>
        </div>

        <div className="rounded-md border border-border bg-card p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" /> Integrity Mode
          </div>
          <div className="mt-1 text-sm font-bold text-foreground">Dual Actual/Planned Layer</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">100% Audit Trail Traceability</div>
        </div>
      </div>

      {/* WBS Hierarchy Explorer */}
      <Panel title="Work Breakdown Structure (WBS) Explorer" icon={FolderKanban}>
        <p className="mb-4 text-xs text-muted-foreground">
          Browse through the multi-level hierarchy: L1 Project → L2 Unit → L3 Process Area → L4 Discipline → L5/L6 Activities. Click any activity to inspect details.
        </p>

        <div className="space-y-3">
          {Object.entries(AREAS).map(([areaKey, areaDesc]) => {
            const areaActivities = activities.filter((a) => a.area === areaKey);
            const isExpanded = expandedUnits[areaKey];
            const completedCount = areaActivities.filter((a) => a.progress === 100).length;
            const avgProg = Math.round(
              areaActivities.reduce((s, a) => s + a.progress, 0) / Math.max(1, areaActivities.length),
            );

            return (
              <div key={areaKey} className="overflow-hidden rounded-md border border-border">
                {/* Unit Header */}
                <button
                  onClick={() => toggleUnit(areaKey)}
                  className="flex w-full items-center justify-between bg-secondary/40 px-4 py-3 text-left transition hover:bg-secondary/70"
                >
                  <div className="flex items-center gap-2.5">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{UNITS[areaKey]}</span>
                        <Mono className="text-[11px] text-primary">{areaKey}</Mono>
                      </div>
                      <div className="text-[11px] text-muted-foreground">{areaDesc}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="hidden text-right sm:block">
                      <span className="text-foreground font-medium">{completedCount}/{areaActivities.length}</span> activities complete
                    </div>
                    <div className="w-24">
                      <div className="mb-0.5 text-right font-mono text-[10px]">{avgProg}%</div>
                      <Bar value={avgProg} tone="info" />
                    </div>
                  </div>
                </button>

                {/* Sub-activities */}
                {isExpanded && (
                  <div className="divide-y divide-border border-t border-border bg-card/50">
                    {areaActivities.map((act) => {
                      const st = statusOf(act);
                      return (
                        <div
                          key={act.id}
                          onClick={() => openActivity(act.id)}
                          className="flex cursor-pointer items-center justify-between px-6 py-2.5 text-xs transition hover:bg-accent/40"
                        >
                          <div className="flex items-center gap-3">
                            <Mono className="text-primary font-medium">{act.id}</Mono>
                            <Chip>{act.level}</Chip>
                            <span className="font-medium text-foreground">{act.name}</span>
                            <span className="hidden text-muted-foreground md:inline">({act.discipline})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusChip status={st} />
                            <span className="font-mono text-[11px]">{act.progress}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Contract Packages & Milestone Tracking */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Contractor Packages */}
        <Panel title="Contractor Package Allocations" icon={HardHat}>
          <div className="space-y-3">
            {DISCIPLINES.map((disc) => {
              const acts = activities.filter((a) => a.discipline === disc);
              const contractor = CONTRACTORS[disc];
              return (
                <div key={disc} className="flex items-center justify-between rounded-sm border border-border p-2.5 text-xs">
                  <div>
                    <div className="font-semibold text-foreground">{contractor}</div>
                    <div className="text-[11px] text-muted-foreground">{disc} Package · {acts.length} work items</div>
                  </div>
                  <div className="text-right">
                    <Mono className="text-primary font-medium">{acts.filter((a) => a.progress === 100).length}/{acts.length} Done</Mono>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Key Project Milestones */}
        <Panel title="Key Project Milestones" icon={Milestone}>
          <div className="space-y-2.5">
            {milestones.map((m) => (
              <div key={m.name} className="flex items-center justify-between rounded-sm border border-border p-2.5 text-xs">
                <div>
                  <div className="font-semibold text-foreground">{m.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Target Date: <Mono>{m.date}</Mono>
                    {m.actual && <span className="text-success ml-2">Achieved: <Mono>{m.actual}</Mono></span>}
                  </div>
                </div>
                <StatusChip status={m.status as any} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
