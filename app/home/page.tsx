import Link from "next/link";

import { BannerPlaceholder } from "@/components/org/banner-placeholder";
import { NewReportButton } from "@/components/reports/new-report-button";
import { WindowFrame } from "@/components/reports/window-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireMember } from "@/lib/auth";
import { isAdminRole, isOwnerRole } from "@/lib/permissions";
import type { ReportStatus } from "@/lib/supabase/types";

export default async function OrgHomePage() {
  const { supabase, membership } = await requireMember();
  const org = membership.organizations;
  const admin = isAdminRole(membership.role);
  const owner = isOwnerRole(membership.role);
  const orgId = membership.organization_id;

  const [{ data: reportRows }, pendingRes] = await Promise.all([
    supabase.from("reports").select("status").eq("organization_id", orgId),
    admin
      ? supabase
          .from("memberships")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("status", "pending")
      : Promise.resolve({ count: 0 }),
  ]);

  const counts: Record<ReportStatus, number> = {
    draft: 0,
    submitted: 0,
    finalized: 0,
  };
  for (const row of reportRows ?? []) {
    counts[row.status as ReportStatus] += 1;
  }

  const pendingCount = pendingRes.count ?? 0;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {org?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logo_url}
              alt=""
              className="size-12 shrink-0 rounded-md border border-border bg-card object-contain"
            />
          )}
          <div className="min-w-0">
            <h1 className="truncate">{org?.name ?? "Organization"}</h1>
            {org?.agency_name && (
              <p className="mt-1 text-sm text-muted-foreground">{org.agency_name}</p>
            )}
          </div>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          All organizations
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-muted shadow-soft">
        {org?.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org.banner_url}
            alt=""
            className="h-40 w-full object-cover sm:h-52"
          />
        ) : (
          <BannerPlaceholder />
        )}
      </div>

      <WindowFrame title="Reports">
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          <Stat label="Drafts" value={counts.draft} href="/reports?status=draft" />
          <Stat label="Submitted" value={counts.submitted} href="/reports?status=submitted" />
          <Stat label="Finalized" value={counts.finalized} href="/reports?status=finalized" />
        </div>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            Open the report list to file a new incident or continue a draft.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/reports">Open reports</Link>
            </Button>
            {!admin && <NewReportButton />}
          </div>
        </div>
      </WindowFrame>

      {admin && (
        <div className={owner ? "grid gap-4 md:grid-cols-2 lg:grid-cols-4" : "grid gap-4 md:grid-cols-3"}>
          <WindowFrame
            title="Team"
            trailing={
              pendingCount > 0 ? (
                <Badge variant="warning">{pendingCount} pending</Badge>
              ) : undefined
            }
          >
            <div className="p-4">
              <p className="text-sm text-muted-foreground">
                Approve join requests, manage the roster, and review activity.
              </p>
              <Button asChild className="mt-4">
                <Link href="/admin/team">Open team</Link>
              </Button>
            </div>
          </WindowFrame>

          <WindowFrame title="Configuration">
            <div className="p-4">
              <p className="text-sm text-muted-foreground">
                Buildings, units, intake questions, PDF template, and officer
                report visibility.
              </p>
              <Button asChild className="mt-4">
                <Link href="/admin/configuration">Open configuration</Link>
              </Button>
            </div>
          </WindowFrame>

          <WindowFrame title="Settings">
            <div className="p-4">
              <p className="text-sm text-muted-foreground">
                Organization name, address, logo, and banner.
              </p>
              <Button asChild className="mt-4">
                <Link href="/admin/settings">Open settings</Link>
              </Button>
            </div>
          </WindowFrame>

          {owner && (
            <WindowFrame title="Billing">
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  Plan, payment method, media storage, and the invoice for
                  properties you own.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/admin/billing">Open billing</Link>
                </Button>
              </div>
            </WindowFrame>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="px-4 py-4 text-center transition-colors hover:bg-accent/40">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </Link>
  );
}
