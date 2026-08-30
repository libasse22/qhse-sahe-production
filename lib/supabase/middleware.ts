import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_ROUTES = ["/login", "/signup"];
const PUBLIC_ROUTES = ["/login", "/signup"];
const PENDING_ROUTE = "/en-attente";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose") === "prefetch" ||
    request.headers.get("x-next-router-prefetch") === "1";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
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

  // Toute redirection doit emporter avec elle les cookies éventuellement
  // rafraîchis par Supabase ci-dessus (sinon le nouveau jeton de session
  // est perdu et l'utilisateur se retrouve déconnecté au prochain aller).
  function redirectTo(pathname: string, extraParams?: Record<string, string>) {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        url.searchParams.set(key, value);
      }
    }
    const redirectResponse = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    }
    return redirectResponse;
  }

  let user = null;
  try {
    const {
      data: { user: fetchedUser },
    } = await supabase.auth.getUser();
    user = fetchedUser;
  } catch {
    user = null;
  }

  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || pathname.startsWith("/scan/");
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // Si l'utilisateur n'est pas connecté et qu'il tente d'accéder à une route privée :
  // Sur une navigation réelle, on redirige vers /login.
  // Sur un préchargement en arrière-plan, on renvoie la réponse neutre sans redirection 307
  // pour ne pas faire sauter le routeur Next.js du client.
  if (!user && !isPublicRoute) {
    if (isPrefetch) {
      return response;
    }
    return redirectTo("/login", { next: pathname });
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single();

    const isPending = profile?.status === "pending";
    const isSuspended = profile?.status === "suspended";

    if (isSuspended) {
      if (isPrefetch) return response;
      await supabase.auth.signOut();
      return redirectTo("/login", { suspendu: "1" });
    }

    if (isAuthRoute && !isPrefetch) {
      return redirectTo(isPending ? PENDING_ROUTE : "/dashboard");
    }

    if (isPending && pathname !== PENDING_ROUTE && !isPrefetch) {
      return redirectTo(PENDING_ROUTE);
    }

    if (!isPending && pathname === PENDING_ROUTE && !isPrefetch) {
      return redirectTo("/dashboard");
    }
  }

  return response;
}