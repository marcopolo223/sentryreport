"use client";

import { cn } from "@/lib/utils";

export function ChoiceTile({
  selected,
  children,
  disabled,
  onClick,
}: {
  selected?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 w-full items-center rounded-md border px-2.5 text-left text-sm font-medium transition-[transform,background-color,border-color,color] duration-200",
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      {children}
    </button>
  );
}

export function YesNoToggle({
  value,
  onChange,
  disabled,
  yesLabel = "Yes",
  noLabel = "No",
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  yesLabel?: string;
  noLabel?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <ChoiceTile selected={!value} disabled={disabled} onClick={() => onChange(false)}>
        {noLabel}
      </ChoiceTile>
      <ChoiceTile selected={value} disabled={disabled} onClick={() => onChange(true)}>
        {yesLabel}
      </ChoiceTile>
    </div>
  );
}

export function ColorSwatches({
  value,
  colors,
  onChange,
  disabled,
}: {
  value: string | null;
  colors: readonly { value: string; label: string; hex: string }[];
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => {
        const selected = value === color.value;
        return (
          <button
            key={color.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(color.value)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-md border px-2.5 text-xs font-medium transition-[transform,border-color,background-color] duration-200",
              selected
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
            aria-pressed={selected}
          >
            <span
              className="size-4 rounded-full border border-border"
              style={{ backgroundColor: color.hex }}
            />
            {color.label}
          </button>
        );
      })}
    </div>
  );
}
