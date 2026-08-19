import { cookies } from "next/headers";

const COOKIE = "sr_intended_plan";

export function setIntendedPlan(plan: string) {
  if (plan !== "standard" && plan !== "pro") return;
  cookies().set(COOKIE, plan, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function getIntendedPlan(): "standard" | "pro" | null {
  const value = cookies().get(COOKIE)?.value;
  if (value === "standard" || value === "pro") return value;
  return null;
}
