"use client";

import { ChoiceTile, YesNoToggle } from "@/components/intake/choice-controls";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/intake";
import {
  conditionValueMatches,
  isBlankAnswer,
  STEP_FOR_SECTION,
} from "@/lib/questions";
import type {
  FormSection,
  Json,
  Tables,
} from "@/lib/supabase/types";

export function extraRequiredMessage(
  step: number,
  questions: Tables<"org_questions">[],
  conditions: Tables<"org_question_conditions">[],
  valueByQuestionId: Record<string, Json | null>
) {
  for (const question of questions) {
    if (question.is_default || !question.is_active || !question.required) continue;
    if (STEP_FOR_SECTION[question.section] !== step) continue;
    if (!isQuestionVisible(question, conditions, valueByQuestionId)) continue;
    if (isBlankAnswer(valueByQuestionId[question.id])) {
      return `Fill in ${question.label}.`;
    }
  }
  return null;
}

function isQuestionVisible(
  question: Tables<"org_questions">,
  conditions: Tables<"org_question_conditions">[],
  valueByQuestionId: Record<string, Json | null>
) {
  const deps = conditions.filter((row) => row.question_id === question.id);
  if (deps.length === 0) return true;
  return deps.every((row) =>
    conditionValueMatches(valueByQuestionId[row.depends_on_question_id], row.expected_value)
  );
}

export function ExtraQuestions({
  section,
  questions,
  options,
  conditions,
  valueByQuestionId,
  onChange,
}: {
  section: FormSection;
  questions: Tables<"org_questions">[];
  options: Tables<"org_question_options">[];
  conditions: Tables<"org_question_conditions">[];
  valueByQuestionId: Record<string, Json | null>;
  onChange: (questionId: string, value: Json | null) => void;
}) {
  const extras = questions.filter(
    (question) =>
      question.is_active &&
      !question.is_default &&
      question.section === section &&
      isQuestionVisible(question, conditions, valueByQuestionId)
  );
  if (extras.length === 0) return null;

  return (
    <div className="space-y-4">
      {extras.map((question) => (
        <ExtraField
          key={question.id}
          question={question}
          options={options.filter((row) => row.question_id === question.id)}
          value={valueByQuestionId[question.id] ?? null}
          onChange={(value) => onChange(question.id, value)}
        />
      ))}
    </div>
  );
}

function ExtraField({
  question,
  options,
  value,
  onChange,
}: {
  question: Tables<"org_questions">;
  options: Tables<"org_question_options">[];
  value: Json | null;
  onChange: (value: Json | null) => void;
}) {
  if (question.field_type === "boolean") {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{question.label}</p>
        <YesNoToggle
          value={value === true}
          onChange={onChange}
        />
      </div>
    );
  }

  if (question.field_type === "dropdown") {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{question.label}</p>
        <div className="flex flex-col gap-2">
          {options.map((option) => (
            <ChoiceTile
              key={option.id}
              selected={value === option.value}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </ChoiceTile>
          ))}
        </div>
      </div>
    );
  }

  if (question.field_type === "multi_select") {
    const selected = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{question.label}</p>
        <div className="flex flex-col gap-2">
          {options.map((option) => {
            const on = selected.includes(option.value);
            return (
              <ChoiceTile
                key={option.id}
                selected={on}
                onClick={() =>
                  onChange(
                    on
                      ? selected.filter((item) => item !== option.value)
                      : [...selected, option.value]
                  )
                }
              >
                {option.label}
              </ChoiceTile>
            );
          })}
        </div>
      </div>
    );
  }

  if (question.field_type === "date") {
    return (
      <div>
        <Label htmlFor={question.id}>{question.label}</Label>
        <Input
          id={question.id}
          type="datetime-local"
          value={typeof value === "string" ? toDatetimeLocalValue(value) : ""}
          onChange={(event) => onChange(fromDatetimeLocalValue(event.target.value))}
        />
      </div>
    );
  }

  if (question.field_type === "number") {
    return (
      <div>
        <Label htmlFor={question.id}>{question.label}</Label>
        <Input
          id={question.id}
          type="number"
          value={typeof value === "number" ? String(value) : value == null ? "" : String(value)}
          onChange={(event) => {
            const next = event.target.value;
            onChange(next === "" ? null : Number(next));
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor={question.id}>{question.label}</Label>
      {question.question_key.includes("notes") || question.label.length > 40 ? (
        <Textarea
          id={question.id}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value || null)}
        />
      ) : (
        <Input
          id={question.id}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value || null)}
        />
      )}
    </div>
  );
}
