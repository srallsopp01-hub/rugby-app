import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session — must be called on every request to keep session alive
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect /coach/*, /player/*, /admin/* — redirect to login if not authenticated
  if (
    (pathname.startsWith("/coach") ||
      pathname.startsWith("/player") ||
      pathname.startsWith("/admin")) &&
    !user
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Protect /api/transcribe, /api/help-chat, and /api/invite/redeem — return 401 if not authenticated
  if (
    (pathname.startsWith("/api/transcribe") ||
      pathname.startsWith("/api/help-chat") ||
      pathname.startsWith("/api/invite")) &&
    !user
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/coach/:path*",
    "/player/:path*",
    "/admin/:path*",
    "/api/transcribe/:path*",
    "/api/help-chat/:path*",
    "/api/invite/:path*",
  ],
};
