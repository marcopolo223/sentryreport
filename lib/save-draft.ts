import { createClient } from "@/lib/supabase/client";
import type {
  AgencyKind,
  DamageType,
  InjuredPartyType,
  Json,
} from "@/lib/supabase/types";

export type DraftVehicle = {
  id: string;
  make_model: string;
  color: string;
  license_plate: string;
  driver_name: string;
};

export type DraftAgency = {
  id: string;
  kind: AgencyKind;
  involved: boolean;
  department: string;
  responder_id: string;
  responder_name: string;
  case_number: string;
};

export type SaveDraftInput = {
  reportId: string;
  orgId: string;
  incidentTypeId: string | null;
  buildingId: string | null;
  unitId: string | null;
  locationDetail: string;
  occurredAt: string | null;
  originalSummary: string;
  writerName: string;
  propertyAddress: string;
  agencies: DraftAgency[];
  vehiclesInvolved: boolean;
  vehicles: DraftVehicle[];
  anyoneInjured: boolean;
  injuredPartyType: InjuredPartyType | null;
  transportedToHospital: boolean;
  injuryDescription: string;
  peopleId: string | null;
  hasDamage: boolean;
  damageType: DamageType | null;
  damageDescription: string;
  estimatedCost: string;
  answers: { questionId: string; value: Json | null }[];
};

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function saveDraft(input: SaveDraftInput) {
  const supabase = createClient();

  const { error: reportError } = await supabase
    .from("reports")
    .update({
      incident_type_id: input.incidentTypeId,
      building_id: input.buildingId,
      unit_id: input.unitId,
      location_detail: emptyToNull(input.locationDetail),
      occurred_at: input.occurredAt,
      original_summary: emptyToNull(input.originalSummary),
      writer_name: emptyToNull(input.writerName),
      property_address: emptyToNull(input.propertyAddress),
    })
    .eq("id", input.reportId);

  if (reportError) throw reportError;

  for (const agency of input.agencies) {
    const { error } = await supabase
      .from("report_agencies")
      .update({
        involved: agency.involved,
        department: emptyToNull(agency.department),
        responder_id: emptyToNull(agency.responder_id),
        responder_name: emptyToNull(agency.responder_name),
        case_number: emptyToNull(agency.case_number),
      })
      .eq("id", agency.id);
    if (error) throw error;
  }

  const { error: deleteVehiclesError } = await supabase
    .from("report_vehicles")
    .delete()
    .eq("report_id", input.reportId);
  if (deleteVehiclesError) throw deleteVehiclesError;

  if (input.vehiclesInvolved && input.vehicles.length > 0) {
    const { error } = await supabase.from("report_vehicles").insert(
      input.vehicles.map((vehicle, index) => ({
        id: vehicle.id,
        report_id: input.reportId,
        organization_id: input.orgId,
        sort_order: index,
        make_model: emptyToNull(vehicle.make_model),
        color: emptyToNull(vehicle.color),
        license_plate: emptyToNull(vehicle.license_plate),
        driver_name: emptyToNull(vehicle.driver_name),
      }))
    );
    if (error) throw error;
  }

  const { error: deletePeopleError } = await supabase
    .from("report_people")
    .delete()
    .eq("report_id", input.reportId);
  if (deletePeopleError) throw deletePeopleError;

  if (input.anyoneInjured) {
    const { error } = await supabase.from("report_people").insert({
      id: input.peopleId ?? crypto.randomUUID(),
      report_id: input.reportId,
      organization_id: input.orgId,
      kind: "victim",
      injured_party_type: input.injuredPartyType,
      transported_to_hospital: input.transportedToHospital,
      injury_description: emptyToNull(input.injuryDescription),
    });
    if (error) throw error;
  }

  const damagePayload = {
    report_id: input.reportId,
    organization_id: input.orgId,
    has_damage: input.hasDamage,
    damage_type: input.hasDamage ? input.damageType : null,
    description: input.hasDamage ? emptyToNull(input.damageDescription) : null,
    estimated_cost:
      input.hasDamage && input.estimatedCost.trim() && !Number.isNaN(Number(input.estimatedCost))
        ? Number(input.estimatedCost)
        : null,
  };

  const { error: damageError } = await supabase
    .from("report_property_damage")
    .upsert(damagePayload, { onConflict: "report_id" });
  if (damageError) throw damageError;

  if (input.answers.length > 0) {
    const { error: answersError } = await supabase.from("report_answers").upsert(
      input.answers.map((answer) => ({
        report_id: input.reportId,
        organization_id: input.orgId,
        question_id: answer.questionId,
        value: answer.value,
      })),
      { onConflict: "report_id,question_id" }
    );
    if (answersError) throw answersError;
  }
}
