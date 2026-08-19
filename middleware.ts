import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv } from "@/lib/supabase/public-env";

const PUBLIC_PATHS = new Set(["/", "/login", "/signup", "/privacy", "/terms"]);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (
    path.startsWith("/api/stripe/webhook") ||
    path.startsWith("/api/cron/")
  ) {
    return NextResponse.next();
  }

  const env = getSupabasePublicEnv();
  if (!env) {
    return gateAsLoggedOut(request, path);
  }

  try {
    return await refreshSessionAndGate(request, path, env);
  } catch (error) {
    console.error("middleware: supabase session failed", error);
    return gateAsLoggedOut(request, path);
  }
}

function gateAsLoggedOut(request: NextRequest, path: string) {
  if (PUBLIC_PATHS.has(path)) {
    return NextResponse.next();
  }
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

async function refreshSessionAndGate(
  request: NextRequest,
  path: string,
  env: { url: string; key: string }
) {
  const { createServerClient } = await import("@supabase/ssr");
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !PUBLIC_PATHS.has(path)) {
    return gateAsLoggedOut(request, path);
  }

  if (user && (path === "/login" || path === "/signup" || path === "/")) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = "/dashboard";
    nextUrl.search = "";
    const redirect = NextResponse.redirect(nextUrl);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        redirect.headers.append(key, value);
      }
    });
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
