"use client";

import { moveOrgToFree } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";

export function MoveToFreeButton() {
  return (
    <form
      action={moveOrgToFree}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Move this property to Free? Paid features turn off once Stripe finishes the change."
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="ghost">
        Move to Free
      </Button>
    </form>
  );
}
