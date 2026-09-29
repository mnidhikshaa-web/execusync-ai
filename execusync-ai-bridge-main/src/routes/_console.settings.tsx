import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader,
  Panel,
  Chip,
  Mono,
} from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import {
  Bot,
  Check,
  Cpu,
  Key,
  Lock,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  Sliders,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_console/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Configuration — EXECUSYNC AI" },
      { name: "description", content: "Configure AI matching thresholds, AI providers, and reset demo data." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, updateSettings, reset } = useStore();
  const [highThresh, setHighThresh] = useState(settings.highThreshold);
  const [revThresh, setRevThresh] = useState(settings.reviewThreshold);
  const [unmThresh, setUnmThresh] = useState(settings.unmatchedThreshold);
  const [provider, setProvider] = useState<"demo" | "gemini">("demo");
  const [geminiKey, setGeminiKey] = useState("");
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = () => {
    updateSettings({
      highThreshold: highThresh,
      reviewThreshold: revThresh,
      unmatchedThreshold: unmThresh,
    });
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2500);
  };

  const handleResetDemo = () => {
    if (confirm("Are you sure you want to reset all project activities, reports, events, and audit logs to initial baseline demo state?")) {
      reset();
      alert("Database reset to initial demo state!");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System Configuration"
        title="Settings & Threshold Calibration"
        description="Calibrate AI confidence threshold bands, configure modular AI providers, and manage demonstration state."
      />

      {savedMessage && (
        <div className="rounded-md border border-success/30 bg-success/10 p-3 text-xs font-semibold text-success">
          Settings successfully saved and applied to matching engine!
        </div>
      )}

      {/* Threshold Configuration Panel */}
      <Panel title="AI Matching Confidence Thresholds" icon={Sliders}>
        <div className="space-y-6 text-xs max-w-2xl">
          <div className="space-y-2">
            <div className="flex justify-between font-semibold">
              <span>High Confidence Band (Auto-Eligible / 1-Click Approve):</span>
              <span className="font-mono text-success font-bold text-sm">≥ {highThresh}%</span>
            </div>
            <input
              type="range"
              min={80}
              max={98}
              value={highThresh}
              onChange={(e) => setHighThresh(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-[11px] text-muted-foreground">
              Matches scoring at or above this value are marked as High Confidence and can be batch-approved by the lead planner.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-semibold">
              <span>Medium Confidence Threshold (Planner Verification Required):</span>
              <span className="font-mono text-warning font-bold text-sm">≥ {revThresh}%</span>
            </div>
            <input
              type="range"
              min={60}
              max={85}
              value={revThresh}
              onChange={(e) => setRevThresh(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-[11px] text-muted-foreground">
              Matches between this threshold and high confidence will trigger standard planner verification queue.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-semibold">
              <span>Unmatched Scope Cutoff (Triggers Missing Activity Detector):</span>
              <span className="font-mono text-destructive font-bold text-sm">&lt; {unmThresh}%</span>
            </div>
            <input
              type="range"
              min={40}
              max={70}
              value={unmThresh}
              onChange={(e) => setUnmThresh(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-[11px] text-muted-foreground">
              Observations with no candidate exceeding this cutoff are automatically routed to the Missing Activity Detector.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Save className="h-3.5 w-3.5" /> Save Threshold Settings
            </button>
          </div>
        </div>
      </Panel>

      {/* AI Provider Architecture */}
      <Panel title="Modular AI Extraction Engine Provider" icon={Bot}>
        <div className="space-y-4 text-xs max-w-2xl">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div
              onClick={() => setProvider("demo")}
              className={`cursor-pointer rounded-md border p-3.5 transition ${
                provider === "demo" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Demo Deterministic Engine</span>
                {provider === "demo" && <Chip tone="success">Active</Chip>}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Built-in domain-specific heuristic scoring model. 100% offline, reproducible, zero API cost.
              </p>
            </div>

            <div
              onClick={() => setProvider("gemini")}
              className={`cursor-pointer rounded-md border p-3.5 transition ${
                provider === "gemini" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Google Gemini LLM Engine</span>
                {provider === "gemini" && <Chip tone="info">Configured</Chip>}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Optional LLM Provider for advanced natural language reasoning and contextual extraction.
              </p>
            </div>
          </div>

          {provider === "gemini" && (
            <div className="rounded border border-border bg-muted/20 p-3 space-y-2">
              <label className="block font-semibold text-foreground">
                Gemini API Key (Optional):
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="Enter GEMINI_API_KEY (stored in env)..."
                    className="w-full rounded border border-border bg-background py-1.5 pl-8 pr-3 text-xs"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                If omitted, the platform automatically defaults to the deterministic engine without breaking.
              </p>
            </div>
          )}
        </div>
      </Panel>

      {/* Demonstration Governance & Reset */}
      <Panel title="Demonstration State & Baseline Integrity" icon={ShieldCheck}>
        <div className="space-y-3 text-xs max-w-2xl">
          <div className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
            <Lock className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-foreground">Baseline Immutability Protection</div>
              <p className="mt-0.5 text-muted-foreground text-[11px]">
                Schedule baseline BL-03 planned dates are locked against direct overwrite. All progress updates are strictly applied to the Actuals layer with full audit logging.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleResetDemo}
              className="inline-flex items-center gap-1.5 rounded-sm border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Demo Database to Clean State
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
