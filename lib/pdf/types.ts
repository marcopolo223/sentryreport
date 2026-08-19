import type { Json } from "@/lib/supabase/types";

export const PDF_PAGE_WIDTH = 595.28;
export const PDF_PAGE_HEIGHT = 841.89;
export const PDF_MARGIN = 36;

export type PdfElementType =
  | "logo"
  | "banner"
  | "static_text"
  | "divider"
  | "page_break"
  | "bound_field"
  | "narrative"
  | "photos"
  | "signatures"
  | "vehicles"
  | "report_meta";

export type PdfElement = {
  id: string;
  type: PdfElementType;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  questionKey?: string;
  text?: string;
  fontSize?: number;
};

export type PdfLayout = {
  version: 1;
  elements: PdfElement[];
};

const ELEMENT_TYPES = new Set<PdfElementType>([
  "logo",
  "banner",
  "static_text",
  "divider",
  "page_break",
  "bound_field",
  "narrative",
  "photos",
  "signatures",
  "vehicles",
  "report_meta",
]);

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function parsePdfLayout(raw: Json | null | undefined): PdfLayout | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const version = raw.version;
  const elementsRaw = raw.elements;
  if (version !== 1 || !Array.isArray(elementsRaw)) return null;

  const elements: PdfElement[] = [];
  for (const item of elementsRaw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const type = item.type;
    if (typeof type !== "string" || !ELEMENT_TYPES.has(type as PdfElementType)) {
      continue;
    }
    const id = typeof item.id === "string" ? item.id : crypto.randomUUID();
    elements.push({
      id,
      type: type as PdfElementType,
      page: Math.max(0, Math.floor(asNumber(item.page, 0))),
      x: asNumber(item.x, PDF_MARGIN),
      y: asNumber(item.y, PDF_MARGIN),
      width: Math.max(8, asNumber(item.width, 200)),
      height: Math.max(8, asNumber(item.height, 20)),
      questionKey:
        typeof item.questionKey === "string" ? item.questionKey : undefined,
      text: typeof item.text === "string" ? item.text : undefined,
      fontSize: typeof item.fontSize === "number" ? item.fontSize : undefined,
    });
  }

  return { version: 1, elements };
}

export function pageCountForLayout(layout: PdfLayout) {
  const maxPage = layout.elements.reduce(
    (max, element) => Math.max(max, element.page),
    0
  );
  return maxPage + 1;
}
