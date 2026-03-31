import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/** Returns whether the current request comes from the master domain. */
export async function GET(req: NextRequest) {
  const tenant = getTenantFromRequest(req);
  const masterDomain = (process.env.MASTER_DOMAIN ?? "").trim();
  const isMaster = masterDomain !== "" && tenant.toLowerCase() === masterDomain.toLowerCase();
  return NextResponse.json({ isMaster });
}
