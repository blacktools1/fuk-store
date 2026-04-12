import { NextRequest, NextResponse } from "next/server";
import { readStoreData } from "@/lib/store-data";
import { getTenantFromRequest } from "@/lib/tenant";
import { STORE_JSON_CACHE_CONTROL } from "@/lib/http-cache";

// Public endpoint: always list only active products regardless of auth status
export async function GET(req: NextRequest) {
  const tenant = getTenantFromRequest(req);
  const data = readStoreData(tenant);
  const products = data.products.filter((p) => p.active);
  return NextResponse.json(products, {
    headers: { "Cache-Control": STORE_JSON_CACHE_CONTROL },
  });
}
