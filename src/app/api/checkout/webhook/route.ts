import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Webhook chamado pela Paradise Pags quando o pagamento é confirmado.
 *
 * Não enviamos UTMify aqui porque não temos acesso às UTMs nem aos produtos
 * reais (são dados client-side, armazenados em localStorage). O polling
 * fallback em /api/checkout/status já envia o status "paid" com UTMs e
 * produtos corretos — enviar aqui com utms:{} sobrescreveria os dados de
 * campanha e quebraria a atribuição nas plataformas.
 */
export async function POST(req: NextRequest) {
  try {
    await req.json(); // consome o body para não vazar memória
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Webhook error:", e);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
