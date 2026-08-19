"use client";

import { Plus, Trash2 } from "lucide-react";

import {
  addBuilding,
  addUnit,
  deleteBuilding,
  deleteUnit,
  updateBuilding,
  updateOfficerReportVisibility,
  updateUnit,
} from "@/app/actions/org";
import { WindowFrame } from "@/components/reports/window-frame";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Tables } from "@/lib/supabase/types";

export type BuildingRow = Tables<"buildings"> & {
  units: Tables<"building_units">[];
};

export function PropertyConfiguration({
  isOwner,
  officerCanView,
  buildings,
  error,
}: {
  isOwner: boolean;
  officerCanView: boolean;
  buildings: BuildingRow[];
  error?: string;
}) {
  return (
    <div className="min-w-0 space-y-6">
      {error && <Alert>{error}</Alert>}

      {isOwner && (
        <WindowFrame title="Officer reports">
          <form action={updateOfficerReportVisibility} className="space-y-4 p-4">
            <label className="flex items-start gap-3 text-sm leading-6">
              <input
                type="checkbox"
                name="officerCanView"
                defaultChecked={officerCanView}
                className="mt-1 size-4 rounded border-input"
              />
              <span>
                Officers can view their own reports after submit and finalize
              </span>
            </label>
            <Button type="submit">Save</Button>
          </form>
        </WindowFrame>
      )}

      <WindowFrame title="Buildings and units">
        <div className="space-y-6 p-4">
          {buildings.map((building) => (
            <BuildingEditor key={building.id} building={building} />
          ))}

          <form action={addBuilding} className="flex flex-col gap-2 sm:flex-row">
            <Input name="buildingName" placeholder="Add a building" required />
            <Button type="submit" variant="outline" className="shrink-0">
              <Plus />
              Add building
            </Button>
          </form>
        </div>
      </WindowFrame>
    </div>
  );
}

function BuildingEditor({ building }: { building: BuildingRow }) {
  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <form action={updateBuilding} className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <input type="hidden" name="buildingId" value={building.id} />
        <Input
          name="buildingName"
          required
          defaultValue={building.name}
          className="min-w-0"
        />
        <div className="flex shrink-0 gap-2">
          <Button type="submit" variant="outline">
            Save
          </Button>
          <Button
            type="submit"
            variant="ghost"
            formAction={deleteBuilding}
            formNoValidate
            onClick={(event) => {
              if (!window.confirm(`Remove ${building.name}?`)) {
                event.preventDefault();
              }
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </form>

      <ul className="space-y-2">
        {building.units.map((unit) => (
          <li key={unit.id}>
            <form
              action={updateUnit}
              className="flex min-w-0 flex-col gap-2 sm:flex-row"
            >
              <input type="hidden" name="unitId" value={unit.id} />
              <Input
                name="unitNumber"
                required
                defaultValue={unit.unit_number}
                placeholder="Unit number"
                className="min-w-0"
              />
              <Input
                name="unitLabel"
                defaultValue={unit.label ?? ""}
                placeholder="Label (optional)"
                className="min-w-0"
              />
              <div className="flex shrink-0 gap-2">
                <Button type="submit" variant="outline" size="sm">
                  Save
                </Button>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  formAction={deleteUnit}
                  aria-label="Remove unit"
                  onClick={(event) => {
                    if (!window.confirm("Remove this unit?")) {
                      event.preventDefault();
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </form>
          </li>
        ))}
      </ul>

      <form action={addUnit} className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <input type="hidden" name="buildingId" value={building.id} />
        <Input name="unitNumber" required placeholder="Unit number" className="min-w-0" />
        <Input name="unitLabel" placeholder="Label (optional)" className="min-w-0" />
        <Button type="submit" variant="outline" className="shrink-0">
          <Plus />
          Add unit
        </Button>
      </form>
    </div>
  );
}
