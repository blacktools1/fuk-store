import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest } from "@/lib/tenant";
import { readStoreData } from "@/lib/store-data";
import { checkParadiseStatus } from "@/lib/paradise";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const tenant = getTenantFromRequest(req);
    const store = readStoreData(tenant);
    const config = store.checkoutConfig;

    if (!config?.paradiseApiKey?.trim()) {
      return NextResponse.json({ error: "Checkout não configurado" }, { status: 400 });
    }

    const { transactionId } = await req.json();
    if (!transactionId) {
      return NextResponse.json({ error: "transactionId obrigatório" }, { status: 400 });
    }

    const result = await checkParadiseStatus({
      apiKey: config.paradiseApiKey,
      transactionId: String(transactionId),
    });

    return NextResponse.json({
      status: result.status,
      paid: result.paid,
      amountInCents: result.amountInCents,
      redirectUrl: config.redirectUrl ?? "",
      redirectEnabled: config.redirectEnabled ?? true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao verificar status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
