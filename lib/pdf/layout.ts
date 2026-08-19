import { PDF_MARGIN, PDF_PAGE_HEIGHT, type PdfElement, type PdfLayout } from "@/lib/pdf/types";
import type { QuestionFieldType } from "@/lib/supabase/types";

export type LayoutQuestion = {
  question_key: string;
  label: string;
  field_type: QuestionFieldType;
  optionCount: number;
};

function fieldHeight(question: LayoutQuestion) {
  if (question.question_key === "original_summary") return 110;
  if (
    (question.field_type === "dropdown" ||
      question.field_type === "boolean" ||
      question.field_type === "multi_select") &&
    question.optionCount > 0 &&
    question.optionCount <= 12
  ) {
    return 18 + question.optionCount * 12;
  }
  return 28;
}

export function generateDefaultLayout(questions: LayoutQuestion[]): PdfLayout {
  const contentWidth = 523.28;
  const elements: PdfElement[] = [];
  let page = 0;
  let y = PDF_MARGIN;

  const add = (partial: Omit<PdfElement, "id" | "page" | "y">) => {
    if (y + partial.height > PDF_PAGE_HEIGHT - PDF_MARGIN) {
      page += 1;
      y = PDF_MARGIN;
    }
    elements.push({
      ...partial,
      id: crypto.randomUUID(),
      page,
      y,
    });
    y += partial.height + 8;
  };

  add({ type: "logo", x: PDF_MARGIN, width: 72, height: 36 });
  add({ type: "report_meta", x: PDF_MARGIN, width: contentWidth, height: 36 });
  add({ type: "banner", x: PDF_MARGIN, width: contentWidth, height: 48 });
  add({
    type: "bound_field",
    x: PDF_MARGIN,
    width: contentWidth,
    height: 28,
    questionKey: "__writer_name",
  });
  add({
    type: "bound_field",
    x: PDF_MARGIN,
    width: contentWidth,
    height: 28,
    questionKey: "__property_address",
  });

  for (const question of questions) {
    add({
      type: question.question_key === "original_summary" ? "narrative" : "bound_field",
      x: PDF_MARGIN,
      width: contentWidth,
      height: fieldHeight(question),
      questionKey: question.question_key,
    });
    if (question.question_key === "vehicles_involved") {
      add({
        type: "vehicles",
        x: PDF_MARGIN,
        width: contentWidth,
        height: 72,
      });
    }
  }

  add({ type: "photos", x: PDF_MARGIN, width: contentWidth, height: 160 });
  add({ type: "signatures", x: PDF_MARGIN, width: contentWidth, height: 84 });

  return { version: 1, elements };
}
