import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest } from "@/lib/tenant";
import { readStoreData } from "@/lib/store-data";
import { checkParadiseStatus } from "@/lib/paradise";
import { checkOramaStatus } from "@/lib/orama";
import { sendUtmifyOrderToAll } from "@/lib/utmify";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const tenant = getTenantFromRequest(req);
    const store = readStoreData(tenant);
    const config = store.checkoutConfig;

    const provider = (config?.pixProvider || "paradise").toLowerCase();

    const body = await req.json();
    const { transactionId, utmifyFallback } = body;

    if (!transactionId) {
      return NextResponse.json({ error: "transactionId obrigatório" }, { status: 400 });
    }

    let result: { status: string; paid: boolean; amountInCents: number };

    if (provider === "orama") {
      if (!config?.oramaApiKey?.trim() || !config?.oramaPublicKey?.trim()) {
        return NextResponse.json({ error: "Checkout OramaPay não configurado" }, { status: 400 });
      }
      result = await checkOramaStatus({
        apiKey:    config.oramaApiKey,
        publicKey: config.oramaPublicKey,
        transactionId: String(transactionId),
      });
    } else {
      if (!config?.paradiseApiKey?.trim()) {
        return NextResponse.json({ error: "Checkout não configurado" }, { status: 400 });
      }
      result = await checkParadiseStatus({
        apiKey: config.paradiseApiKey,
        transactionId: String(transactionId),
      });
    }

    // ── Fallback UTMify "paid" via polling ────────────────────────────────────
    // Se o checkout detectou pagamento E enviou os dados do pedido,
    // confirmamos o status "paid" na UTMify mesmo sem webhook configurado.
    // UTMify deduplica por orderId, então envios repetidos são seguros.
    if (result.paid && utmifyFallback) {
      const hasUtmify =
        config?.utmifyToken || (config?.utmifyAccounts?.length ?? 0) > 0;

      if (hasUtmify) {
        const { customerName, customerEmail, customerPhone, customerDocument, amount, products, utms } =
          utmifyFallback as {
            customerName: string;
            customerEmail: string;
            customerPhone: string;
            customerDocument: string;
            amount: number;
            products: { id: string; name: string; planId: null; planName: null; quantity: number; priceInCents: number }[];
            utms: Record<string, string>;
          };

        sendUtmifyOrderToAll(config, {
          orderId: String(transactionId),
          status: "paid",
          amount: amount ?? (result.amountInCents / 100),
          customerName: customerName ?? "Cliente",
          customerEmail: customerEmail ?? "",
          customerPhone: customerPhone ?? "",
          customerDocument: customerDocument ?? "",
          utms: utms ?? {},
          products: products ?? [
            {
              id: "POLL",
              name: "Pedido",
              planId: null,
              planName: null,
              quantity: 1,
              priceInCents: result.amountInCents,
            },
          ],
          approvedDate: new Date().toISOString().replace("T", " ").substring(0, 19),
          isTest: config.utmifyIsTest,
        }).catch((e) => console.error("UTMify poll fallback error:", e));
      }
    }

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
