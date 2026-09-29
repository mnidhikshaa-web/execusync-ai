import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader,
  Panel,
  Chip,
  Mono,
  Bar,
} from "@/components/ui-kit";
import { MEMORY } from "@/lib/data";
import { answerMemory } from "@/lib/ai-service";
import {
  Brain,
  Building,
  Clock,
  HelpCircle,
  History,
  Layers,
  Search,
  Sparkles,
  TrendingDown,
  Wrench,
} from "lucide-react";

export const Route = createFileRoute("/_console/memory")({
  head: () => ({
    meta: [
      { title: "Project Memory — EXECUSYNC AI" },
      { name: "description", content: "Historical execution memory repository and natural-language query interface." },
    ],
  }),
  component: ProjectMemory,
});

const SUGGESTED_QUERIES = [
  "What usually delays pipe erection?",
  "Average actual duration of equipment installation?",
  "Which discipline has the highest schedule variance?",
  "Why are pump installations delayed?",
  "Historical duration for cable tray pulling?",
];

function ProjectMemory() {
  const [query, setQuery] = useState(SUGGESTED_QUERIES[0]);
  const [answer, setAnswer] = useState(() => answerMemory(SUGGESTED_QUERIES[0], MEMORY));
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("All");

  const handleSearch = (q: string) => {
    setQuery(q);
    setAnswer(answerMemory(q, MEMORY));
  };

  const filteredMemory = MEMORY.filter((m) => {
    if (selectedDiscipline === "All") return true;
    return m.discipline === selectedDiscipline;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Institutional Knowledge"
        title="Project Memory & Historical Benchmarks"
        description="Query past project execution actuals, historical duration variances, and leading delay causes across completed refinery and petrochemical projects."
      />

      {/* Query Search Engine */}
      <Panel title="Natural Language Historical Execution Query" icon={Brain}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
                placeholder="Ask project memory (e.g. 'What usually delays pipe erection?')"
                className="w-full rounded-sm border border-border bg-background py-2 pl-9 pr-3 text-xs focus:border-primary focus:outline-none"
              />
            </div>
            <button
              onClick={() => handleSearch(query)}
              className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Sparkles className="h-3.5 w-3.5" /> Query Memory
            </button>
          </div>

          {/* Quick Questions */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Suggested queries:</span>
            {SUGGESTED_QUERIES.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSearch(q)}
                className="rounded-sm border border-border bg-secondary/30 px-2 py-0.5 text-[11px] hover:border-primary hover:bg-accent"
              >
                "{q}"
              </button>
            ))}
          </div>

          {/* AI Memory Answer Card */}
          {answer && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-xs">
              <div className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles className="h-4 w-4" /> Synthesized Historical Response:
              </div>
              <p className="mt-2 text-foreground leading-relaxed font-medium">
                {answer}
              </p>
              <div className="mt-3 text-[10px] text-muted-foreground">
                Source: Synthetic historical database (185 aggregated work packages across NRL Expansion, Duliajan GCS Revamp, and Bongaigaon CDU).
              </div>
            </div>
          )}
        </div>
      </Panel>

      {/* Historical Discipline Benchmarks */}
      <Panel title="Historical Activity Duration & Variance Repository" icon={History}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMemory.map((rec) => {
            const variance = rec.actualAvg - rec.plannedAvg;
            const variancePct = Math.round((variance / rec.plannedAvg) * 100);

            return (
              <div
                key={rec.activityType}
                className="flex flex-col justify-between rounded-md border border-border bg-card p-4 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase text-primary font-bold">{rec.discipline}</span>
                    <Chip tone={variancePct > 20 ? "danger" : "warning"}>
                      +{variancePct}% avg slip
                    </Chip>
                  </div>
                  <h3 className="mt-1 font-display text-sm font-bold text-foreground">{rec.activityType}</h3>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Based on {rec.occurrences} recorded historical occurrences
                  </div>

                  {/* Planned vs Actual Duration */}
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded border border-border bg-muted/20 p-2 text-center font-mono">
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Planned Avg</div>
                      <div className="text-sm font-bold text-foreground">{rec.plannedAvg} days</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Actual Avg</div>
                      <div className="text-sm font-bold text-destructive">{rec.actualAvg} days</div>
                    </div>
                  </div>

                  {/* Top Delay Causes */}
                  <div className="mt-3 space-y-1.5">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Leading Delay Causes:
                    </div>
                    {rec.causes.map((c) => (
                      <div key={c.cause} className="space-y-0.5">
                        <div className="flex justify-between text-[11px]">
                          <span>{c.cause}</span>
                          <span className="font-mono">{c.share}%</span>
                        </div>
                        <Bar value={c.share} tone="warning" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reference Projects */}
                <div className="mt-4 pt-3 border-t border-border text-[10px] text-muted-foreground">
                  <div>Top Contractor: <strong>{rec.contractor}</strong></div>
                  <div className="truncate mt-0.5">Projects: {rec.previousProjects.join(", ")}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
