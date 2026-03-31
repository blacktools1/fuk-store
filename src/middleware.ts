import { NextRequest, NextResponse } from "next/server";

const MASTER_DOMAIN = (process.env.MASTER_DOMAIN ?? "").trim().toLowerCase();

export function middleware(req: NextRequest) {
  // Normalize host: strip port and lowercase for reliable comparison
  const rawHost = req.headers.get("host") ?? req.headers.get("x-forwarded-host") ?? "localhost";
  const host = rawHost.split(":")[0].trim().toLowerCase();
  const { pathname } = req.nextUrl;

  // Inject tenant into request headers so all server components / API routes can read it
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tenant-host", host);

  const isMasterDomain = MASTER_DOMAIN !== "" && host === MASTER_DOMAIN;

  // On master domain: / → landing page (rewrite, not redirect, for proxy compatibility)
  if (isMasterDomain) {
    if (pathname === "/" || pathname === "") {
      return NextResponse.rewrite(new URL("/master-home", req.url), {
        request: { headers: requestHeaders },
      });
    }
    if (
      !pathname.startsWith("/master-admin") &&
      !pathname.startsWith("/master-home") &&
      !pathname.startsWith("/api/master-admin") &&
      !pathname.startsWith("/api/uploads") &&
      !pathname.startsWith("/api/tenant-type")
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
