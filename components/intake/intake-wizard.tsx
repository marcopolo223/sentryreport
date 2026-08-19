"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";

import { discardDraftReport, deleteReport, finalizeReport, submitReport } from "@/app/actions/reports";
import {
  ChoiceTile,
  ColorSwatches,
  YesNoToggle,
} from "@/components/intake/choice-controls";
import {
  ExtraQuestions,
  extraRequiredMessage,
} from "@/components/intake/extra-questions";
import { MediaAttach } from "@/components/intake/media-attach";
import { SignaturePad } from "@/components/intake/signature-pad";
import { ExportReportButton } from "@/components/reports/export-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WindowFrame } from "@/components/reports/window-frame";
import {
  DAMAGE_TYPE_OPTIONS,
  INJURED_PARTY_OPTIONS,
  VEHICLE_COLORS,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/intake";
import { createClient } from "@/lib/supabase/client";
import { saveDraft, type DraftAgency, type DraftVehicle } from "@/lib/save-draft";
import type {
  DamageType,
  InjuredPartyType,
  Json,
  Tables,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "What happened?", hint: "Choose the closest incident type." },
  { title: "Where did this happen?", hint: "Building, time, and a short location." },
  { title: "Emergency services", hint: "Toggles and follow-ups stay on this step." },
  { title: "Was anyone injured?", hint: "Follow-up fields appear if you answer yes." },
  { title: "Were vehicles involved?", hint: "Add each vehicle with color swatches." },
  { title: "Property damage", hint: "Skip extra typing unless there was damage." },
  { title: "Details and attachments", hint: "Narrative, writer, address, photos, video." },
  { title: "Sign and submit", hint: "Signature locks this report from further officer edits." },
];

function clampStep(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(STEPS.length - 1, Math.max(0, Math.floor(value)));
}

function writeStepToUrl(index: number) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("step", String(index));
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

export type IntakeWizardProps = {
  report: Tables<"reports">;
  orgId: string;
  userId: string;
  error?: string;
  incidentTypes: Tables<"org_incident_types">[];
  buildings: Tables<"buildings">[];
  units: Tables<"building_units">[];
  questions: Tables<"org_questions">[];
  options: Tables<"org_question_options">[];
  conditions: Tables<"org_question_conditions">[];
  initialAnswers?: { questionId: string; value: Json | null }[];
  agencies: Tables<"report_agencies">[];
  vehicles: Tables<"report_vehicles">[];
  people: Tables<"report_people">[];
  damage: Tables<"report_property_damage"> | null;
  media: Tables<"report_media">[];
  videoSeconds: number;
  buildingRequired: boolean;
  mode?: "intake" | "review";
  initialStep?: number;
};

function asAgency(
  rows: Tables<"report_agencies">[],
  kind: DraftAgency["kind"]
): DraftAgency {
  const row = rows.find((item) => item.kind === kind);
  return {
    id: row?.id ?? "",
    kind,
    involved: row?.involved ?? false,
    department: row?.department ?? "",
    responder_id: row?.responder_id ?? "",
    responder_name: row?.responder_name ?? "",
    case_number: row?.case_number ?? "",
  };
}

