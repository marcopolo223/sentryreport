import type {
  FormSection,
  Json,
  QuestionFieldType,
} from "@/lib/supabase/types";

export const SYSTEM_QUESTION_KEYS = [
  "incident_type",
  "building",
  "unit",
  "occurred_at",
  "location_detail",
  "police_called",
  "police_department",
  "police_badge",
  "police_case_number",
  "fire_called",
  "fire_department",
  "fire_unit",
  "ems_called",
  "ems_department",
  "ems_responder_id",
  "ems_responder_name",
  "anyone_injured",
  "injured_party_type",
  "transported_to_hospital",
  "injury_description",
  "vehicles_involved",
  "has_property_damage",
  "damage_type",
  "damage_description",
  "estimated_cost",
  "original_summary",
] as const;

export type SystemQuestionKey = (typeof SYSTEM_QUESTION_KEYS)[number];

export const SECTION_LABELS: Record<FormSection, string> = {
  incident_location: "Incident and location",
  emergency_services: "Emergency services",
  victim_injury: "Injury",
  vehicles: "Vehicles",
  property_damage: "Property damage",
  incident_details: "Incident details",
  admin_header: "Report header",
};

export const SECTION_ORDER: FormSection[] = [
  "incident_location",
  "emergency_services",
  "victim_injury",
  "vehicles",
  "property_damage",
  "incident_details",
  "admin_header",
];

/** Wizard step index where extra questions for a section should appear. */
export const STEP_FOR_SECTION: Record<FormSection, number> = {
  incident_location: 1,
  emergency_services: 2,
  victim_injury: 3,
  vehicles: 4,
  property_damage: 5,
  incident_details: 6,
  admin_header: 6,
};

export const FIELD_TYPE_LABELS: Record<QuestionFieldType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  boolean: "Yes / no",
  dropdown: "Dropdown",
  multi_select: "Multi-select",
};

export type QuestionConditionEdge = {
  questionId: string;
  dependsOnQuestionId: string;
};

export function slugifyQuestionKey(label: string) {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 36);
  const suffix = crypto.randomUUID().slice(0, 6);
  return `custom_${base || "field"}_${suffix}`;
}

export function slugifyIncidentType(label: string) {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return base || `type_${crypto.randomUUID().slice(0, 6)}`;
}

export function hasDependencyCycle(
  edges: QuestionConditionEdge[],
  extra?: QuestionConditionEdge
) {
  const graph = new Map<string, string[]>();
  const add = (from: string, to: string) => {
    const list = graph.get(from) ?? [];
    list.push(to);
    graph.set(from, list);
  };
  for (const edge of edges) add(edge.questionId, edge.dependsOnQuestionId);
  if (extra) add(extra.questionId, extra.dependsOnQuestionId);

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(node: string): boolean {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const next of graph.get(node) ?? []) {
      if (dfs(next)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  for (const node of Array.from(graph.keys())) {
    if (dfs(node)) return true;
  }
  return false;
}

export function stringifyAnswer(value: Json | null | undefined): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((item) => stringifyAnswer(item as Json)).join(",");
  }
  return JSON.stringify(value);
}

export function conditionValueMatches(
  actual: Json | null | undefined,
  expected: string
) {
  if (Array.isArray(actual)) {
    return actual.map((item) => stringifyAnswer(item as Json)).includes(expected);
  }
  return stringifyAnswer(actual) === expected;
}

export function isBlankAnswer(value: Json | null | undefined) {
  if (value == null) return true;
  if (value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

export function formatAnswerForDisplay(value: Json | null | undefined): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const asDate = Date.parse(value);
    if (
      /^\d{4}-\d{2}-\d{2}T/.test(value) &&
      !Number.isNaN(asDate)
    ) {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value));
    }
    return value;
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => formatAnswerForDisplay(item as Json))
      .filter((part) => part !== "—");
    return parts.join(", ") || "—";
  }
  return stringifyAnswer(value);
}
