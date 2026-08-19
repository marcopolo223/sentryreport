"use client";

import { useEffect, useState } from "react";

import { resetPdfTemplate, savePdfTemplate } from "@/app/actions/pdf-template";
import { WindowFrame } from "@/components/reports/window-frame";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LayoutQuestion } from "@/lib/pdf/layout";
import {
  PDF_PAGE_HEIGHT,
  PDF_PAGE_WIDTH,
  type PdfElement,
  type PdfElementType,
  type PdfLayout,
} from "@/lib/pdf/types";
import { cn } from "@/lib/utils";

const SCALE = 0.78;
const TOUR_KEY = "sr-pdf-builder-tour";

const PALETTE: { type: PdfElementType; label: string; questionKey?: string }[] = [
  { type: "logo", label: "Logo" },
  { type: "banner", label: "Banner" },
  { type: "report_meta", label: "Org / report #" },
  { type: "static_text", label: "Text" },
  { type: "divider", label: "Divider" },
  { type: "photos", label: "Photos" },
  { type: "signatures", label: "Signatures" },
  { type: "vehicles", label: "Vehicles" },
  { type: "narrative", label: "Narrative", questionKey: "original_summary" },
];

function defaultSize(type: PdfElementType): { width: number; height: number } {
  switch (type) {
    case "logo":
      return { width: 72, height: 36 };
    case "banner":
      return { width: 523, height: 48 };
    case "divider":
      return { width: 523, height: 8 };
    case "photos":
      return { width: 523, height: 150 };
    case "signatures":
      return { width: 523, height: 84 };
    case "vehicles":
      return { width: 523, height: 72 };
    case "narrative":
      return { width: 523, height: 110 };
    case "report_meta":
      return { width: 400, height: 36 };
    default:
      return { width: 523, height: 28 };
  }
}

function elementLabel(element: PdfElement, questions: LayoutQuestion[]) {
  if (element.questionKey === "__writer_name") return "Writer";
  if (element.questionKey === "__property_address") return "Address";
  if (element.type === "bound_field" && element.questionKey) {
    return questions.find((row) => row.question_key === element.questionKey)?.label ?? element.questionKey;
  }
  return PALETTE.find((item) => item.type === element.type)?.label ?? element.type;
}

