import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getTenantFromRequest } from "@/lib/tenant";
import { readStoreData } from "@/lib/store-data";

export const dynamic = "force-dynamic";

/**
 * Webhook chamado por provedores (ex.: Paradise Pags, OramaPay) ao mudar status do pagamento.
 *
 * Não enviamos UTMify aqui porque não temos acesso às UTMs nem aos produtos
 * reais (dados client-side). O polling em /api/checkout/status envia "paid"
 * com UTMs corretos.
 *
 * OramaPay: se `oramaWebhookSecret` estiver salvo e o header `x-webhook-signature`
 * vier na requisição, validamos HMAC-SHA256 do corpo bruto (documentação OramaPay).
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const tenant = getTenantFromRequest(req);
    const store = readStoreData(tenant);
    const secret = store.checkoutConfig?.oramaWebhookSecret?.trim();

    const sigHeader = req.headers.get("x-webhook-signature");
    if (sigHeader && secret) {
      const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
      const a = Buffer.from(expected, "utf8");
      const b = Buffer.from(sigHeader.trim(), "utf8");
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Webhook error:", e);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
