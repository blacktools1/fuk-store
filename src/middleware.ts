import { NextRequest, NextResponse } from "next/server";

const MASTER_DOMAIN = process.env.MASTER_DOMAIN ?? "";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.split(":")[0] ?? "localhost";
  const { pathname } = req.nextUrl;

  // Inject tenant into request headers so all server components / API routes can read it
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tenant-host", host);

  // On master domain: / → landing page; everything else → /master-admin
  if (MASTER_DOMAIN && host === MASTER_DOMAIN) {
    if (pathname === "/" || pathname === "") {
      return NextResponse.redirect(new URL("/master-home", req.url));
    }
    if (
      !pathname.startsWith("/master-admin") &&
      !pathname.startsWith("/master-home") &&
      !pathname.startsWith("/api/master-admin") &&
      !pathname.startsWith("/api/uploads")
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
