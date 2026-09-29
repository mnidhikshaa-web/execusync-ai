import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader,
  Panel,
  Chip,
  ConfidenceBadge,
  EventChip,
  Mono,
} from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { extract, type Extraction } from "@/lib/ai-service";
import { DISCIPLINES } from "@/lib/data";
import { fmt, TODAY } from "@/lib/dates";
import {
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  FileSearch,
  MapPin,
  Percent,
  Sparkles,
  Tag,
  Wrench,
} from "lucide-react";

export const Route = createFileRoute("/_console/extraction")({
  head: () => ({
    meta: [
      { title: "AI Extraction Laboratory — EXECUSYNC AI" },
      { name: "description", content: "NLP & entity extraction engine for unstructured site observations." },
    ],
  }),
  component: ExtractionLaboratory,
});

const SAMPLES = [
  '24 inch spool erection started in Area A today at 09:30.',
  'Foundation F102 concreting completed yesterday.',
  'Pressure transmitter PT-2401 mounted, 50% complete.',
  'Cable tray Unit 2 installation reached 80 percent in Area A.',
  'Pump P-103 coupling alignment reached 50 percent in Area B.',
  'Temporary bypass pipe installed near P-101 suction.',
];

function ExtractionLaboratory() {
  const { events } = useStore();
  const [inputText, setInputText] = useState(SAMPLES[0]);
  const [currentExtraction, setCurrentExtraction] = useState<Extraction>(() => extract(SAMPLES[0], TODAY));

  const handleExtract = (text: string) => {
    setInputText(text);
    setCurrentExtraction(extract(text, TODAY));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="NLP & Entity Parsing"
        title="AI Extraction Laboratory"
        description="Inspect how the AI extraction engine parses unstructured text into structured activity event objects."
      />

      {/* Interactive Extraction Sandbox */}
      <Panel title="Interactive NLP Entity Extraction Playground" icon={Cpu}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground">
              Site Observation Raw Text:
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => handleExtract(e.target.value)}
                placeholder="Type or paste any unstructured site report sentence..."
                className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
              />
              <button
                onClick={() => handleExtract(inputText)}
                className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Sparkles className="h-3.5 w-3.5" /> Parse Entities
              </button>
            </div>

            {/* Sample Chips */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">Try samples:</span>
              {SAMPLES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleExtract(s)}
                  className="rounded-sm border border-border bg-muted/30 px-2 py-0.5 text-[11px] hover:border-primary hover:bg-accent"
                >
                  "{s.slice(0, 32)}..."
                </button>
              ))}
            </div>
          </div>

          {/* Structured Output Grid */}
          <div className="mt-4 rounded-md border border-border bg-secondary/20 p-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
                  Extracted Event Schema
                </span>
                <EventChip e={currentExtraction.event} />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Extraction Confidence:</span>
                <ConfidenceBadge value={currentExtraction.confidence} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 text-xs">
              <div className="rounded-sm border border-border bg-card p-2.5">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Wrench className="h-3 w-3" /> Discipline
                </div>
                <div className="mt-1 font-semibold text-foreground">
                  {currentExtraction.discipline || <span className="text-muted-foreground">—</span>}
                </div>
              </div>

              <div className="rounded-sm border border-border bg-card p-2.5">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <MapPin className="h-3 w-3" /> Area
                </div>
                <div className="mt-1 font-semibold text-foreground">
                  {currentExtraction.area || <span className="text-muted-foreground">—</span>}
                </div>
              </div>

              <div className="rounded-sm border border-border bg-card p-2.5">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Tag className="h-3 w-3" /> Event Type
                </div>
                <div className="mt-1 font-semibold text-foreground">{currentExtraction.event}</div>
              </div>

              <div className="rounded-sm border border-border bg-card p-2.5">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Percent className="h-3 w-3" /> Progress
                </div>
                <div className="mt-1 font-semibold text-foreground font-mono">
                  {currentExtraction.progress !== null ? `${currentExtraction.progress}%` : "—"}
                </div>
              </div>

              <div className="rounded-sm border border-border bg-card p-2.5">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3 w-3" /> Time
                </div>
                <div className="mt-1 font-semibold text-foreground font-mono">
                  {currentExtraction.time || <span className="text-muted-foreground">—</span>}
                </div>
              </div>

              <div className="rounded-sm border border-border bg-card p-2.5">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Calendar className="h-3 w-3" /> Event Date
                </div>
                <div className="mt-1 font-semibold text-foreground font-mono">
                  {fmt(currentExtraction.date)}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-sm border border-border bg-card p-3 text-xs">
              <span className="text-muted-foreground">Normalized Activity Description: </span>
              <span className="font-semibold text-foreground">{currentExtraction.description}</span>
            </div>
          </div>
        </div>
      </Panel>

      {/* Extracted Events Live Register */}
      <Panel title="Extracted Site Events Register" icon={FileSearch} bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Event ID</th>
                <th className="px-4 py-3">Source Observation</th>
                <th className="px-3 py-3">Discipline</th>
                <th className="px-3 py-3">Area</th>
                <th className="px-3 py-3">Event</th>
                <th className="px-3 py-3">Progress</th>
                <th className="px-3 py-3">Confidence</th>
                <th className="px-3 py-3">Top Matched Candidate</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.map((e) => {
                const topCandidate = e.candidates[0];
                return (
                  <tr key={e.id} className="transition hover:bg-accent/40">
                    <td className="px-4 py-3 font-mono text-primary font-semibold">
                      {e.id}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate">
                      <div className="font-medium text-foreground">{e.text}</div>
                      <div className="text-[10px] text-muted-foreground">{e.source}</div>
                    </td>
                    <td className="px-3 py-3">
                      {e.discipline || "—"}
                    </td>
                    <td className="px-3 py-3">
                      {e.area || "—"}
                    </td>
                    <td className="px-3 py-3">
                      <EventChip e={e.event} />
                    </td>
                    <td className="px-3 py-3 font-mono">
                      {e.progress !== null ? `${e.progress}%` : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <ConfidenceBadge value={e.extractionConfidence} showBand={false} />
                    </td>
                    <td className="px-3 py-3 font-mono">
                      {topCandidate ? (
                        <div>
                          <span className="font-semibold text-primary">{topCandidate.activityId}</span>
                          <span className="ml-1.5 text-[10px] text-muted-foreground">({topCandidate.confidence}%)</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Chip
                        tone={
                          e.status === "approved"
                            ? "success"
                            : e.status === "rejected"
                              ? "danger"
                              : e.status === "unmatched"
                                ? "warning"
                                : "info"
                        }
                      >
                        {e.status}
                      </Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
