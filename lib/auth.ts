import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgIdFromCookie } from "@/lib/active-org";
import {
  homePathForMembership,
  isAdminRole,
  isApproved,
  isOwnerRole,
  type MembershipSummary,
} from "@/lib/permissions";
import type { Tables } from "@/lib/supabase/types";

export type SessionMembership = MembershipSummary & {
  id: string;
  organizations: Pick<
    Tables<"organizations">,
    "id" | "name" | "join_code" | "logo_url" | "banner_url" | "created_at" | "plan_id" | "address" | "agency_name" | "officer_can_view_own_reports"
  > | null;
};

type MembershipQueryRow = {
  id: string;
  role: SessionMembership["role"];
  status: SessionMembership["status"];
  organization_id: string;
  organizations:
    | SessionMembership["organizations"]
    | SessionMembership["organizations"][]
    | null;
};

const MEMBERSHIP_SELECT =
  "id, role, status, organization_id, organizations ( id, name, join_code, logo_url, banner_url, created_at, plan_id, address, agency_name, officer_can_view_own_reports )";

function toSessionMembership(data: MembershipQueryRow): SessionMembership {
  const orgRaw = data.organizations;
  const organizations = Array.isArray(orgRaw) ? (orgRaw[0] ?? null) : orgRaw;

  return {
    id: data.id,
    role: data.role,
    status: data.status,
    organization_id: data.organization_id,
    organizations,
  };
}

function resolveActiveMembership(
  memberships: SessionMembership[],
  cookieOrgId: string | undefined
): SessionMembership | null {
  if (memberships.length === 0) return null;
  if (cookieOrgId) {
    const match = memberships.find((m) => m.organization_id === cookieOrgId);
    if (match) return match;
  }
  const approved = memberships.find((m) => m.status === "approved");
  return approved ?? memberships[0];
}

export const requireUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
});

export async function listUserMemberships(
  userId: string,
  options?: { approvedOnly?: boolean }
): Promise<SessionMembership[]> {
  return loadUserMemberships(userId, options?.approvedOnly ?? false);
}

const loadUserMemberships = cache(async (userId: string, approvedOnly: boolean) => {
  const supabase = createClient();
  let query = supabase
    .from("memberships")
    .select(MEMBERSHIP_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (approvedOnly) {
    query = query.eq("status", "approved");
  }

  const { data } = await query;
  return (data ?? []).map((row) =>
    toSessionMembership(row as MembershipQueryRow)
  );
});

export async function getMembershipForOrg(
  userId: string,
  orgId: string
): Promise<SessionMembership | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("memberships")
    .select(MEMBERSHIP_SELECT)
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!data) return null;
  return toSessionMembership(data as MembershipQueryRow);
}

export const getLatestMembership = cache(async (userId: string) => {
  const all = await listUserMemberships(userId);
  return resolveActiveMembership(all, getActiveOrgIdFromCookie());
});

export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const membership = await getLatestMembership(user.id);

  if (!membership || !isApproved(membership) || !isAdminRole(membership.role)) {
    redirect(homePathForMembership(membership));
  }

  return { supabase, user, membership };
}

export async function requireMember() {
  const { supabase, user } = await requireUser();
  const membership = await getLatestMembership(user.id);

  if (!membership || !isApproved(membership)) {
    redirect(homePathForMembership(membership));
  }

  return { supabase, user, membership };
}

export async function requireOwner() {
  const { supabase, user, membership } = await requireAdmin();
  if (!isOwnerRole(membership.role)) {
    redirect("/home");
  }
  return { supabase, user, membership };
}

export async function requireOfficer() {
  const { supabase, user } = await requireUser();
  const membership = await getLatestMembership(user.id);

  if (
    !membership ||
    !isApproved(membership) ||
    membership.role !== "officer"
  ) {
    redirect(homePathForMembership(membership));
  }

  return { supabase, user, membership };
}
