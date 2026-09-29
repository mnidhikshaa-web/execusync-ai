import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/logo";
import { ROLE_LABEL, useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EXECUSYNC AI — From Site Reality to Schedule Intelligence" },
      {
        name: "description",
        content: "Planning-to-Execution Intelligence Platform for infrastructure projects.",
      },
      { property: "og:title", content: "EXECUSYNC AI" },
      { property: "og:description", content: "From Site Reality to Schedule Intelligence." },
    ],
  }),
  component: Login,
});

function Login() {
  const { setRole } = useStore();
  const nav = useNavigate();
  const flow = [
    "Site Data",
    "AI Understanding",
    "L5/L6 Linking",
    "Human Verification",
    "Schedule Intelligence",
  ];
  return (
    <div className="bg-blueprint flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-3xl rounded-md border border-border bg-card/95 p-8">
        <Logo large />
        <h1 className="mt-8 text-3xl font-bold md:text-4xl">
          From Site Reality to Schedule Intelligence.
        </h1>
        <p className="mt-2 font-mono text-sm text-primary">Capture. Connect. Verify. Learn.</p>
        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
          {flow.map((f, i) => (
            <span key={f} className="flex items-center gap-2">
              <span className="rounded-sm border border-border px-2 py-1">{f}</span>
              {i < flow.length - 1 && <span className="text-brand">→</span>}
            </span>
          ))}
        </div>
        <div className="mt-8 text-xs uppercase tracking-wider text-muted-foreground">
          Enter demo as
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
          {(["manager", "planner", "supervisor", "executive"] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRole(r);
                nav({ to: "/dashboard" });
              }}
              className="rounded-sm border border-border px-3 py-3 text-sm hover:border-primary hover:bg-accent"
            >
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
        <p className="mt-6 text-[11px] text-muted-foreground">
          Synthetic Demonstration Data — not connected to live Oil India systems.
        </p>
      </div>
    </div>
  );
}