export function PdfTemplateBuilder({
  questions,
  initialLayout,
  hasSavedTemplate,
  error,
}: {
  questions: LayoutQuestion[];
  initialLayout: PdfLayout;
  hasSavedTemplate: boolean;
  error?: string;
}) {
  const [layout, setLayout] = useState<PdfLayout>(initialLayout);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialLayout.elements[0]?.id ?? null
  );
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [tour, setTour] = useState(hasSavedTemplate ? -1 : 0);
  const [drag, setDrag] = useState<{
    id: string;
    mode: "move" | "resize";
    offsetX: number;
    offsetY: number;
  } | null>(null);

  useEffect(() => {
    if (window.localStorage.getItem(TOUR_KEY) === "done") setTour(-1);
  }, []);

  const pages = Math.max(1, ...layout.elements.map((element) => element.page + 1), page + 1);
  const selected = layout.elements.find((element) => element.id === selectedId) ?? null;
  const pageElements = layout.elements.filter((element) => element.page === page);

  function updateElement(id: string, patch: Partial<PdfElement>) {
    setLayout((current) => ({
      ...current,
      elements: current.elements.map((element) =>
        element.id === id ? { ...element, ...patch } : element
      ),
    }));
  }

  function addElement(type: PdfElementType, questionKey?: string) {
    const size = defaultSize(type);
    const lastY = pageElements.reduce(
      (max, element) => Math.max(max, element.y + element.height),
      36
    );
    const next: PdfElement = {
      id: crypto.randomUUID(),
      type,
      page,
      x: 36,
      y: Math.min(lastY + 8, PDF_PAGE_HEIGHT - size.height - 36),
      width: size.width,
      height: size.height,
      questionKey,
      text: type === "static_text" ? "Text" : undefined,
      fontSize: type === "static_text" ? 11 : undefined,
    };
    setLayout((current) => ({
      ...current,
      elements: [...current.elements, next],
    }));
    setSelectedId(next.id);
  }

  function dismissTour() {
    setTour(-1);
    window.localStorage.setItem(TOUR_KEY, "done");
  }

  return (
    <div className="min-w-0 space-y-4">
      {error && <Alert>{error}</Alert>}
      {tour >= 0 && (
        <Alert variant="info">
          {tour === 0 && "This canvas starts from your intake questions, not a blank page."}
          {tour === 1 && "Drag to move, use the corner handle to resize, and bind fields from the palette."}
          {tour === 2 && "Save writes layout JSON only. Reports still generate a PDF at export time."}
          <span className="mt-2 flex gap-2">
            {tour < 2 ? (
              <Button type="button" size="sm" onClick={() => setTour((value) => Number(value) + 1)}>
                Next
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={dismissTour}>
                Got it
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" onClick={dismissTour}>
              Skip
            </Button>
          </span>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: pages }, (_, index) => (
            <Button
              key={index}
              type="button"
              size="sm"
              variant={page === index ? "default" : "outline"}
              onClick={() => setPage(index)}
            >
              Page {index + 1}
            </Button>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => setPage(pages)}>
            Add page
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => {
              if (!window.confirm("Reset to the generated layout from your questions?")) return;
              void resetPdfTemplate();
            }}
          >
            Reset
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => {
              setSaving(true);
              void savePdfTemplate(layout).finally(() => setSaving(false));
            }}
          >
            {saving ? "Saving…" : "Save template"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[13rem_minmax(0,1fr)_16rem]">
        <WindowFrame title="Palette">
          <div className="space-y-1 p-2">
            <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Fields
            </p>
            <button
              type="button"
              className="block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
              onClick={() => addElement("bound_field", "__writer_name")}
            >
              Report writer
            </button>
            <button
              type="button"
              className="block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
              onClick={() => addElement("bound_field", "__property_address")}
            >
              Property address
            </button>
            {questions.map((question) => (
              <button
                key={question.question_key}
                type="button"
                className="block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
                onClick={() =>
                  addElement(
                    question.question_key === "original_summary" ? "narrative" : "bound_field",
                    question.question_key
                  )
                }
              >
                {question.label}
              </button>
            ))}
            <p className="px-2 pb-1 pt-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Layout
            </p>
            {PALETTE.map((item) => (
              <button
                key={item.label}
                type="button"
                className="block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
                onClick={() => addElement(item.type, item.questionKey)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </WindowFrame>

        <div className="overflow-auto rounded-xl border border-border bg-muted/40 p-4">
          <div
            className="relative mx-auto bg-white shadow-soft"
            style={{
              width: PDF_PAGE_WIDTH * SCALE,
              height: PDF_PAGE_HEIGHT * SCALE,
            }}
            onPointerMove={(event) => {
              if (!drag) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const x = (event.clientX - rect.left) / SCALE;
              const y = (event.clientY - rect.top) / SCALE;
              const element = layout.elements.find((row) => row.id === drag.id);
              if (!element) return;
              if (drag.mode === "move") {
                updateElement(drag.id, {
                  x: Math.max(0, Math.min(PDF_PAGE_WIDTH - element.width, x - drag.offsetX)),
                  y: Math.max(0, Math.min(PDF_PAGE_HEIGHT - element.height, y - drag.offsetY)),
                });
              } else {
                updateElement(drag.id, {
                  width: Math.max(24, Math.min(PDF_PAGE_WIDTH - element.x, x - element.x)),
                  height: Math.max(16, Math.min(PDF_PAGE_HEIGHT - element.y, y - element.y)),
                });
              }
            }}
            onPointerUp={() => setDrag(null)}
            onPointerCancel={() => setDrag(null)}
          >
            {pageElements.map((element) => (
              <div
                key={element.id}
                className={cn(
                  "absolute cursor-move select-none border border-dashed bg-primary/5 px-1 py-0.5 text-[10px] leading-tight text-foreground",
                  selectedId === element.id ? "border-primary bg-primary/10" : "border-stone-400/70"
                )}
                style={{
                  left: element.x * SCALE,
                  top: element.y * SCALE,
                  width: element.width * SCALE,
                  height: element.height * SCALE,
                }}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.currentTarget.parentElement?.setPointerCapture(event.pointerId);
                  const rect = event.currentTarget.parentElement?.getBoundingClientRect();
                  if (!rect) return;
                  const x = (event.clientX - rect.left) / SCALE;
                  const y = (event.clientY - rect.top) / SCALE;
                  setSelectedId(element.id);
                  setDrag({
                    id: element.id,
                    mode: "move",
                    offsetX: x - element.x,
                    offsetY: y - element.y,
                  });
                }}
              >
                {elementLabel(element, questions)}
                {selectedId === element.id && (
                  <button
                    type="button"
                    aria-label="Resize"
                    className="absolute -bottom-1 -right-1 size-3 cursor-se-resize rounded-sm bg-primary"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setDrag({
                        id: element.id,
                        mode: "resize",
                        offsetX: 0,
                        offsetY: 0,
                      });
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <WindowFrame title="Properties">
          <div className="space-y-3 p-4">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Select an element.</p>
            ) : (
              <>
                <p className="text-sm font-medium">{elementLabel(selected, questions)}</p>
                {selected.type === "static_text" && (
                  <div>
                    <Label htmlFor="el-text">Text</Label>
                    <Input
                      id="el-text"
                      value={selected.text ?? ""}
                      onChange={(event) =>
                        updateElement(selected.id, { text: event.target.value })
                      }
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {(["x", "y", "width", "height"] as const).map((key) => (
                    <div key={key}>
                      <Label htmlFor={`el-${key}`}>{key}</Label>
                      <Input
                        id={`el-${key}`}
                        type="number"
                        value={Math.round(selected[key])}
                        onChange={(event) =>
                          updateElement(selected.id, {
                            [key]: Number(event.target.value),
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLayout((current) => ({
                      ...current,
                      elements: current.elements.filter((element) => element.id !== selected.id),
                    }));
                    setSelectedId(null);
                  }}
                >
                  Remove
                </Button>
              </>
            )}
          </div>
        </WindowFrame>
      </div>
    </div>
  );
}
