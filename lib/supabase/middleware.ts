import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database.types";

const PUBLIC_ROUTES = ["/login", "/signup"];
const PENDING_ROUTE = "/en-attente";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Non authentifié -> uniquement les routes publiques.
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single();

    const isPending = profile?.status === "pending";
    const isSuspended = profile?.status === "suspended";

    // Authentifié mais sur une route publique -> direction l'app.
    if (isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = isPending ? PENDING_ROUTE : "/dashboard";
      return NextResponse.redirect(url);
    }

    // Compte en attente -> bloqué sur la page d'attente uniquement.
    if (isPending && pathname !== PENDING_ROUTE) {
      const url = request.nextUrl.clone();
      url.pathname = PENDING_ROUTE;
      return NextResponse.redirect(url);
    }

    // Compte actif -> ne doit pas rester sur la page d'attente.
    if (!isPending && pathname === PENDING_ROUTE) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Compte suspendu -> déconnexion forcée.
    if (isSuspended) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("suspendu", "1");
      return NextResponse.redirect(url);
    }
  }

  return response;
}