export function IntakeWizard({
  report,
  orgId,
  userId,
  error,
  incidentTypes,
  buildings,
  units,
  questions,
  options,
  conditions,
  initialAnswers = [],
  agencies,
  vehicles,
  people,
  damage,
  media,
  videoSeconds,
  buildingRequired,
  mode = "intake",
  initialStep = 0,
}: IntakeWizardProps) {
  const [step, setStep] = useState(() => clampStep(initialStep));
  const [incidentTypeId, setIncidentTypeId] = useState(report.incident_type_id);
  const [buildingId, setBuildingId] = useState(report.building_id);
  const [unitId, setUnitId] = useState(report.unit_id);
  const [locationDetail, setLocationDetail] = useState(report.location_detail ?? "");
  const [occurredAt, setOccurredAt] = useState(report.occurred_at);
  const [police, setPolice] = useState(() => asAgency(agencies, "police"));
  const [fire, setFire] = useState(() => asAgency(agencies, "fire"));
  const [ems, setEms] = useState(() => asAgency(agencies, "fire_rescue"));
  const [anyoneInjured, setAnyoneInjured] = useState(people.length > 0);
  const [injuredPartyType, setInjuredPartyType] = useState<InjuredPartyType | null>(
    people[0]?.injured_party_type ?? null
  );
  const [transported, setTransported] = useState(
    people[0]?.transported_to_hospital ?? false
  );
  const [injuryDescription, setInjuryDescription] = useState(
    people[0]?.injury_description ?? ""
  );
  const [peopleId] = useState(() => people[0]?.id ?? crypto.randomUUID());
  const [vehiclesInvolved, setVehiclesInvolved] = useState(vehicles.length > 0);
  const [vehicleRows, setVehicleRows] = useState<DraftVehicle[]>(() =>
    vehicles.map((row) => ({
      id: row.id,
      make_model: row.make_model ?? "",
      color: row.color ?? "",
      license_plate: row.license_plate ?? "",
      driver_name: row.driver_name ?? "",
    }))
  );
  const [hasDamage, setHasDamage] = useState(damage?.has_damage ?? false);
  const [damageType, setDamageType] = useState<DamageType | null>(
    damage?.damage_type ?? null
  );
  const [damageDescription, setDamageDescription] = useState(
    damage?.description ?? ""
  );
  const [estimatedCost, setEstimatedCost] = useState(
    damage?.estimated_cost != null ? String(damage.estimated_cost) : ""
  );
  const [originalSummary, setOriginalSummary] = useState(
    report.original_summary ?? ""
  );
  const [writerName, setWriterName] = useState(report.writer_name ?? "");
  const [propertyAddress, setPropertyAddress] = useState(
    report.property_address ?? ""
  );
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [customAnswers, setCustomAnswers] = useState<Record<string, Json | null>>(
    () => {
      const initial: Record<string, Json | null> = {};
      for (const answer of initialAnswers) {
        const question = questions.find((item) => item.id === answer.questionId);
        if (question && !question.is_default) {
          initial[question.id] = answer.value;
        }
      }
      return initial;
    }
  );
  const [formError, setFormError] = useState(error ?? "");
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const persistRef = useRef<() => Promise<void>>(async () => {});

  const unitsForBuilding = useMemo(
    () => units.filter((unit) => unit.building_id === buildingId && unit.is_active),
    [units, buildingId]
  );

  const buildAnswers = useCallback((): { questionId: string; value: Json | null }[] => {
    const incidentSlug =
      incidentTypes.find((item) => item.id === incidentTypeId)?.slug ?? null;
    const values: Record<string, Json | null> = {
      incident_type: incidentSlug,
      building: buildingId,
      unit: unitId,
      occurred_at: occurredAt,
      location_detail: locationDetail || null,
      police_called: police.involved,
      police_department: police.department || null,
      police_badge: police.responder_id || null,
      police_case_number: police.case_number || null,
      fire_called: fire.involved,
      fire_department: fire.department || null,
      fire_unit: fire.responder_id || null,
      ems_called: ems.involved,
      ems_department: ems.department || null,
      ems_responder_id: ems.responder_id || null,
      ems_responder_name: ems.responder_name || null,
      anyone_injured: anyoneInjured,
      injured_party_type: injuredPartyType,
      transported_to_hospital: transported,
      injury_description: injuryDescription || null,
      vehicles_involved: vehiclesInvolved,
      has_property_damage: hasDamage,
      damage_type: damageType,
      damage_description: damageDescription || null,
      estimated_cost: estimatedCost ? Number(estimatedCost) : null,
      original_summary: originalSummary || null,
    };

    return questions
      .filter((question) => question.is_active)
      .map((question) => ({
        questionId: question.id,
        value: question.is_default
          ? (values[question.question_key] ?? null)
          : (customAnswers[question.id] ?? null),
      }));
  }, [
    anyoneInjured,
    buildingId,
    customAnswers,
    damageDescription,
    damageType,
    ems,
    estimatedCost,
    fire,
    hasDamage,
    incidentTypeId,
    incidentTypes,
    injuredPartyType,
    injuryDescription,
    locationDetail,
    occurredAt,
    originalSummary,
    police,
    questions,
    transported,
    unitId,
    vehiclesInvolved,
  ]);

  const valueByQuestionId = useMemo(() => {
    const map: Record<string, Json | null> = {};
    for (const answer of buildAnswers()) map[answer.questionId] = answer.value;
    return map;
  }, [buildAnswers]);

  const persist = useCallback(async () => {
    setSaveState("saving");
    try {
      await saveDraft({
        reportId: report.id,
        orgId,
        incidentTypeId,
        buildingId,
        unitId,
        locationDetail,
        occurredAt,
        originalSummary,
        writerName,
        propertyAddress,
        agencies: [police, fire, ems].filter((row) => row.id),
        vehiclesInvolved,
        vehicles: vehicleRows,
        anyoneInjured,
        injuredPartyType,
        transportedToHospital: transported,
        injuryDescription,
        peopleId,
        hasDamage,
        damageType,
        damageDescription,
        estimatedCost,
        answers: buildAnswers(),
      });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [
    anyoneInjured,
    buildingId,
    buildAnswers,
    damageDescription,
    damageType,
    ems,
    estimatedCost,
    fire,
    hasDamage,
    incidentTypeId,
    injuredPartyType,
    injuryDescription,
    locationDetail,
    occurredAt,
    orgId,
    originalSummary,
    peopleId,
    police,
    propertyAddress,
    report.id,
    transported,
    unitId,
    vehicleRows,
    vehiclesInvolved,
    writerName,
  ]);

  persistRef.current = persist;

  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void persistRef.current();
    }, 500);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [
    anyoneInjured,
    buildingId,
    customAnswers,
    damageDescription,
    damageType,
    ems,
    estimatedCost,
    fire,
    hasDamage,
    incidentTypeId,
    injuredPartyType,
    injuryDescription,
    locationDetail,
    occurredAt,
    originalSummary,
    police,
    propertyAddress,
    transported,
    unitId,
    vehicleRows,
    vehiclesInvolved,
    writerName,
  ]);

  function validateStep(index: number) {
    if (index === 0 && !incidentTypeId) return "Choose an incident type.";
    if (index === 1) {
      if (buildingRequired && !buildingId) return "Choose a building.";
      if (!occurredAt) return "Set when this happened.";
    }
    if (index === 6 && !originalSummary.trim()) {
      return "Describe what happened.";
    }
    return extraRequiredMessage(index, questions, conditions, valueByQuestionId);
  }

  async function goNext() {
    const message = validateStep(step);
    if (message) {
      setFormError(message);
      return;
    }
    setFormError("");
    await persist();
    const next = Math.min(step + 1, STEPS.length - 1);
    setStep(next);
    writeStepToUrl(next);
  }

  async function onSubmit() {
    const earlier = [0, 1, 6].map(validateStep).find(Boolean);
    if (earlier) {
      setFormError(earlier);
      return;
    }
    if (!signatureDataUrl) {
      setFormError("Sign before submitting.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      await persist();
      const supabase = createClient();
      const blob = await (await fetch(signatureDataUrl)).blob();
      const path = `${orgId}/${report.id}/officer-signature.png`;
      const { error: uploadError } = await supabase.storage
        .from("report-media")
        .upload(path, blob, { contentType: "image/png", upsert: true });
      if (uploadError) throw uploadError;
    } catch (err) {
      setSubmitting(false);
      setFormError(err instanceof Error ? err.message : "Could not submit.");
      return;
    }

    await submitReport(report.id, `${orgId}/${report.id}/officer-signature.png`);
  }

  async function onFinalize() {
    const earlier = [0, 1, 6].map(validateStep).find(Boolean);
    if (earlier) {
      setFormError(earlier);
      return;
    }
    if (!signatureDataUrl) {
      setFormError("Sign before finalizing.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      await persist();
      const supabase = createClient();
      const blob = await (await fetch(signatureDataUrl)).blob();
      const path = `${orgId}/${report.id}/admin-signature.png`;
      const { error: uploadError } = await supabase.storage
        .from("report-media")
        .upload(path, blob, { contentType: "image/png", upsert: true });
      if (uploadError) throw uploadError;
    } catch (err) {
      setSubmitting(false);
      setFormError(err instanceof Error ? err.message : "Could not finalize.");
      return;
    }

    await finalizeReport(report.id, `${orgId}/${report.id}/admin-signature.png`);
  }

  const review = mode === "review";
  const show = (index: number) => review || step === index;

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;
  const unitsVisible = unitsForBuilding.length > 0;

  return (
    <div className={cn("mx-auto w-full min-w-0", review ? "max-w-2xl" : "max-w-lg")}>
      <WindowFrame
        title={
          review
            ? `Review · ${report.report_number}`
            : `New report · ${report.report_number}`
        }
        trailing={
          review ? (
            <div className="flex items-center gap-2">
              <ExportReportButton
                reportId={report.id}
                reportNumber={report.report_number}
              />
              <span className="shrink-0 text-[10px] font-medium capitalize text-primary">
                {report.status}
              </span>
            </div>
          ) : (
            <span className="shrink-0 text-[10px] font-medium text-primary">
              {step + 1} / {STEPS.length}
            </span>
          )
        }
      >
        {!review && (
          <div className="px-4 pt-4">
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {saveState === "saving"
                  ? "Saving"
                  : saveState === "error"
                    ? "Couldn’t save"
                    : saveState === "saved"
                      ? "Saved"
                      : "Draft"}
              </p>
              <button
                type="button"
                className="text-[10px] font-medium text-muted-foreground hover:text-destructive"
                onClick={() => {
                  if (window.confirm("Discard this draft? This cannot be undone.")) {
                    void discardDraftReport(report.id);
                  }
                }}
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {review && (
          <div className="flex items-center justify-between gap-2 px-4 pt-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {saveState === "saving"
                ? "Saving"
                : saveState === "error"
                  ? "Couldn’t save"
                  : saveState === "saved"
                    ? "Saved"
                    : "Submitted"}
            </p>
            <button
              type="button"
              className="text-[10px] font-medium text-muted-foreground hover:text-destructive"
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${report.report_number}? This submitted report cannot be recovered.`
                  )
                ) {
                  void deleteReport(report.id);
                }
              }}
            >
              Delete
            </button>
          </div>
        )}

        <div className="flex flex-col px-4 py-4">
          {!review && (
            <>
              <p className="text-sm font-semibold leading-snug text-foreground">
                {current.title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{current.hint}</p>
            </>
          )}

          {formError && <Alert className="mt-3">{formError}</Alert>}

          <div className={cn("space-y-4", review ? "mt-2" : "mt-4")}>
            <SectionBlock index={0} active={show(0)} review={review}>
              <div className="flex flex-col gap-2">
                {incidentTypes.map((type) => (
                  <ChoiceTile
                    key={type.id}
                    selected={incidentTypeId === type.id}
                    onClick={() => setIncidentTypeId(type.id)}
                  >
                    {type.label}
                  </ChoiceTile>
                ))}
              </div>
            </SectionBlock>

            <SectionBlock index={1} active={show(1)} review={review}>
              <>
                <div className="flex flex-col gap-2">
                  {buildings.map((building) => (
                    <ChoiceTile
                      key={building.id}
                      selected={buildingId === building.id}
                      onClick={() => {
                        setBuildingId(building.id);
                        setUnitId(null);
                      }}
                    >
                      {building.name}
                    </ChoiceTile>
                  ))}
                </div>
                {unitsVisible && (
                  <div>
                    <Label>Unit</Label>
                    <div className="mt-1.5 flex flex-col gap-2">
                      {unitsForBuilding.map((unit) => (
                        <ChoiceTile
                          key={unit.id}
                          selected={unitId === unit.id}
                          onClick={() => setUnitId(unit.id)}
                        >
                          {unit.label || unit.unit_number}
                        </ChoiceTile>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label htmlFor="occurredAt">Date and time</Label>
                  <Input
                    id="occurredAt"
                    type="datetime-local"
                    value={toDatetimeLocalValue(occurredAt)}
                    onChange={(event) =>
                      setOccurredAt(fromDatetimeLocalValue(event.target.value))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="locationDetail">Location detail</Label>
                  <Input
                    id="locationDetail"
                    value={locationDetail}
                    onChange={(event) => setLocationDetail(event.target.value)}
                    placeholder="Pool deck, garage level two…"
                  />
                </div>
                <ExtraQuestions
                  section="incident_location"
                  questions={questions}
                  options={options}
                  conditions={conditions}
                  valueByQuestionId={valueByQuestionId}
                  onChange={(questionId, value) =>
                    setCustomAnswers((current) => ({ ...current, [questionId]: value }))
                  }
                />
              </>
            </SectionBlock>

            <SectionBlock index={2} active={show(2)} review={review}>
              <div className="space-y-5">
                <AgencyBlock
                  title="Police"
                  agency={police}
                  onChange={setPolice}
                  showCase
                  showName={false}
                  idLabel="Badge / officer ID"
                />
                <AgencyBlock
                  title="Fire"
                  agency={fire}
                  onChange={setFire}
                  showCase={false}
                  showName={false}
                  idLabel="Unit / truck ID"
                />
                <AgencyBlock
                  title="Fire rescue / EMS"
                  agency={ems}
                  onChange={setEms}
                  showCase={false}
                  showName
                  idLabel="Responder ID"
                />
                <ExtraQuestions
                  section="emergency_services"
                  questions={questions}
                  options={options}
                  conditions={conditions}
                  valueByQuestionId={valueByQuestionId}
                  onChange={(questionId, value) =>
                    setCustomAnswers((current) => ({ ...current, [questionId]: value }))
                  }
                />
              </div>
            </SectionBlock>

            <SectionBlock index={3} active={show(3)} review={review}>
              <div className="space-y-4">
                <YesNoToggle value={anyoneInjured} onChange={setAnyoneInjured} />
                {anyoneInjured && (
                  <>
                    <div>
                      <Label>Injured party</Label>
                      <div className="mt-1.5 flex flex-col gap-2">
                        {INJURED_PARTY_OPTIONS.map((option) => (
                          <ChoiceTile
                            key={option.value}
                            selected={injuredPartyType === option.value}
                            onClick={() => setInjuredPartyType(option.value)}
                          >
                            {option.label}
                          </ChoiceTile>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Transported to hospital?</Label>
                      <div className="mt-1.5">
                        <YesNoToggle value={transported} onChange={setTransported} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="injuryDescription">Injury description</Label>
                      <Input
                        id="injuryDescription"
                        value={injuryDescription}
                        onChange={(event) => setInjuryDescription(event.target.value)}
                      />
                    </div>
                  </>
                )}
                <ExtraQuestions
                  section="victim_injury"
                  questions={questions}
                  options={options}
                  conditions={conditions}
                  valueByQuestionId={valueByQuestionId}
                  onChange={(questionId, value) =>
                    setCustomAnswers((current) => ({ ...current, [questionId]: value }))
                  }
                />
              </div>
            </SectionBlock>

            <SectionBlock index={4} active={show(4)} review={review}>
              <div className="space-y-4">
                <YesNoToggle
                  value={vehiclesInvolved}
                  onChange={(next) => {
                    setVehiclesInvolved(next);
                    if (next && vehicleRows.length === 0) {
                      setVehicleRows([emptyVehicle()]);
                    }
                  }}
                />
                {vehiclesInvolved && (
                  <div className="space-y-4">
                    {vehicleRows.map((vehicle, index) => (
                      <div
                        key={vehicle.id}
                        className="space-y-3 rounded-md border border-border p-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Vehicle {index + 1}
                          </p>
                          {vehicleRows.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Remove vehicle"
                              onClick={() =>
                                setVehicleRows((rows) =>
                                  rows.filter((row) => row.id !== vehicle.id)
                                )
                              }
                            >
                              <X />
                            </Button>
                          )}
                        </div>
                        <div>
                          <Label>Color</Label>
                          <div className="mt-1.5">
                            <ColorSwatches
                              value={vehicle.color || null}
                              colors={VEHICLE_COLORS}
                              onChange={(color) =>
                                setVehicleRows((rows) =>
                                  rows.map((row) =>
                                    row.id === vehicle.id ? { ...row, color } : row
                                  )
                                )
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Make and model</Label>
                          <Input
                            value={vehicle.make_model}
                            onChange={(event) =>
                              setVehicleRows((rows) =>
                                rows.map((row) =>
                                  row.id === vehicle.id
                                    ? { ...row, make_model: event.target.value }
                                    : row
                                )
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label>License plate</Label>
                          <Input
                            value={vehicle.license_plate}
                            autoCapitalize="characters"
                            onChange={(event) =>
                              setVehicleRows((rows) =>
                                rows.map((row) =>
                                  row.id === vehicle.id
                                    ? { ...row, license_plate: event.target.value }
                                    : row
                                )
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label>Driver name</Label>
                          <Input
                            value={vehicle.driver_name}
                            onChange={(event) =>
                              setVehicleRows((rows) =>
                                rows.map((row) =>
                                  row.id === vehicle.id
                                    ? { ...row, driver_name: event.target.value }
                                    : row
                                )
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setVehicleRows((rows) => [...rows, emptyVehicle()])
                      }
                    >
                      <Plus />
                      Add vehicle
                    </Button>
                  </div>
                )}
                <ExtraQuestions
                  section="vehicles"
                  questions={questions}
                  options={options}
                  conditions={conditions}
                  valueByQuestionId={valueByQuestionId}
                  onChange={(questionId, value) =>
                    setCustomAnswers((current) => ({ ...current, [questionId]: value }))
                  }
                />
              </div>
            </SectionBlock>

            <SectionBlock index={5} active={show(5)} review={review}>
              <div className="space-y-4">
                <YesNoToggle value={hasDamage} onChange={setHasDamage} />
                {hasDamage && (
                  <>
                    <div className="flex flex-col gap-2">
                      {DAMAGE_TYPE_OPTIONS.map((option) => (
                        <ChoiceTile
                          key={option.value}
                          selected={damageType === option.value}
                          onClick={() => setDamageType(option.value)}
                        >
                          {option.label}
                        </ChoiceTile>
                      ))}
                    </div>
                    <div>
                      <Label htmlFor="damageDescription">Description</Label>
                      <Input
                        id="damageDescription"
                        value={damageDescription}
                        onChange={(event) => setDamageDescription(event.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="estimatedCost">Estimated cost (optional)</Label>
                      <Input
                        id="estimatedCost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={estimatedCost}
                        onChange={(event) => setEstimatedCost(event.target.value)}
                      />
                    </div>
                  </>
                )}
                <ExtraQuestions
                  section="property_damage"
                  questions={questions}
                  options={options}
                  conditions={conditions}
                  valueByQuestionId={valueByQuestionId}
                  onChange={(questionId, value) =>
                    setCustomAnswers((current) => ({ ...current, [questionId]: value }))
                  }
                />
              </div>
            </SectionBlock>

            <SectionBlock index={6} active={show(6)} review={review}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="originalSummary">What happened?</Label>
                  <Textarea
                    id="originalSummary"
                    value={originalSummary}
                    onChange={(event) => setOriginalSummary(event.target.value)}
                    placeholder="Write the incident details."
                  />
                </div>
                <MediaAttach
                  orgId={orgId}
                  reportId={report.id}
                  userId={userId}
                  videoSeconds={videoSeconds}
                  initialItems={media}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="writerName">Report writer</Label>
                    <Input
                      id="writerName"
                      value={writerName}
                      onChange={(event) => setWriterName(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="propertyAddress">Property address</Label>
                    <Input
                      id="propertyAddress"
                      value={propertyAddress}
                      onChange={(event) => setPropertyAddress(event.target.value)}
                    />
                  </div>
                </div>
                <ExtraQuestions
                  section="incident_details"
                  questions={questions}
                  options={options}
                  conditions={conditions}
                  valueByQuestionId={valueByQuestionId}
                  onChange={(questionId, value) =>
                    setCustomAnswers((current) => ({ ...current, [questionId]: value }))
                  }
                />
                <ExtraQuestions
                  section="admin_header"
                  questions={questions}
                  options={options}
                  conditions={conditions}
                  valueByQuestionId={valueByQuestionId}
                  onChange={(questionId, value) =>
                    setCustomAnswers((current) => ({ ...current, [questionId]: value }))
                  }
                />
              </div>
            </SectionBlock>

            <SectionBlock index={7} active={!review && step === 7} review={false}>
              <SignaturePad onChange={setSignatureDataUrl} disabled={submitting} />
            </SectionBlock>
          </div>

          {review ? (
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-sm font-semibold">Sign to finalize</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Finalizing locks the report. Amendments can be added later.
                </p>
              </div>
              <SignaturePad onChange={setSignatureDataUrl} disabled={submitting} />
              <Button
                type="button"
                className="w-full"
                disabled={submitting}
                onClick={() => void onFinalize()}
              >
                {submitting ? "Finalizing…" : "Finalize report"}
              </Button>
            </div>
          ) : (
          <div className="mt-6 flex gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setFormError("");
                  const next = Math.max(step - 1, 0);
                  setStep(next);
                  writeStepToUrl(next);
                }}
              >
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                className={cn("flex-1", step === 0 && "w-full")}
                onClick={() => void goNext()}
              >
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                className="flex-1"
                disabled={submitting}
                onClick={() => void onSubmit()}
              >
                {submitting ? "Submitting…" : "Submit report"}
              </Button>
            )}
          </div>
          )}
        </div>
      </WindowFrame>
    </div>
  );
}

function emptyVehicle(): DraftVehicle {
  return {
    id: crypto.randomUUID(),
    make_model: "",
    color: "",
    license_plate: "",
    driver_name: "",
  };
}

function SectionBlock({
  index,
  active,
  review,
  children,
}: {
  index: number;
  active: boolean;
  review: boolean;
  children: ReactNode;
}) {
  if (!active) return null;
  if (!review) return children;
  return (
    <section className="space-y-4 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <div>
        <p className="text-sm font-semibold">{STEPS[index].title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{STEPS[index].hint}</p>
      </div>
      {children}
    </section>
  );
}

function AgencyBlock({
  title,
  agency,
  onChange,
  showCase,
  showName,
  idLabel,
}: {
  title: string;
  agency: DraftAgency;
  onChange: (next: DraftAgency) => void;
  showCase: boolean;
  showName: boolean;
  idLabel: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{title} called?</p>
      <YesNoToggle
        value={agency.involved}
        onChange={(involved) => onChange({ ...agency, involved })}
      />
      {agency.involved && (
        <div className="space-y-3">
          <div>
            <Label>Department</Label>
            <Input
              value={agency.department}
              onChange={(event) =>
                onChange({ ...agency, department: event.target.value })
              }
            />
          </div>
          <div>
            <Label>{idLabel}</Label>
            <Input
              value={agency.responder_id}
              onChange={(event) =>
                onChange({ ...agency, responder_id: event.target.value })
              }
            />
          </div>
          {showName && (
            <div>
              <Label>Responder name</Label>
              <Input
                value={agency.responder_name}
                onChange={(event) =>
                  onChange({ ...agency, responder_name: event.target.value })
                }
              />
            </div>
          )}
          {showCase && (
            <div>
              <Label>Case number</Label>
              <Input
                value={agency.case_number}
                onChange={(event) =>
                  onChange({ ...agency, case_number: event.target.value })
                }
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
