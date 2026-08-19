import type { DamageType, InjuredPartyType } from "@/lib/supabase/types";

export const VEHICLE_COLORS = [
  { value: "white", label: "White", hex: "#f5f5f4" },
  { value: "black", label: "Black", hex: "#1c1917" },
  { value: "silver", label: "Silver", hex: "#c0c0c0" },
  { value: "gray", label: "Gray", hex: "#78716c" },
  { value: "red", label: "Red", hex: "#dc2626" },
  { value: "blue", label: "Blue", hex: "#2563eb" },
  { value: "green", label: "Green", hex: "#16a34a" },
  { value: "yellow", label: "Yellow", hex: "#eab308" },
  { value: "orange", label: "Orange", hex: "#ea580c" },
  { value: "brown", label: "Brown", hex: "#7c4a1e" },
  { value: "other", label: "Other", hex: "#a8a29e" },
] as const;

export const INJURED_PARTY_OPTIONS: { value: InjuredPartyType; label: string }[] =
  [
    { value: "resident", label: "Resident" },
    { value: "guest", label: "Guest" },
    { value: "employee", label: "Employee" },
    { value: "trespasser", label: "Trespasser" },
  ];

export const DAMAGE_TYPE_OPTIONS: { value: DamageType; label: string }[] = [
  { value: "vehicle", label: "Vehicle" },
  { value: "building", label: "Building" },
  { value: "common_area", label: "Common area" },
  { value: "personal_property", label: "Personal property" },
];

export function toDatetimeLocalValue(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
