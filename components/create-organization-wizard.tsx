"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { createOrganization } from "@/app/actions/org";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateOrganizationWizard({ error }: { error?: string }) {
  const [buildings, setBuildings] = useState([""]);

  return (
    <form action={createOrganization} className="space-y-6">
      {error && <Alert>{error}</Alert>}

      <div>
        <Label htmlFor="orgName">Organization name</Label>
        <Input
          id="orgName"
          name="orgName"
          required
          placeholder="e.g. Harborview Residences"
        />
      </div>

      <div>
        <Label htmlFor="agencyName">Security agency (optional)</Label>
        <Input
          id="agencyName"
          name="agencyName"
          placeholder="e.g. Northline Security"
        />
      </div>

      <div>
        <Label htmlFor="buildingAddress">Building address</Label>
        <Input
          id="buildingAddress"
          name="buildingAddress"
          required
          autoComplete="street-address"
          placeholder="e.g. 1200 Ocean Drive, Miami FL"
        />
      </div>

      <div className="space-y-3">
        <Label>Buildings</Label>
        <p className="text-xs text-muted-foreground">
          Add every building at this property. Units can be added later on a
          paid plan.
        </p>
        {buildings.map((value, index) => (
          <div key={index} className="flex gap-2">
            <Input
              name="buildingNames"
              required={index === 0}
              value={value}
              onChange={(event) => {
                const next = [...buildings];
                next[index] = event.target.value;
                setBuildings(next);
              }}
              placeholder={index === 0 ? "e.g. Tower A" : "Building name"}
            />
            {buildings.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove building"
                onClick={() =>
                  setBuildings(buildings.filter((_, i) => i !== index))
                }
              >
                <X />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setBuildings([...buildings, ""])}
        >
          <Plus />
          Add another building
        </Button>
      </div>

      <SubmitButton className="w-full" size="lg" pendingLabel="Creating…">
        Create organization
      </SubmitButton>
    </form>
  );
}
