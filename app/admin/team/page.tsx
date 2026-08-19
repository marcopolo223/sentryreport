import { decideMembership } from "@/app/actions/org";
import { BackToOrgHome } from "@/components/back-to-org-home";
import { RemoveMemberButton } from "@/components/remove-member-button";
import { SetMemberRoleButton } from "@/components/set-member-role-button";
import { ActivityList } from "@/components/org/activity-list";
import { WindowFrame } from "@/components/reports/window-frame";
import { JoinCodePanel } from "@/components/settings/join-code-panel";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireAdmin } from "@/lib/auth";
import { effectivePlanId } from "@/lib/billing";
import { PLAN_LIMITS } from "@/lib/plans";
import { isOwnerRole } from "@/lib/permissions";
import type { MembershipRole, MembershipStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Team",
};

type MemberRow = {
  id: string;
  role: MembershipRole;
  status: MembershipStatus;
  user_id: string;
  users: { full_name: string | null; email: string } | null;
};

function profile(row: MemberRow) {
  return row.users;
}

export default async function AdminTeamPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const { supabase, user, membership } = await requireAdmin();
  const org = membership.organizations;
  if (!org) return null;

  const orgId = membership.organization_id;
  const [{ data }, { data: events }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, role, status, user_id")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_log")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const membershipRows = data ?? [];
  const activityEvents = events ?? [];
  const userIds = Array.from(
    new Set(
      [
        ...membershipRows.map((row) => row.user_id),
        ...activityEvents
          .map((event) => event.user_id)
          .filter((id): id is string => Boolean(id)),
      ]
    )
  );
  const { data: people } =
    userIds.length > 0
      ? await supabase
          .from("users")
          .select("id, full_name, email")
          .in("id", userIds)
      : { data: [] };
  const profiles = new Map(
    (people ?? []).map((person) => [person.id, person])
  );

  const rows = membershipRows.map((row) => ({
    ...row,
    users: profiles.get(row.user_id) ?? null,
  }));
  const pending = rows.filter((r) => r.status === "pending");
  const active = rows.filter((r) => r.status === "approved");
  const officerCount = active.filter((r) => r.role === "officer").length;
  const { data: billing } = await supabase
    .from("org_billing")
    .select("status, current_period_end")
    .eq("organization_id", orgId)
    .maybeSingle();
  const planId = effectivePlanId(org.plan_id, billing);
  const officerCap = PLAN_LIMITS[planId].maxOfficers;

  return (
    <div className="space-y-6">
      <div>
        <BackToOrgHome />
        <h1 className="mt-3">Team</h1>
        <p className="page-lead">
          New join requests stay pending until you approve them. Promote
          someone to Admin from the roster.
          {officerCap == null
            ? ` ${officerCount} officers on Pro (unlimited).`
            : ` ${officerCount} of ${officerCap} officer seats used.`}
        </p>
      </div>

      {searchParams.error && <Alert>{searchParams.error}</Alert>}

      <JoinCodePanel
        joinCode={org.join_code}
        isOwner={isOwnerRole(membership.role)}
      />

      <WindowFrame title="Pending requests">
        <div className="space-y-3 p-4">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending requests.</p>
          ) : (
            pending.map((row) => {
              const person = profile(row);
              return (
                <div
                  key={row.id}
                  className="flex flex-col gap-3 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {person?.full_name || person?.email || "Unknown"}
                    </p>
                    <p className="text-sm text-muted-foreground">{person?.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={decideMembership}>
                      <input type="hidden" name="membershipId" value={row.id} />
                      <input type="hidden" name="status" value="approved" />
                      <SubmitButton size="sm" pendingLabel="Approving…">
                        Approve
                      </SubmitButton>
                    </form>
                    <form action={decideMembership}>
                      <input type="hidden" name="membershipId" value={row.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <SubmitButton
                        size="sm"
                        variant="destructive"
                        pendingLabel="Denying…"
                      >
                        Deny
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </WindowFrame>

      <WindowFrame title="Roster">
        <div className="space-y-3 p-4">
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            active.map((row) => {
              const person = profile(row);
              return (
                <div
                  key={row.id}
                  className="flex flex-col gap-3 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">
                        {person?.full_name || person?.email || "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground">{person?.email}</p>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {row.role}
                    </Badge>
                  </div>
                  {row.role !== "owner" && row.user_id !== user.id && (
                    <div className="flex flex-wrap gap-2">
                      {row.role === "officer" ? (
                        <SetMemberRoleButton membershipId={row.id} role="admin" />
                      ) : (
                        <SetMemberRoleButton membershipId={row.id} role="officer" />
                      )}
                      <RemoveMemberButton membershipId={row.id} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </WindowFrame>

      <WindowFrame title="Activity">
        <ActivityList events={activityEvents} people={people ?? []} />
      </WindowFrame>
    </div>
  );
}
