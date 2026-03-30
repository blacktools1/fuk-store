import { NextRequest, NextResponse } from "next/server";
import { readStoreData } from "@/lib/store-data";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/** Public store config — safe to expose to the storefront client */
export async function GET(req: NextRequest) {
  const tenant = getTenantFromRequest(req);
  const data = readStoreData(tenant);

  return NextResponse.json({
    pixDiscountEnabled: data.pixDiscountEnabled ?? true,
    pixDiscount: data.pixDiscount ?? 5,
    freeShippingMin: data.freeShippingMin ?? 199,
  });
}
