import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader,
  Panel,
  Chip,
  ConfidenceBadge,
  ConfidenceRing,
  Mono,
} from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { extract, match, norm, type Extraction } from "@/lib/ai-service";
import { TODAY } from "@/lib/dates";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  GitMerge,
  HelpCircle,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/_console/matching")({
  head: () => ({
    meta: [
      { title: "AI Activity Matching Engine — EXECUSYNC AI" },
      { name: "description", content: "Deterministic multi-factor L5/L6 schedule matching with transparent explainability." },
    ],
  }),
  component: ActivityMatchingEngine,
});

const DEMO_CASES = [
  '24 inch spool erection started in Area A today at 09:30.',
  'Foundation F102 concreting completed yesterday.',
  'Pipe supports for rack PR-1 installed about 75 percent.',
  'Cable tray Unit 2 installation reached 80 percent.',
  'Pressure transmitter PT-2401 mounted, 50% complete.',
  'Compressor K-201 alignment works resumed, 30% done.',
  'Temporary bypass pipe installed near P-101 suction.',
];

function ActivityMatchingEngine() {
  const { activities, openActivity } = useStore();
  const [inputText, setInputText] = useState(DEMO_CASES[0]);

  const extraction = extract(inputText, TODAY);
  const candidates = match(inputText, extraction, activities);
  const topCandidate = candidates[0];
  const matchedAct = topCandidate ? activities.find((a) => a.id === topCandidate.activityId) : undefined;

  const normalizedTokens = norm(inputText);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Core Intelligence Engine"
        title="AI Activity Matching & Explainability"
        description="Deterministic multi-factor L5/L6 schedule linking engine with transparent explainability factors and confidence score calculation."
      />

      {/* Interactive Matching Sandbox */}
      <Panel title="L5/L6 Schedule Matching Playground" icon={GitMerge}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground">
              Site Observation Query:
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter site observation..."
                className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
              />
            </div>

            {/* Demo Presets */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">Try demo cases:</span>
              {DEMO_CASES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInputText(s)}
                  className={`rounded-sm border px-2 py-0.5 text-[11px] transition ${
                    inputText === s ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border bg-muted/30 hover:border-primary hover:bg-accent"
                  }`}
                >
                  "{s.slice(0, 32)}..."
                </button>
              ))}
            </div>
          </div>

          {/* Side-by-Side Matching Output */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: Top Matched Activity Card */}
            <div className="rounded-md border border-border bg-secondary/20 p-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-primary">
                    Top Ranked L5/L6 Activity
                  </span>
                  {matchedAct && <Chip>{matchedAct.level}</Chip>}
                </div>
                {topCandidate && <ConfidenceBadge value={topCandidate.confidence} />}
              </div>

              {matchedAct && topCandidate ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="font-mono text-sm font-bold text-primary">{matchedAct.id}</div>
                    <div className="text-sm font-semibold text-foreground">{matchedAct.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground font-mono">{matchedAct.wbs}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border border-border bg-card p-2">
                      <span className="text-muted-foreground text-[10px] uppercase">Discipline / Area</span>
                      <div className="font-semibold text-foreground">{matchedAct.discipline} · {matchedAct.area}</div>
                    </div>
                    <div className="rounded border border-border bg-card p-2">
                      <span className="text-muted-foreground text-[10px] uppercase">Contractor</span>
                      <div className="font-semibold text-foreground truncate">{matchedAct.contractor}</div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => openActivity(matchedAct.id)}
                      className="w-full rounded-sm bg-primary/10 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                    >
                      Inspect Activity Baseline & History →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No matching schedule activity detected above minimum threshold.
                </div>
              )}
            </div>

            {/* Right: Transparent Explainability Factors */}
            <div className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
                  Explainability Factors & Signals
                </span>
                <span className="text-[11px] text-muted-foreground">Deterministic Factors</span>
              </div>

              {topCandidate ? (
                <div className="mt-4 space-y-3 text-xs">
                  {/* Positive Reasons */}
                  <div>
                    <div className="mb-1.5 flex items-center gap-1 font-semibold text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Positive Matching Factors:
                    </div>
                    <ul className="space-y-1 pl-4">
                      {topCandidate.reasons.map((r, i) => (
                        <li key={i} className="list-disc text-muted-foreground">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Ambiguities / Warnings */}
                  {topCandidate.ambiguities.length > 0 && (
                    <div className="rounded-sm border border-warning/30 bg-warning/5 p-2.5">
                      <div className="mb-1 flex items-center gap-1 font-semibold text-warning">
                        <AlertTriangle className="h-3.5 w-3.5" /> Ambiguity Signals & Warnings:
                      </div>
                      <ul className="space-y-0.5 pl-4 text-[11px] text-muted-foreground">
                        {topCandidate.ambiguities.map((a, i) => (
                          <li key={i} className="list-disc">
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Normalized Tokens */}
                  <div className="border-t border-border pt-2 text-[11px] text-muted-foreground">
                    <span className="font-mono text-foreground font-semibold">Normalized Tokens: </span>
                    <span>
                      Tags: {[...normalizedTokens.tags].join(", ") || "none"} | Sizes: {[...normalizedTokens.sizes].join(", ") || "none"} | Words: {[...normalizedTokens.words].join(", ")}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">No candidate explanation available.</div>
              )}
            </div>
          </div>

          {/* Alternative Candidates Table */}
          {candidates.length > 1 && (
            <div className="mt-4 rounded-md border border-border bg-card p-4">
              <div className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Alternative Candidate Schedule Matches
              </div>
              <div className="space-y-2">
                {candidates.slice(1).map((cand) => {
                  const act = activities.find((a) => a.id === cand.activityId);
                  return (
                    <div key={cand.activityId} className="flex items-center justify-between rounded border border-border p-2 text-xs">
                      <div className="flex items-center gap-2.5">
                        <Mono className="text-primary font-semibold">{cand.activityId}</Mono>
                        <span className="font-medium text-foreground">{act?.name}</span>
                        <span className="text-muted-foreground">({act?.discipline} · {act?.area})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <ConfidenceBadge value={cand.confidence} />
                        <button
                          onClick={() => openActivity(cand.activityId)}
                          className="rounded border border-border px-2 py-0.5 text-[11px] hover:bg-accent"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Panel>

      {/* Scoring Model Weight Architecture */}
      <Panel title="Hybrid Scoring Model Architecture" icon={Layers}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 text-xs">
          <div className="rounded-sm border border-border bg-card p-3">
            <div className="text-[10px] uppercase text-muted-foreground font-mono">Discipline Match</div>
            <div className="mt-1 font-display text-lg font-bold text-primary">22%</div>
            <div className="text-[11px] text-muted-foreground">Discipline keyword alignment</div>
          </div>

          <div className="rounded-sm border border-border bg-card p-3">
            <div className="text-[10px] uppercase text-muted-foreground font-mono">Equipment Tag</div>
            <div className="mt-1 font-display text-lg font-bold text-success">36%</div>
            <div className="text-[11px] text-muted-foreground">Exact tag match (PT, F, V, CV)</div>
          </div>

          <div className="rounded-sm border border-border bg-card p-3">
            <div className="text-[10px] uppercase text-muted-foreground font-mono">Line Size</div>
            <div className="mt-1 font-display text-lg font-bold text-info">30%</div>
            <div className="text-[11px] text-muted-foreground">Exact inch pipe size match</div>
          </div>

          <div className="rounded-sm border border-border bg-card p-3">
            <div className="text-[10px] uppercase text-muted-foreground font-mono">Area Match</div>
            <div className="mt-1 font-display text-lg font-bold text-warning">10%</div>
            <div className="text-[11px] text-muted-foreground">Unit location agreement</div>
          </div>

          <div className="rounded-sm border border-border bg-card p-3">
            <div className="text-[10px] uppercase text-muted-foreground font-mono">Semantic Similarity</div>
            <div className="mt-1 font-display text-lg font-bold text-primary">34%</div>
            <div className="text-[11px] text-muted-foreground">Lexical root & verb match</div>
          </div>

          <div className="rounded-sm border border-border bg-card p-3">
            <div className="text-[10px] uppercase text-muted-foreground font-mono">Schedule Window</div>
            <div className="mt-1 font-display text-lg font-bold text-success">Context</div>
            <div className="text-[11px] text-muted-foreground">Active execution window fit</div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
