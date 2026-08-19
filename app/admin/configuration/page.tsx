import type { Metadata } from "next";
import Link from "next/link";

import { BackToOrgHome } from "@/components/back-to-org-home";
import { WindowFrame } from "@/components/reports/window-frame";
import { PropertyConfiguration } from "@/components/settings/property-configuration";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { isOwnerRole } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Configuration",
};

export default async function ConfigurationPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const { supabase, membership } = await requireAdmin();
  const org = membership.organizations;
  if (!org) return null;

  const { data: buildingRows } = await supabase
    .from("buildings")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .order("name");

  const { data: unitRows } = await supabase
    .from("building_units")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .order("unit_number");

  const buildings = (buildingRows ?? []).map((building) => ({
    ...building,
    units: (unitRows ?? []).filter((unit) => unit.building_id === building.id),
  }));

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <BackToOrgHome />
        <h1 className="mt-3">Configuration</h1>
        <p className="page-lead">
          Buildings, units, intake questions, PDF template, and whether
          officers can review their own reports.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <WindowFrame title="Intake questions">
          <div className="p-4">
            <p className="text-sm text-muted-foreground">
              Default fields stay in sync with the PDF. Standard and Pro can
              add custom questions and conditionals.
            </p>
            <Button asChild className="mt-4">
              <Link href="/admin/configuration/intake">Open intake</Link>
            </Button>
          </div>
        </WindowFrame>
        <WindowFrame title="PDF template">
          <div className="p-4">
            <p className="text-sm text-muted-foreground">
              Free uses the default incident form. Standard and Pro can drag
              fields on a saved layout.
            </p>
            <Button asChild className="mt-4">
              <Link href="/admin/configuration/pdf-template">
                Open PDF template
              </Link>
            </Button>
          </div>
        </WindowFrame>
      </div>

      <PropertyConfiguration
        isOwner={isOwnerRole(membership.role)}
        officerCanView={org.officer_can_view_own_reports}
        buildings={buildings}
        error={searchParams.error}
      />
    </div>
  );
}
