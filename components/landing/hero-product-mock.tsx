import { Badge } from "@/components/ui/badge";

const REPORTS = [
  {
    incident: "Unauthorized entry",
    location: "Building A · Gate 2",
    status: "submitted" as const,
  },
  {
    incident: "Noise complaint",
    location: "Unit 4B",
    status: "draft" as const,
  },
  {
    incident: "Medical assist",
    location: "Lobby",
    status: "finalized" as const,
  },
  {
    incident: "Parking violation",
    location: "Garage P2",
    status: "submitted" as const,
  },
];

const STATUS_VARIANT = {
  draft: "pending",
  submitted: "warning",
  finalized: "success",
} as const;

export function HeroProductMock() {
  return (
    <div className="relative w-full max-w-[540px] sm:pb-6">
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-card shadow-soft"
        aria-hidden
      >
        <div className="flex h-10 items-center gap-2 border-b border-border bg-muted/60 px-4">
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
          <span className="ml-2 text-xs font-medium tracking-tight text-muted-foreground">
            Reports
          </span>
        </div>

        <div className="flex h-[calc(100%-2.5rem)] flex-col">
          <div className="sticky top-0 grid grid-cols-[1fr_auto] gap-3 border-b border-border bg-card px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:grid-cols-[1.4fr_1fr_auto]">
            <span>Incident</span>
            <span className="hidden sm:inline">Location</span>
            <span>Status</span>
          </div>
          <ul className="divide-y divide-border">
            {REPORTS.map((row) => (
              <li
                key={row.incident}
                className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[1.4fr_1fr_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.incident}
                  </p>
                  <p className="truncate text-xs text-muted-foreground sm:hidden">
                    {row.location}
                  </p>
                </div>
                <p className="hidden truncate text-sm text-muted-foreground sm:block">
                  {row.location}
                </p>
                <Badge variant={STATUS_VARIANT[row.status]} className="capitalize">
                  {row.status.replace("_", " ")}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        className="pointer-events-none absolute bottom-0 right-4 hidden h-[292px] w-[168px] sm:block"
        aria-hidden
      >
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-soft">
          <div className="flex items-center justify-between px-4 pt-4">
            <span className="text-[10px] font-medium text-muted-foreground">
              New report
            </span>
            <span className="text-[10px] font-medium text-primary">3 / 8</span>
          </div>
          <div className="mx-4 mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[38%] rounded-full bg-primary" />
          </div>
          <div className="flex flex-1 flex-col px-4 py-4">
            <p className="text-sm font-semibold leading-snug text-foreground">
              Where did this happen?
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <span className="inline-flex min-h-11 items-center rounded-md border border-primary bg-primary/10 px-2.5 text-xs font-medium text-foreground">
                Building A
              </span>
              <span className="inline-flex min-h-11 items-center rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground">
                Building B
              </span>
            </div>
            <span className="mt-auto inline-flex min-h-11 items-center justify-center rounded-md bg-primary text-xs font-medium text-primary-foreground">
              Continue
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
