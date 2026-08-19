import { cookies } from "next/headers";

export const ACTIVE_ORG_COOKIE = "sr_active_org";

export function getActiveOrgIdFromCookie(): string | undefined {
  return cookies().get(ACTIVE_ORG_COOKIE)?.value;
}

export function setActiveOrgCookie(orgId: string) {
  cookies().set(ACTIVE_ORG_COOKIE, orgId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export function clearActiveOrgCookie() {
  cookies().delete(ACTIVE_ORG_COOKIE);
}
