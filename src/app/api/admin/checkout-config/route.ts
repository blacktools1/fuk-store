import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest } from "@/lib/tenant";
import { readStoreData, writeStoreData } from "@/lib/store-data";

export const dynamic = "force-dynamic";

/** GET — retorna config de checkout (sem a API key completa, por segurança) */
export async function GET(req: NextRequest) {
  const tenant = getTenantFromRequest(req);
  const store = readStoreData(tenant);
  const c = store.checkoutConfig ?? {};

  return NextResponse.json({
    hasInternalCheckout: !!(c.paradiseApiKey?.trim()),
    paradiseApiKey: c.paradiseApiKey ? "•".repeat(8) + c.paradiseApiKey.slice(-6) : "",
    redirectUrl: c.redirectUrl ?? "",
    redirectEnabled: c.redirectEnabled ?? true,
    backLink: c.backLink ?? "",
    utmifyToken: c.utmifyToken ? "•".repeat(8) + c.utmifyToken.slice(-4) : "",
    utmifyIsTest: c.utmifyIsTest ?? false,
    orderbumps: c.orderbumps ?? [],
  });
}

/** PUT — salva config de checkout */
export async function PUT(req: NextRequest) {
  const tenant = getTenantFromRequest(req);
  const store = readStoreData(tenant);
  const body = await req.json();

  const current = store.checkoutConfig ?? {};

  // Não sobrescreve chaves mascaradas (se vier •••)
  const paradiseApiKey =
    body.paradiseApiKey && !body.paradiseApiKey.startsWith("•")
      ? body.paradiseApiKey.trim()
      : current.paradiseApiKey ?? "";

  const utmifyToken =
    body.utmifyToken && !body.utmifyToken.startsWith("•")
      ? body.utmifyToken.trim()
      : current.utmifyToken ?? "";

  store.checkoutConfig = {
    ...current,
    paradiseApiKey,
    redirectUrl: body.redirectUrl ?? current.redirectUrl ?? "",
    redirectEnabled: body.redirectEnabled ?? current.redirectEnabled ?? true,
    backLink: body.backLink ?? current.backLink ?? "",
    utmifyToken,
    utmifyIsTest: body.utmifyIsTest ?? current.utmifyIsTest ?? false,
    orderbumps: body.orderbumps ?? current.orderbumps ?? [],
  };

  writeStoreData(store, tenant);
  return NextResponse.json({ ok: true });
}
