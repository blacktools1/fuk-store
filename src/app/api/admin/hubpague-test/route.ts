import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { readStoreData } from "@/lib/store-data";
import { getTenantFromRequest } from "@/lib/tenant";
import {
  hasHubpagueCredentials,
  hubpagueCredentialsFromConfig,
  testHubpagueCredentials,
} from "@/lib/hubpague";

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

/** POST — testa API Token HubPague (GET /balance) */
export async function POST(req: NextRequest) {
  try {
    await verifyAdmin(req);
    const tenant = getTenantFromRequest(req);
    const store = readStoreData(tenant);
    const creds = hubpagueCredentialsFromConfig(store.checkoutConfig);

    if (!hasHubpagueCredentials(creds)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Informe o API Token em Checkout PIX → HubPague e salve antes de testar.",
        },
        { status: 400 }
      );
    }

    const result = await testHubpagueCredentials(creds);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    if ((err as Error).message === "Unauthorized") {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, message: (err as Error).message || "Erro ao testar HubPague" },
      { status: 500 }
    );
  }
}
