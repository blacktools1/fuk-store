import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { readStoreData, writeStoreData } from "@/lib/store-data";
import { getTenantFromRequest } from "@/lib/tenant";
import type { ShippingOption } from "@/lib/admin-types";

export const dynamic = "force-dynamic";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET ||
    "minha-loja-admin-secret-key-change-this-in-production-2024"
);

async function verifyAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) throw new Error("Unauthorized");
  const { payload } = await jwtVerify(token, JWT_SECRET);
  const tenant = getTenantFromRequest(req);
  if (payload.tenant && payload.tenant !== tenant) throw new Error("Unauthorized");
}

/** GET — retorna as opções de frete salvas */
export async function GET(req: NextRequest) {
  try {
    await verifyAdmin(req);
  } catch {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }
  const tenant = getTenantFromRequest(req);
  const store = readStoreData(tenant);
  return NextResponse.json(store.checkoutConfig?.shippingOptions ?? []);
}

/** PUT — salva as opções de frete (substitui a lista inteira) */
export async function PUT(req: NextRequest) {
  try {
    await verifyAdmin(req);
  } catch {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }
  try {
    const tenant = getTenantFromRequest(req);
    const options: ShippingOption[] = await req.json();
    if (!Array.isArray(options)) {
      return NextResponse.json({ message: "Formato inválido" }, { status: 400 });
    }
    const store = readStoreData(tenant);
    store.checkoutConfig = {
      ...(store.checkoutConfig ?? {}),
      shippingOptions: options,
    };
    writeStoreData(store, tenant);
    return NextResponse.json({ ok: true, count: options.length });
  } catch (err) {
    console.error("[shipping route] erro ao salvar:", err);
    return NextResponse.json({ message: "Erro ao salvar" }, { status: 500 });
  }
}
