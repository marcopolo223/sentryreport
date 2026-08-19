"use client";

import { setMembershipRole } from "@/app/actions/org";
import { Button } from "@/components/ui/button";
import type { MembershipRole } from "@/lib/supabase/types";

export function SetMemberRoleButton({
  membershipId,
  role,
}: {
  membershipId: string;
  role: Extract<MembershipRole, "admin" | "officer">;
}) {
  const makeAdmin = role === "admin";

  return (
    <form
      action={setMembershipRole}
      onSubmit={(event) => {
        const message = makeAdmin
          ? "Give this member admin access?"
          : "Change this member back to officer?";
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="membershipId" value={membershipId} />
      <input type="hidden" name="role" value={role} />
      <Button type="submit" size="sm" variant={makeAdmin ? "outline" : "secondary"}>
        {makeAdmin ? "Make admin" : "Make officer"}
      </Button>
    </form>
  );
}
