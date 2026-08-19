"use client";

import { useState } from "react";
import Link from "next/link";

import { deleteOrganization } from "@/app/actions/org";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WindowFrame } from "@/components/reports/window-frame";

export function DeleteOrganization({
  orgName,
  blockedMessage,
}: {
  orgName: string;
  blockedMessage: string | null;
}) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === orgName;

  return (
    <WindowFrame title="Delete organization">
      <div className="space-y-4 p-4">
        {blockedMessage ? (
          <>
            <Alert variant="info">{blockedMessage}</Alert>
            <Button asChild variant="outline">
              <Link href="/admin/billing">Open billing</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              This permanently deletes the property, its reports, members, and
              media. Type <span className="font-medium text-foreground">{orgName}</span>{" "}
              to confirm.
            </p>
            <form
              action={deleteOrganization}
              className="space-y-3"
              onSubmit={(event) => {
                if (!matches) {
                  event.preventDefault();
                  return;
                }
                if (
                  !window.confirm(
                    `Delete ${orgName}? This cannot be undone.`
                  )
                ) {
                  event.preventDefault();
                }
              }}
            >
              <div>
                <Label htmlFor="confirmName">Organization name</Label>
                <Input
                  id="confirmName"
                  name="confirmName"
                  autoComplete="off"
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                />
              </div>
              <Button type="submit" variant="destructive" disabled={!matches}>
                Delete organization
              </Button>
            </form>
          </>
        )}
      </div>
    </WindowFrame>
  );
}
