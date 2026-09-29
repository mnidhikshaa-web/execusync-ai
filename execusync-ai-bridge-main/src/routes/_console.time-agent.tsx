import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import {
  PageHeader,
  Panel,
  Chip,
  ConfidenceBadge,
  EventChip,
  Mono,
  StatusChip,
} from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { extract, match, type Extraction } from "@/lib/ai-service";
import { TODAY } from "@/lib/dates";
import {
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  HardHat,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  Wrench,
  X,
} from "lucide-react";

export const Route = createFileRoute("/_console/time-agent")({
  head: () => ({
    meta: [
      { title: "Time Agent — EXECUSYNC AI" },
      { name: "description", content: "Site supervisor natural-language and voice execution progress capture." },
    ],
  }),
  component: TimeAgent,
});

const QUICK_PROMPTS = [
  'Piping line 24 erection started at 9:30 this morning.',
  'Foundation F102 concreting completed at 5 PM.',
  'Pump P-101 installation started in Area B.',
  'Electrical cable tray work reached 80 percent in Area A.',
  'Control valve CV-110 installation started on Area B.',
  'Column C-101 internals tray installation reached 45%.',
];

function TimeAgent() {
  const { activities, timeAgentCommit, events } = useStore();
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [stagedResult, setStagedResult] = useState<{
    text: string;
    extraction: Extraction;
    activityId: string;
    confidence: number;
    activityName: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Web Speech API reference
  const recognitionRef = useRef<any>(null);

  const startVoiceRecognition = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser. Please type your update.");
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleProcessText(transcript);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleProcessText = (textToProcess: string) => {
    const text = textToProcess.trim();
    if (!text) return;

    const ex = extract(text, TODAY);
    const candidates = match(text, ex, activities);
    const top = candidates[0];

    if (top) {
      const act = activities.find((a) => a.id === top.activityId);
      setStagedResult({
        text,
        extraction: ex,
        activityId: top.activityId,
        confidence: top.confidence,
        activityName: act?.name || top.activityId,
      });
      setStatusMessage(null);
    } else {
      setStagedResult(null);
      setStatusMessage("No matching schedule activity detected. Try mentioning equipment tag or line size.");
    }
  };

  const handleConfirm = () => {
    if (!stagedResult) return;
    const res = timeAgentCommit(
      stagedResult.text,
      stagedResult.extraction,
      stagedResult.activityId,
      stagedResult.confidence,
    );

    if (res === "applied") {
      setStatusMessage(`Progress successfully verified & recorded for ${stagedResult.activityId}!`);
    } else {
      setStatusMessage(`Observation queued for Planner Review (confidence below auto-apply threshold).`);
    }
    setStagedResult(null);
    setInput("");
  };

  const supervisorHistory = events.filter((e) => e.source.includes("Time Agent"));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Real-Time Field Capture"
        title="Supervisor Time Agent"
        description="Natural language & voice progress capture for site supervisors. Links spoken updates to L5/L6 schedule activities in real time."
      />

      {/* Main Input Box */}
      <Panel title="Site Observation Natural Language Input" icon={HardHat}>
        <div className="space-y-4">
          <div className="relative">
            <textarea
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type or speak progress... (e.g. 'Piping line 24 erection started at 9:30 this morning in Area A')"
              className="w-full rounded-md border border-border bg-background p-3 text-xs focus:border-primary focus:outline-none"
            />

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              {/* Voice Button */}
              <button
                type="button"
                onClick={isRecording ? stopVoiceRecognition : startVoiceRecognition}
                className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-semibold transition ${
                  isRecording
                    ? "animate-pulse bg-destructive text-destructive-foreground"
                    : "border border-border bg-card hover:bg-accent"
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-3.5 w-3.5" /> Listening... Click to Stop
                  </>
                ) : (
                  <>
                    <Mic className="h-3.5 w-3.5 text-primary" /> Speak Progress (Voice Input)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleProcessText(input)}
                disabled={!input.trim()}
                className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" /> Interpret & Link Schedule
              </button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div>
            <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
              Or select quick field report prompts:
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(p);
                    handleProcessText(p);
                  }}
                  className="rounded-sm border border-border bg-secondary/40 px-2.5 py-1 text-[11px] text-secondary-foreground hover:border-primary hover:bg-accent"
                >
                  "{p}"
                </button>
              ))}
            </div>
          </div>

          {/* Status Message Notification */}
          {statusMessage && (
            <div className="rounded-md border border-success/30 bg-success/10 p-3 text-xs font-medium text-success">
              {statusMessage}
            </div>
          )}

          {/* Staged Interpretation & Confirmation Card */}
          {stagedResult && (
            <div className="mt-4 rounded-md border-2 border-primary bg-primary/5 p-4">
              <div className="flex items-center justify-between border-b border-primary/20 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-display text-sm font-bold uppercase tracking-wider text-primary">
                    AI Interpretation & Schedule Match
                  </span>
                </div>
                <ConfidenceBadge value={stagedResult.confidence} />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2 text-xs">
                {/* Detected Parameters */}
                <div className="space-y-2 rounded border border-border bg-card p-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Parsed Event Entities
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Event Type:</span>
                    <EventChip e={stagedResult.extraction.event} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Discipline:</span>
                    <span className="font-semibold text-foreground">{stagedResult.extraction.discipline || "Auto-detect"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Area:</span>
                    <span className="font-semibold text-foreground">{stagedResult.extraction.area || "Site-wide"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Reported Progress:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {stagedResult.extraction.progress !== null ? `${stagedResult.extraction.progress}%` : "Baseline default"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Observed Time:</span>
                    <span className="font-mono text-foreground">{stagedResult.extraction.time || "Immediate"}</span>
                  </div>
                </div>

                {/* Target Schedule Activity */}
                <div className="space-y-2 rounded border border-border bg-card p-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Matched L5/L6 Schedule Activity
                  </div>
                  <div>
                    <div className="font-mono font-bold text-primary text-sm">{stagedResult.activityId}</div>
                    <div className="font-semibold text-foreground">{stagedResult.activityName}</div>
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Confidence: <strong>{stagedResult.confidence}%</strong> ({stagedResult.confidence >= 90 ? "Auto-approvable" : "Will require Planner approval"})
                  </div>
                </div>
              </div>

              {/* Confirm / Edit / Cancel Actions */}
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-primary/20 pt-3">
                <button
                  type="button"
                  onClick={() => setStagedResult(null)}
                  className="rounded-sm border border-border px-3 py-1.5 text-xs hover:bg-accent"
                >
                  <X className="mr-1 inline h-3 w-3" /> Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="inline-flex items-center gap-1.5 rounded-sm bg-success px-4 py-1.5 text-xs font-semibold text-white hover:bg-success/90"
                >
                  <Check className="h-4 w-4" /> [CONFIRM & RECORD PROGRESS]
                </button>
              </div>
            </div>
          )}
        </div>
      </Panel>

      {/* Supervisor Submissions History */}
      <Panel title="Supervisor Submission History (Time Agent Updates)" icon={Clock} bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Timestamp / ID</th>
                <th className="px-4 py-3">Spoken Observation</th>
                <th className="px-3 py-3">Discipline</th>
                <th className="px-3 py-3">Event</th>
                <th className="px-3 py-3">Linked Activity</th>
                <th className="px-3 py-3">Confidence</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {supervisorHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    No Time Agent entries submitted in this session yet.
                  </td>
                </tr>
              ) : (
                supervisorHistory.map((e) => (
                  <tr key={e.id} className="transition hover:bg-accent/40">
                    <td className="px-4 py-3 font-mono">
                      <div className="font-semibold text-primary">{e.id}</div>
                      <div className="text-[10px] text-muted-foreground">{e.date} {e.time || ""}</div>
                    </td>
                    <td className="px-4 py-3 max-w-sm">
                      <div className="font-medium text-foreground">"{e.text}"</div>
                    </td>
                    <td className="px-3 py-3">{e.discipline || "—"}</td>
                    <td className="px-3 py-3"><EventChip e={e.event} /></td>
                    <td className="px-3 py-3 font-mono font-semibold text-primary">
                      {e.approvedActivityId || e.candidates[0]?.activityId || "—"}
                    </td>
                    <td className="px-3 py-3">
                      <ConfidenceBadge value={e.extractionConfidence} showBand={false} />
                    </td>
                    <td className="px-4 py-3">
                      <Chip tone="success">Recorded</Chip>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
