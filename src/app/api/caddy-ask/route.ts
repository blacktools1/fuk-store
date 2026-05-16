import { NextRequest, NextResponse } from "next/server";
import { listTenants } from "@/lib/store-data";

export const dynamic = "force-dynamic";

/**
 * GET /api/caddy-ask?domain=example.com
 *
 * Used by Caddy's on-demand TLS "ask" mechanism.
 * Returns 200 if the domain should receive a TLS certificate, 403 otherwise.
 *
 * Caddy calls this before issuing a cert for any unknown domain.
 * Only registered tenants and the master domain are allowed.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CADDY_ASK_SECRET;
  if (secret) {
    const provided = req.headers.get("x-caddy-ask-secret") ?? req.nextUrl.searchParams.get("secret");
    if (provided !== secret) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const domain = req.nextUrl.searchParams.get("domain")?.toLowerCase().trim();
  if (!domain) {
    return new NextResponse("Missing domain", { status: 400 });
  }

  const masterDomain = (process.env.MASTER_DOMAIN ?? "").toLowerCase().trim();

  // Always allow the master domain
  if (masterDomain && domain === masterDomain) {
    return new NextResponse("OK", { status: 200 });
  }

  // Allow any registered tenant
  const tenants = listTenants();
  if (tenants.includes(domain)) {
    return new NextResponse("OK", { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}
