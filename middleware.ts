import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/login", "/signup", "/privacy", "/terms"]);

function supabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(
    /^['"]|['"]$/g,
    ""
  );
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(
    /^['"]|['"]$/g,
    ""
  );
  if (!url || !key || !/^https?:\/\//i.test(url)) return null;
  return { url, key };
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (
    path.startsWith("/api/stripe/webhook") ||
    path.startsWith("/api/cron/")
  ) {
    return NextResponse.next();
  }

  const env = supabasePublicEnv();
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
