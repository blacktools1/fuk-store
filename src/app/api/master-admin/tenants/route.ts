import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { listTenants, createTenant, readStoreData } from "@/lib/store-data";

const MASTER_SECRET = new TextEncoder().encode(
  process.env.MASTER_JWT_SECRET || "master-secret-change-this-in-production"
);

async function verifyMaster(req: NextRequest) {
  const token = req.cookies.get("master_token")?.value;
  if (!token) throw new Error("Unauthorized");
  await jwtVerify(token, MASTER_SECRET);
}

/** GET /api/master-admin/tenants — list all tenants with summary */
export async function GET(req: NextRequest) {
  try {
    await verifyMaster(req);
  } catch {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const tenants = listTenants().map((domain) => {
    try {
      const store = readStoreData(domain);
      return {
        domain,
        storeName: store.storeName,
        productCount: store.products?.length ?? 0,
        primaryColor: store.primaryColor ?? "#8b5cf6",
      };
    } catch {
      return { domain, storeName: domain, productCount: 0, primaryColor: "#8b5cf6" };
    }
  });

  return NextResponse.json(tenants);
}

/** POST /api/master-admin/tenants — create new tenant */
export async function POST(req: NextRequest) {
  try {
    await verifyMaster(req);
  } catch {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    const { domain, storeName } = await req.json();

    if (!domain || typeof domain !== "string") {
      return NextResponse.json({ message: "Domínio inválido" }, { status: 400 });
    }

    // Normalize domain — lowercase, trim, no protocol
    const normalized = domain
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .toLowerCase()
      .trim();

    const existing = listTenants();
    if (existing.includes(normalized)) {
      return NextResponse.json({ message: "Esse domínio já existe" }, { status: 409 });
    }

    const store = createTenant(normalized, storeName);
    return NextResponse.json({ domain: normalized, storeName: store.storeName }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Erro ao criar loja" }, { status: 500 });
  }
}
