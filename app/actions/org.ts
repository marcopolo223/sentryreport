"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { organizationDeleteBlock } from "@/lib/billing";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import {
  clearActiveOrgCookie,
  getActiveOrgIdFromCookie,
  setActiveOrgCookie,
} from "@/lib/active-org";
import {
  getMembershipForOrg,
  listUserMemberships,
  requireAdmin,
  requireOwner,
} from "@/lib/auth";
import { isAdminRole, isOwnerRole, orgWorkspacePath } from "@/lib/permissions";
import type { MembershipRole, MembershipStatus } from "@/lib/supabase/types";

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createOrganization(formData: FormData) {
  const orgName = String(formData.get("orgName") ?? "").trim();
  const agencyName = String(formData.get("agencyName") ?? "").trim();
  const buildingAddress = String(formData.get("buildingAddress") ?? "").trim();
  const buildingNames = formData
    .getAll("buildingNames")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!orgName || !buildingAddress || buildingNames.length === 0) {
    redirectWithError(
      "/create-organization",
      "Organization name, address, and at least one building are required."
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("create_organization", {
    org_name: orgName,
    building_address: buildingAddress,
    building_names: buildingNames,
    agency_name: agencyName || null,
  });

  if (error || !data) {
    redirectWithError(
      "/create-organization",
      error?.message ?? "Could not create the organization."
    );
  }

  setActiveOrgCookie(data.id);
  redirect("/home");
}

export async function joinOrganization(formData: FormData) {
  const code = String(formData.get("joinCode") ?? "")
    .replace(/\s+/g, "")
    .trim();
  if (!code) {
    redirectWithError("/join-organization", "Enter a join code.");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("request_to_join_organization", {
    code,
  });

  if (error || !data) {
    redirectWithError(
      "/join-organization",
      error?.message ?? "Could not send the join request."
    );
  }

  setActiveOrgCookie(data.organization_id);
  revalidatePath("/admin/team");
  revalidatePath("/home");
  revalidatePath("/dashboard");
  redirect("/pending-approval");
}

export async function decideMembership(formData: FormData) {
  const membershipId = String(formData.get("membershipId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as MembershipStatus;

  if (!membershipId || !["approved", "rejected", "removed"].includes(status)) {
    redirect("/admin/team?error=" + encodeURIComponent("Invalid membership action."));
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("decide_membership", {
    target_membership_id: membershipId,
    new_status: status,
    grant_role: "officer",
  });

  if (error) {
    redirect("/admin/team?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/admin/team");
  revalidatePath("/home");
  revalidatePath("/dashboard");
  redirect("/admin/team");
}

export async function setMembershipRole(formData: FormData) {
  const membershipId = String(formData.get("membershipId") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() as MembershipRole;

  if (!membershipId || !["officer", "admin"].includes(role)) {
    redirect("/admin/team?error=" + encodeURIComponent("Invalid role change."));
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("set_membership_role", {
    target_membership_id: membershipId,
    new_role: role,
  });

  if (error) {
    redirect("/admin/team?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/admin/team");
  revalidatePath("/home");
  revalidatePath("/dashboard");
  redirect("/admin/team");
}

export async function regenerateJoinCode() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const memberships = await listUserMemberships(user.id, { approvedOnly: true });
  const cookieOrgId = getActiveOrgIdFromCookie();
  const active =
    memberships.find((m) => m.organization_id === cookieOrgId) ??
    memberships.find((m) => isAdminRole(m.role));

  if (!active || active.role !== "owner") {
    redirect("/admin/team");
  }

  const { error } = await supabase.rpc("regenerate_join_code", {
    org_id: active.organization_id,
  });

  if (error) {
    redirect("/admin/team?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/admin/team");
  redirect("/admin/team");
}

export async function switchOrganization(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "").trim();
  if (!orgId) redirect("/onboarding");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getMembershipForOrg(user.id, orgId);
  if (!membership) {
    redirect("/onboarding");
  }

  setActiveOrgCookie(orgId);
  redirect(orgWorkspacePath(membership));
}

export async function leaveActiveOrgSession() {
  clearActiveOrgCookie();
  redirect("/onboarding");
}

function settingsRedirect(message?: string): never {
  redirect(
    message
      ? `/admin/settings?error=${encodeURIComponent(message)}`
      : "/admin/settings"
  );
}

function configRedirect(message?: string): never {
  redirect(
    message
      ? `/admin/configuration?error=${encodeURIComponent(message)}`
      : "/admin/configuration"
  );
}

export async function updateOrganizationProfile(formData: FormData) {
  const { supabase, membership } = await requireAdmin();
  const orgName = String(formData.get("orgName") ?? "").trim();
  const agencyName = String(formData.get("agencyName") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!orgName || !address) {
    settingsRedirect("Organization name and address are required.");
  }

  const { error } = await supabase
    .from("organizations")
    .update({
      name: orgName,
      agency_name: agencyName || null,
      address,
    })
    .eq("id", membership.organization_id);

  if (error) settingsRedirect(error.message);

  revalidatePath("/admin/settings");
  revalidatePath("/home");
  revalidatePath("/dashboard");
  redirect("/admin/settings");
}

export async function updateOfficerReportVisibility(formData: FormData) {
  const { supabase, membership } = await requireAdmin();
  if (!isOwnerRole(membership.role)) {
    configRedirect("Only the owner can change this setting.");
  }

  const { error } = await supabase
    .from("organizations")
    .update({
      officer_can_view_own_reports:
        String(formData.get("officerCanView") ?? "") === "on",
    })
    .eq("id", membership.organization_id);

  if (error) configRedirect(error.message);

  revalidatePath("/admin/configuration");
  redirect("/admin/configuration");
}

export async function addBuilding(formData: FormData) {
  const { supabase, membership } = await requireAdmin();
  const name = String(formData.get("buildingName") ?? "").trim();
  if (!name) configRedirect("Building name is required.");

  const { error } = await supabase.from("buildings").insert({
    organization_id: membership.organization_id,
    name,
    address: membership.organizations?.address ?? null,
  });

  if (error) configRedirect(error.message);
  revalidatePath("/admin/configuration");
  revalidatePath("/home");
  redirect("/admin/configuration");
}

export async function updateBuilding(formData: FormData) {
  const { supabase, membership } = await requireAdmin();
  const buildingId = String(formData.get("buildingId") ?? "").trim();
  const name = String(formData.get("buildingName") ?? "").trim();
  if (!buildingId || !name) configRedirect("Building name is required.");

  const { error } = await supabase
    .from("buildings")
    .update({ name })
    .eq("id", buildingId)
    .eq("organization_id", membership.organization_id);

  if (error) configRedirect(error.message);
  revalidatePath("/admin/configuration");
  revalidatePath("/home");
  redirect("/admin/configuration");
}

export async function deleteBuilding(formData: FormData) {
  const { supabase, membership } = await requireAdmin();
  const buildingId = String(formData.get("buildingId") ?? "").trim();
  if (!buildingId) configRedirect("Building is required.");

  const { error } = await supabase
    .from("buildings")
    .delete()
    .eq("id", buildingId)
    .eq("organization_id", membership.organization_id);

  if (error) configRedirect(error.message);
  revalidatePath("/admin/configuration");
  revalidatePath("/home");
  redirect("/admin/configuration");
}

export async function addUnit(formData: FormData) {
  const { supabase, membership } = await requireAdmin();
  const buildingId = String(formData.get("buildingId") ?? "").trim();
  const unitNumber = String(formData.get("unitNumber") ?? "").trim();
  const label = String(formData.get("unitLabel") ?? "").trim();
  if (!buildingId || !unitNumber) {
    configRedirect("Unit number is required.");
  }

  const { error } = await supabase.from("building_units").insert({
    organization_id: membership.organization_id,
    building_id: buildingId,
    unit_number: unitNumber,
    label: label || null,
  });

  if (error) configRedirect(error.message);
  revalidatePath("/admin/configuration");
  revalidatePath("/home");
  redirect("/admin/configuration");
}

export async function updateUnit(formData: FormData) {
  const { supabase, membership } = await requireAdmin();
  const unitId = String(formData.get("unitId") ?? "").trim();
  const unitNumber = String(formData.get("unitNumber") ?? "").trim();
  const label = String(formData.get("unitLabel") ?? "").trim();
  if (!unitId || !unitNumber) configRedirect("Unit number is required.");

  const { error } = await supabase
    .from("building_units")
    .update({ unit_number: unitNumber, label: label || null })
    .eq("id", unitId)
    .eq("organization_id", membership.organization_id);

  if (error) configRedirect(error.message);
  revalidatePath("/admin/configuration");
  revalidatePath("/home");
  redirect("/admin/configuration");
}

export async function deleteUnit(formData: FormData) {
  const { supabase, membership } = await requireAdmin();
  const unitId = String(formData.get("unitId") ?? "").trim();
  if (!unitId) configRedirect("Unit is required.");

  const { error } = await supabase
    .from("building_units")
    .delete()
    .eq("id", unitId)
    .eq("organization_id", membership.organization_id);

  if (error) configRedirect(error.message);
  revalidatePath("/admin/configuration");
  revalidatePath("/home");
  redirect("/admin/configuration");
}

async function removeStorageObjects(bucket: string, paths: string[]) {
  if (paths.length === 0) return;
  const admin = createServiceClient();
  for (let index = 0; index < paths.length; index += 100) {
    await admin.storage.from(bucket).remove(paths.slice(index, index + 100));
  }
}

export async function deleteOrganization(formData: FormData) {
  const { supabase, membership } = await requireOwner();
  const orgId = membership.organization_id;
  const orgName = membership.organizations?.name ?? "";
  const typed = String(formData.get("confirmName") ?? "").trim();

  if (!orgName || typed !== orgName) {
    settingsRedirect("Type the organization name to confirm deletion.");
  }

  const { data: billing } = await supabase
    .from("org_billing")
    .select("status, current_period_end, stripe_subscription_id")
    .eq("organization_id", orgId)
    .maybeSingle();

  const blocked = organizationDeleteBlock(billing);
  if (blocked.blocked) {
    settingsRedirect(blocked.message);
  }

  if (isStripeConfigured() && billing?.stripe_subscription_id) {
    try {
      const subscription = await getStripe().subscriptions.retrieve(
        billing.stripe_subscription_id
      );
      const stillOnThisOrg = subscription.items.data.some(
        (item) => item.metadata.organization_id === orgId
      );
      if (
        stillOnThisOrg &&
        ["active", "trialing", "past_due"].includes(subscription.status)
      ) {
        settingsRedirect(
          "This property still has a paid Stripe subscription. Cancel it and wait until the period ends."
        );
      }
    } catch {
      // Subscription may already be gone; the database check above is enough.
    }
  }

  try {
    const admin = createServiceClient();
    const [{ data: media }, { data: reports }] = await Promise.all([
      admin
        .from("report_media")
        .select("storage_path")
        .eq("organization_id", orgId),
      admin
        .from("reports")
        .select("officer_signature_path, admin_signature_path")
        .eq("organization_id", orgId),
    ]);

    const mediaPaths = [
      ...(media ?? []).map((row) => row.storage_path),
      ...(reports ?? []).flatMap((row) => [
        row.officer_signature_path,
        row.admin_signature_path,
      ]),
    ].filter((path): path is string => Boolean(path));

    await removeStorageObjects("report-media", Array.from(new Set(mediaPaths)));
    await removeStorageObjects("org-branding", [
      `${orgId}/logo.jpg`,
      `${orgId}/banner.jpg`,
    ]);
  } catch {
    // Continue with the database delete even if storage cleanup fails.
  }

  const { error } = await supabase.rpc("delete_organization", {
    target_org_id: orgId,
  });
  if (error) settingsRedirect(error.message);

  if (getActiveOrgIdFromCookie() === orgId) {
    clearActiveOrgCookie();
  }

  revalidatePath("/dashboard");
  revalidatePath("/home");
  redirect("/dashboard");
}
