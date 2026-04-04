import { NextRequest, NextResponse } from "next/server";

const MASTER_DOMAIN = (process.env.MASTER_DOMAIN ?? "").trim().toLowerCase();

function safeTenant(raw: string): string {
  return raw.split(":")[0].toLowerCase().replace(/[^a-z0-9.-]/g, "_");
}

export function middleware(req: NextRequest) {
  const rawHost = req.headers.get("host") ?? req.headers.get("x-forwarded-host") ?? "localhost";
  const host = rawHost.split(":")[0].trim().toLowerCase();
  const { pathname } = req.nextUrl;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tenant-host", host);

  // ── Dev-mode tenant override ──────────────────────────────────────────────
  // Ativo quando MASTER_DOMAIN não está configurado (dev local).
  // ?__tenant=dominio → persiste cookie __dev_tenant por 24h e retorna cedo
  //   (bypassa o master-domain routing, permitindo acessar /admin de qualquer tenant).
  // ?__tenant=__clear → apaga o cookie e retorna cedo.
  const isDevMode = !MASTER_DOMAIN;

  if (isDevMode) {
    const paramTenant = req.nextUrl.searchParams.get("__tenant");

    if (paramTenant === "__clear") {
      const response = NextResponse.next({ request: { headers: requestHeaders } });
      response.cookies.delete("__dev_tenant");
      return response;
    }

    if (paramTenant) {
      const resolved = safeTenant(paramTenant);
      requestHeaders.set("x-tenant-host", resolved);
      const response = NextResponse.next({ request: { headers: requestHeaders } });
      response.cookies.set("__dev_tenant", resolved, {
        path: "/",
        httpOnly: false,
        maxAge: 60 * 60 * 24,
        sameSite: "lax",
      });
      return response;
    }

    // Cookie ativo (sem param na URL): usa o tenant persistido e bypassa master routing
    const cookieTenant = req.cookies.get("__dev_tenant")?.value;
    if (cookieTenant) {
      requestHeaders.set("x-tenant-host", cookieTenant);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
  }

  // ── Master domain routing ─────────────────────────────────────────────────
  const isMasterDomain = MASTER_DOMAIN !== "" && host === MASTER_DOMAIN;

  if (isMasterDomain) {
    if (pathname === "/" || pathname === "") {
      return NextResponse.redirect(new URL("/master-home", req.url));
    }
    if (
      !pathname.startsWith("/master-admin") &&
      !pathname.startsWith("/master-home") &&
      !pathname.startsWith("/api/")
    ) {
      return NextResponse.redirect(new URL("/master-admin", req.url));
    }
  }

  // Block /master-admin from non-master hosts (only if MASTER_DOMAIN is configured)
  if (pathname.startsWith("/master-admin")) {
    if (MASTER_DOMAIN && host !== MASTER_DOMAIN) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Block /api/master-admin from non-master hosts (only if MASTER_DOMAIN is configured)
  if (pathname.startsWith("/api/master-admin")) {
    if (MASTER_DOMAIN && host !== MASTER_DOMAIN) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
