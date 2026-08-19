"use client";

import { decideMembership } from "@/app/actions/org";
import { Button } from "@/components/ui/button";

export function RemoveMemberButton({ membershipId }: { membershipId: string }) {
  return (
    <form
      action={decideMembership}
      onSubmit={(event) => {
        if (!window.confirm("Remove this member from the organization?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="membershipId" value={membershipId} />
      <input type="hidden" name="status" value="removed" />
      <Button type="submit" size="sm" variant="destructive">
        Remove
      </Button>
    </form>
  );
}
