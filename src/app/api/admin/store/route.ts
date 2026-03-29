import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { readStoreData, writeStoreData } from "@/lib/store-data";
import { getTenantFromRequest } from "@/lib/tenant";

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

export async function GET(req: NextRequest) {
  try {
    await verifyAdmin(req);
    const tenant = getTenantFromRequest(req);
    const data = readStoreData(tenant);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await verifyAdmin(req);
    const tenant = getTenantFromRequest(req);
    const body = await req.json();
    const current = readStoreData(tenant);
    const updated = { ...current, ...body };
    writeStoreData(updated, tenant);
    return NextResponse.json({ message: "Salvo com sucesso" });
  } catch (err) {
    if ((err as Error).message === "Unauthorized") {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ message: "Erro ao salvar" }, { status: 500 });
  }
}
