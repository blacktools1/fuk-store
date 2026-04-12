import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest } from "@/lib/tenant";
import { readStoreData, writeStoreData } from "@/lib/store-data";
import type { UtmifyAccount } from "@/lib/admin-types";

export const dynamic = "force-dynamic";

const MASK = "••••••••";
function maskToken(t: string) {
  return MASK + t.slice(-4);
}

/** GET — retorna config de checkout (tokens mascarados) */
export async function GET(req: NextRequest) {
  const tenant = getTenantFromRequest(req);
  const store = readStoreData(tenant);
  const c = store.checkoutConfig ?? {};

  // Mascara contas UTMify
  const utmifyAccounts = (c.utmifyAccounts ?? []).map((a) => ({
    id: a.id,
    label: a.label,
    token: maskToken(a.token),
  }));

  const provider = (c.pixProvider || "paradise").toLowerCase();
  const hasInternalCheckout =
    provider === "orama"
      ? !!(c.oramaApiKey?.trim() && c.oramaPublicKey?.trim())
      : !!(c.paradiseApiKey?.trim());

  return NextResponse.json({
    hasInternalCheckout,
    paradiseApiKey: c.paradiseApiKey ? maskToken(c.paradiseApiKey) : "",
    redirectUrl: c.redirectUrl ?? "",
    redirectEnabled: c.redirectEnabled ?? true,
    backLink: c.backLink ?? "",
    // legacy (mantido por compatibilidade)
    utmifyToken: c.utmifyToken ? maskToken(c.utmifyToken) : "",
    utmifyAccounts,
    utmifyIsTest: c.utmifyIsTest ?? false,
    orderbumps: c.orderbumps ?? [],
    orderbumpStyle: c.orderbumpStyle ?? "style1",
    shippingOptions: (c.shippingOptions ?? []).filter((s) => s.active),
  });
}

/** PUT — salva config de checkout */
export async function PUT(req: NextRequest) {
  const tenant = getTenantFromRequest(req);
  const store = readStoreData(tenant);
  const body = await req.json();

  const current = store.checkoutConfig ?? {};

  // Não sobrescreve chaves mascaradas (se vier •)
  const paradiseApiKey =
    body.paradiseApiKey && !body.paradiseApiKey.startsWith("•")
      ? body.paradiseApiKey.trim()
      : current.paradiseApiKey ?? "";

  // Token legado (ignoramos se já migrado para utmifyAccounts)
  const utmifyToken =
    body.utmifyToken && !body.utmifyToken.startsWith("•")
      ? body.utmifyToken.trim()
      : current.utmifyToken ?? "";

  // Array de contas — preserva tokens que vierem mascarados
  const incomingAccounts: UtmifyAccount[] = body.utmifyAccounts ?? [];
  const existingAccounts: UtmifyAccount[] = current.utmifyAccounts ?? [];

  const utmifyAccounts: UtmifyAccount[] = incomingAccounts.map((acc) => {
    if (acc.token.startsWith("•")) {
      // token mascarado → mantém o token real do servidor
      const original = existingAccounts.find((e) => e.id === acc.id);
      return { ...acc, token: original?.token ?? acc.token };
    }
    return { ...acc, token: acc.token.trim() };
  });

  store.checkoutConfig = {
    ...current,
    paradiseApiKey,
    redirectUrl: body.redirectUrl ?? current.redirectUrl ?? "",
    redirectEnabled: body.redirectEnabled ?? current.redirectEnabled ?? true,
    backLink: body.backLink ?? current.backLink ?? "",
    utmifyToken,
    utmifyAccounts,
    utmifyIsTest: body.utmifyIsTest ?? current.utmifyIsTest ?? false,
    orderbumps: body.orderbumps ?? current.orderbumps ?? [],
    orderbumpStyle: body.orderbumpStyle ?? current.orderbumpStyle ?? "style1",
    shippingOptions: body.shippingOptions ?? current.shippingOptions ?? [],
    salePendingWebhooks: body.salePendingWebhooks ?? current.salePendingWebhooks ?? [],
    saleApprovedWebhooks: body.saleApprovedWebhooks ?? current.saleApprovedWebhooks ?? [],
  };

  writeStoreData(store, tenant);
  return NextResponse.json({ ok: true });
}
