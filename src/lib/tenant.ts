import { headers } from "next/headers";
import { NextRequest } from "next/server";

/**
 * Returns the current tenant (store domain) from the x-tenant-host header.
 * Use in Server Components and Server Actions.
 */
export async function getTenant(): Promise<string> {
  const hdrs = await headers();
  return hdrs.get("x-tenant-host") ?? "localhost";
}

/**
 * Returns the current tenant from a NextRequest object.
 * Use inside API Route handlers.
 */
export function getTenantFromRequest(req: NextRequest): string {
  return req.headers.get("x-tenant-host") ?? "localhost";
}

/**
 * Converts a domain into a safe filesystem directory name.
 * e.g. "loja1.com" → "loja1.com"  (dots are valid in dir names)
 * Strips port numbers and any unsafe characters.
 */
export function sanitizeTenant(tenant: string): string {
  return tenant
    .split(":")[0]                        // remove port
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "_");        // keep letters, digits, dots, hyphens
}
