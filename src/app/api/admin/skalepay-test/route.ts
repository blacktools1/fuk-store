import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { readStoreData } from "@/lib/store-data";
import { getTenantFromRequest } from "@/lib/tenant";
import {
  hasSkaleCredentials,
  skaleCredentialsFromConfig,
  testSkaleCredentials,
} from "@/lib/skalepay";

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

export const dynamic = "force-dynamic";

/** POST — testa Chave de API Skale (Basic ChaveDeAPI:x) sem criar PIX */
export async function POST(req: NextRequest) {
  try {
    await verifyAdmin(req);
    const tenant = getTenantFromRequest(req);
    const store = readStoreData(tenant);
    const creds = skaleCredentialsFromConfig(store.checkoutConfig);

    if (!hasSkaleCredentials(creds)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Informe a Chave de API em Checkout PIX → Skale Pay e salve antes de testar.",
        },
        { status: 400 }
      );
    }

    const result = await testSkaleCredentials(creds);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    if ((err as Error).message === "Unauthorized") {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, message: (err as Error).message || "Erro ao testar Skale Pay" },
      { status: 500 }
    );
  }
}
