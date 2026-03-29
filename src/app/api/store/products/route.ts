import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { readStoreData } from "@/lib/store-data";
import { getTenantFromRequest } from "@/lib/tenant";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET ||
    "minha-loja-admin-secret-key-change-this-in-production-2024"
);

// Public endpoint: list only active products for the store
export async function GET(req: NextRequest) {
  const tenant = getTenantFromRequest(req);

  const token = req.cookies.get("admin_token")?.value;
  let isAdmin = false;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      // Token must be scoped to this tenant
      if (!payload.tenant || payload.tenant === tenant) isAdmin = true;
    } catch {}
  }

  const data = readStoreData(tenant);
  const products = isAdmin ? data.products : data.products.filter((p) => p.active);
  return NextResponse.json(products);
}
