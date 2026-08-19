import type { Metadata } from "next";
import { BackToOrgHome } from "@/components/back-to-org-home";
import { DeleteOrganization } from "@/components/settings/delete-organization";
import { OrganizationSettings } from "@/components/settings/organization-settings";
import { requireAdmin } from "@/lib/auth";
import { effectivePlanId, organizationDeleteBlock } from "@/lib/billing";
import { PLAN_LIMITS } from "@/lib/plans";
import { isOwnerRole } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function OrganizationSettingsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const { supabase, membership } = await requireAdmin();
  const org = membership.organizations;
  if (!org) return null;

  const { data: billing } = await supabase
    .from("org_billing")
    .select("status, current_period_end")
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  const planId = effectivePlanId(org.plan_id, billing);
  const owner = isOwnerRole(membership.role);
  const deleteBlock = organizationDeleteBlock(billing);

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <BackToOrgHome />
        <h1 className="mt-3">Settings</h1>
        <p className="page-lead">
          Organization name, address, logo, and banner.
        </p>
      </div>
      <OrganizationSettings
        org={{
          id: org.id,
          name: org.name,
          agency_name: org.agency_name,
          address: org.address,
          logo_url: org.logo_url,
          banner_url: org.banner_url,
        }}
        isOwner={owner}
        canBrand={PLAN_LIMITS[planId].branding}
        error={searchParams.error}
      />
      {owner && (
        <DeleteOrganization
          orgName={org.name}
          blockedMessage={deleteBlock.blocked ? deleteBlock.message : null}
        />
      )}
    </div>
  );
}
