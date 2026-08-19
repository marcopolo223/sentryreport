import type { MembershipRole, MembershipStatus } from "@/lib/supabase/types";

export type MembershipSummary = {
  role: MembershipRole;
  status: MembershipStatus;
  organization_id: string;
};

export function isApproved(m: MembershipSummary | null | undefined): boolean {
  return m?.status === "approved";
}

export function isAdminRole(role: MembershipRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function isOwnerRole(role: MembershipRole | null | undefined): boolean {
  return role === "owner";
}

export function homePathForMembership(
  m?: MembershipSummary | null
): string {
  if (m && isApproved(m)) return "/home";
  return "/dashboard";
}

export function orgWorkspacePath(m: MembershipSummary): string {
  if (m.status !== "approved") return "/dashboard";
  return "/home";
}
