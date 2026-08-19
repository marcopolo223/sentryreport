import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/login", "/signup", "/privacy", "/terms"]);

function hasSupabaseSession(request: NextRequest) {
  return request.cookies.getAll().some(
    ({ name, value }) =>
      Boolean(value) && /^sb-.+-auth-token(?:\.\d+)?$/.test(name)
  );
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (
    path.startsWith("/api/stripe/webhook") ||
    path.startsWith("/api/cron/")
  ) {
    return NextResponse.next();
  }

  const signedIn = hasSupabaseSession(request);

  if (!signedIn && !PUBLIC_PATHS.has(path)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  if (signedIn && (path === "/login" || path === "/signup" || path === "/")) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = "/dashboard";
    nextUrl.search = "";
    return NextResponse.redirect(nextUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
