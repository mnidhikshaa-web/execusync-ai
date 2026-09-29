export function Logo({ large = false }: { large?: boolean }) {
  const s = large ? 44 : 30;
  return (
    <div className="flex items-center gap-2.5">
      <svg width={s} height={s} viewBox="0 0 32 32" aria-hidden>
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="4"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="1.5"
        />
        <path
          d="M7 10h9M7 16h14M7 22h8"
          stroke="var(--muted-foreground)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M18 10l7 6-7 6"
          stroke="var(--brand)"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="leading-tight">
        <div
          className={
            large
              ? "font-display text-3xl font-extrabold tracking-tight"
              : "font-display text-[15px] font-extrabold tracking-tight"
          }
        >
          EXECUSYNC <span className="text-primary">AI</span>
        </div>
        <div
          className={large ? "text-sm text-muted-foreground" : "text-[10px] text-muted-foreground"}
        >
          Planning-to-Execution Intelligence Platform
        </div>
      </div>
    </div>
  );
}
