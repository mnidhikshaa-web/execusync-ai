import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, Chip, Mono } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { DEMO_REPORTS } from "@/lib/data";
import { fmt, TODAY } from "@/lib/dates";
import {
  ArrowRight,
  CheckCircle2,
  FileCode,
  FileSpreadsheet,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_console/ingest")({
  head: () => ({
    meta: [
      { title: "Data Ingestion Center — EXECUSYNC AI" },
      { name: "description", content: "Ingest unstructured site execution data: DPRs, spreadsheets, diaries, and logs." },
    ],
  }),
  component: DataIngestionCenter,
});

function DataIngestionCenter() {
  const { reports, addReport, addUploadedFile, processReport } = useStore();
  const navigate = useNavigate();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewReportId, setViewReportId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const selectedReport = reports.find((r) => r.id === viewReportId);

  const handleProcess = (id: string) => {
    setProcessingId(id);
    setTimeout(() => {
      processReport(id);
      setProcessingId(null);
      navigate({ to: "/review" });
    }, 600);
  };

  const handleFileUpload = async (file: File) => {
    const id = await addUploadedFile(file);
    handleProcess(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Execution Ingestion"
        title="Data Ingestion Center"
        description="Ingest multi-format unstructured site execution records (PDF, XLSX, CSV, DOCX, TXT) into the AI extraction and matching pipeline."
      />

      {/* 1-Click Load Synthetic Demo Reports */}
      <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-primary">
          <Zap className="h-4 w-4" /> 1-Click Demo Ingestion Packs
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Instantly load pre-built synthetic site reports representing realistic refinery construction observations.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            onClick={() => {
              const id = addReport("daily");
              handleProcess(id);
            }}
            className="flex flex-col items-start justify-between rounded-sm border border-border bg-card p-3 text-left transition hover:border-primary hover:bg-accent"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-semibold text-xs text-foreground">Daily Progress Report #028</span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Multi-discipline observations: 24" line erection, F102 foundation, cable trays, column internals.
            </div>
            <div className="mt-3 flex items-center gap-1 font-mono text-[10px] text-primary">
              Load & Process <ArrowRight className="h-3 w-3" />
            </div>
          </button>

          <button
            onClick={() => {
              const id = addReport("sheet");
              handleProcess(id);
            }}
            className="flex flex-col items-start justify-between rounded-sm border border-border bg-card p-3 text-left transition hover:border-primary hover:bg-accent"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-success" />
              <span className="font-semibold text-xs text-foreground">Discipline Tracker Wk39</span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Excel progress export: Fire & Gas loop checks, cooling tower fan CT-1, AC-3 air coolers.
            </div>
            <div className="mt-3 flex items-center gap-1 font-mono text-[10px] text-success">
              Load & Process <ArrowRight className="h-3 w-3" />
            </div>
          </button>

          <button
            onClick={() => {
              const id = addReport("diary");
              handleProcess(id);
            }}
            className="flex flex-col items-start justify-between rounded-sm border border-border bg-card p-3 text-left transition hover:border-primary hover:bg-accent"
          >
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-warning" />
              <span className="font-semibold text-xs text-foreground">Supervisor Site Diary</span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Field supervisor diary: Pump P-103 alignment, line PR-07 erection, field instructions.
            </div>
            <div className="mt-3 flex items-center gap-1 font-mono text-[10px] text-warning">
              Load & Process <ArrowRight className="h-3 w-3" />
            </div>
          </button>
        </div>
      </div>

      {/* Drag & Drop File Upload Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFileUpload(file);
        }}
        className={`relative rounded-md border-2 border-dashed p-8 text-center transition ${
          dragOver ? "border-primary bg-primary/10" : "border-border bg-card"
        }`}
      >
        <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-3 font-display text-sm font-bold text-foreground">
          Drag & drop site execution files here
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Supports TXT, CSV, XLSX, PDF, DOCX (Native text parsing. OCR is disabled for scanned images).
        </p>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-sm bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
          <Upload className="h-3.5 w-3.5" /> Browse Files
          <input
            type="file"
            accept=".txt,.csv,.xlsx,.xls,.pdf,.docx,.md"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="hidden"
          />
        </label>
      </div>

      {/* Ingestion Records Table */}
      <Panel title="Ingested Site Records & Reports" icon={FileText} bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Report ID / File</th>
                <th className="px-4 py-3">Source & Category</th>
                <th className="px-3 py-3">Format</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Observations Count</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.map((r) => {
                const isProcessing = processingId === r.id;
                return (
                  <tr key={r.id} className="transition hover:bg-accent/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold font-mono text-primary">{r.id}</div>
                      <div className="font-medium text-foreground">{r.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{r.source}</div>
                      <div className="text-[11px] text-muted-foreground">{r.type}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Chip>{r.fileType}</Chip>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px]">
                      {fmt(r.date)}
                    </td>
                    <td className="px-3 py-3 font-mono">
                      {r.lines.length} lines
                    </td>
                    <td className="px-3 py-3">
                      <Chip
                        tone={
                          r.status === "Processed"
                            ? "success"
                            : r.status === "Needs Review"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {r.status}
                      </Chip>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.lines.length > 0 && (
                          <button
                            onClick={() => setViewReportId(r.id)}
                            className="rounded-sm border border-border px-2 py-1 text-[11px] hover:bg-accent"
                          >
                            View Lines
                          </button>
                        )}
                        <button
                          disabled={isProcessing}
                          onClick={() => handleProcess(r.id)}
                          className="inline-flex items-center gap-1 rounded-sm bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" /> Processing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3" /> Process AI Matches
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Raw Lines Inspection Modal */}
      <Dialog open={!!viewReportId} onOpenChange={(o) => !o && setViewReportId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Raw Report Lines: {selectedReport?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[360px] space-y-2 overflow-y-auto py-2 text-xs">
            {selectedReport?.lines.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">No extracted lines available.</div>
            ) : (
              selectedReport?.lines.map((l, i) => (
                <div key={i} className="rounded-sm border border-border bg-muted/30 p-2 font-mono text-[11px]">
                  <span className="text-muted-foreground mr-2">{i + 1}.</span> {l}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
