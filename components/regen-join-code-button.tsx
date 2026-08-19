"use client";

import { regenerateJoinCode } from "@/app/actions/org";
import { Button } from "@/components/ui/button";

export function RegenJoinCodeButton() {
  return (
    <form
      action={regenerateJoinCode}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Generate a new join code? The current code will stop working for new requests. Pending requests are not affected."
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="outline">
        Regenerate join code
      </Button>
    </form>
  );
}
