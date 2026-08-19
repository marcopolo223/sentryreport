"use client";

import {
  addIncidentType,
  addQuestion,
  deactivateIncidentType,
  deactivateQuestion,
  moveQuestion,
  saveQuestion,
  updateIncidentType,
} from "@/app/actions/questions";
import { WindowFrame } from "@/components/reports/window-frame";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FIELD_TYPE_LABELS,
  SECTION_LABELS,
  SECTION_ORDER,
} from "@/lib/questions";
import type {
  FormSection,
  QuestionFieldType,
  Tables,
} from "@/lib/supabase/types";

const CUSTOM_TYPES: QuestionFieldType[] = [
  "text",
  "number",
  "date",
  "boolean",
  "dropdown",
  "multi_select",
];

export function QuestionBuilder({
  incidentTypes,
  questions,
  options,
  conditions,
  error,
}: {
  incidentTypes: Tables<"org_incident_types">[];
  questions: Tables<"org_questions">[];
  options: Tables<"org_question_options">[];
  conditions: Tables<"org_question_conditions">[];
  error?: string;
}) {
  return (
    <div className="min-w-0 space-y-6">
      {error && <Alert>{error}</Alert>}

      <WindowFrame title="Incident types">
        <div className="space-y-3 p-4">
          {incidentTypes.map((type) => (
            <form
              key={type.id}
              action={updateIncidentType}
              className="flex min-w-0 flex-col gap-2 sm:flex-row"
            >
              <input type="hidden" name="id" value={type.id} />
              <Input name="label" defaultValue={type.label} required />
              <div className="flex gap-2">
                <Button type="submit" variant="outline" size="sm">
                  Save
                </Button>
                <Button
                  type="submit"
                  formAction={deactivateIncidentType}
                  variant="ghost"
                  size="sm"
                >
                  Remove
                </Button>
              </div>
            </form>
          ))}
          <form action={addIncidentType} className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <Input name="label" placeholder="Add an incident type" required />
            <Button type="submit" variant="outline">
              Add
            </Button>
          </form>
        </div>
      </WindowFrame>

      {SECTION_ORDER.map((section) => {
        const rows = questions
          .filter((question) => question.section === section)
          .sort((a, b) => a.display_order - b.display_order);
        return (
          <WindowFrame key={section} title={SECTION_LABELS[section]}>
            <div className="space-y-4 p-4">
              {rows.map((question) => (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  questions={questions}
                  options={options.filter((row) => row.question_id === question.id)}
                  condition={
                    conditions.find((row) => row.question_id === question.id) ?? null
                  }
                />
              ))}
              <AddQuestionForm section={section} />
            </div>
          </WindowFrame>
        );
      })}
    </div>
  );
}

function QuestionEditor({
  question,
  questions,
  options,
  condition,
}: {
  question: Tables<"org_questions">;
  questions: Tables<"org_questions">[];
  options: Tables<"org_question_options">[];
  condition: Tables<"org_question_conditions"> | null;
}) {
  const showOptions =
    !question.is_default &&
    (question.field_type === "dropdown" || question.field_type === "multi_select");
  const others = questions.filter((row) => row.id !== question.id);

  return (
    <form action={saveQuestion} className="space-y-3 rounded-md border border-border p-3">
      <input type="hidden" name="questionId" value={question.id} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {question.is_default ? "Default" : "Custom"} · {FIELD_TYPE_LABELS[question.field_type]}
        </p>
        <div className="flex gap-1">
          <Button type="submit" name="direction" value="up" formAction={moveQuestion} variant="ghost" size="sm">
            Up
          </Button>
          <Button type="submit" name="direction" value="down" formAction={moveQuestion} variant="ghost" size="sm">
            Down
          </Button>
        </div>
      </div>
      <div>
        <Label htmlFor={`label-${question.id}`}>Label</Label>
        <Input id={`label-${question.id}`} name="label" defaultValue={question.label} required />
      </div>
      {!question.is_default && (
        <div>
          <Label htmlFor={`type-${question.id}`}>Type</Label>
          <select
            id={`type-${question.id}`}
            name="fieldType"
            defaultValue={question.field_type}
            className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {CUSTOM_TYPES.map((type) => (
              <option key={type} value={type}>
                {FIELD_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
      )}
      {question.is_default && <input type="hidden" name="fieldType" value={question.field_type} />}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="required"
          defaultChecked={question.required}
          className="size-4 rounded border-input"
        />
        Required
      </label>
      {showOptions && (
        <div>
          <Label htmlFor={`options-${question.id}`}>Options (one per line)</Label>
          <Textarea
            id={`options-${question.id}`}
            name="options"
            defaultValue={options.map((row) => row.label).join("\n")}
          />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`depends-${question.id}`}>Show only if</Label>
          <select
            id={`depends-${question.id}`}
            name="dependsOn"
            defaultValue={condition?.depends_on_question_id ?? ""}
            className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Always visible</option>
            {others.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor={`expected-${question.id}`}>Equals</Label>
          <Input
            id={`expected-${question.id}`}
            name="expectedValue"
            defaultValue={condition?.expected_value ?? "true"}
            placeholder="true"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm">
          Save
        </Button>
        {!question.is_default && (
          <Button type="submit" formAction={deactivateQuestion} variant="ghost" size="sm">
            Remove
          </Button>
        )}
      </div>
    </form>
  );
}

function AddQuestionForm({ section }: { section: FormSection }) {
  return (
    <form action={addQuestion} className="space-y-3 rounded-md border border-dashed border-border p-3">
      <input type="hidden" name="section" value={section} />
      <p className="text-sm font-medium">Add a question</p>
      <Input name="label" placeholder="Question label" required />
      <select
        name="fieldType"
        defaultValue="text"
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        {CUSTOM_TYPES.map((type) => (
          <option key={type} value={type}>
            {FIELD_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="required" className="size-4 rounded border-input" />
        Required
      </label>
      <Textarea name="options" placeholder="Dropdown / multi-select options, one per line" />
      <Button type="submit" variant="outline">
        Add question
      </Button>
    </form>
  );
}
