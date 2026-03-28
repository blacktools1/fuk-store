import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { readStoreData } from "@/lib/store-data";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET ||
    "minha-loja-admin-secret-key-change-this-in-production-2024"
);

// Public endpoint: list only active products for the store
export async function GET(req: NextRequest) {
  // Check if this is an admin request (returns all) or public (returns active only)
  const token = req.cookies.get("admin_token")?.value;
  let isAdmin = false;

  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isAdmin = true;
    } catch {}
  }

  const data = readStoreData();
  const products = isAdmin ? data.products : data.products.filter((p) => p.active);
  return NextResponse.json(products);
}
