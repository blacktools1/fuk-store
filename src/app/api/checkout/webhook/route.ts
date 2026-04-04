import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest } from "@/lib/tenant";
import { readStoreData } from "@/lib/store-data";
import { sendUtmifyOrderToAll } from "@/lib/utmify";

export const dynamic = "force-dynamic";

/** Webhook chamado pela Paradise Pags quando o pagamento é confirmado */
export async function POST(req: NextRequest) {
  try {
    const tenant = getTenantFromRequest(req);
    const store = readStoreData(tenant);
    const config = store.checkoutConfig;

    const body = await req.json();
    const status = String(body.status ?? "").toLowerCase();
    const isPaid = status === "paid" || status === "approved";

    const hasUtmify = config?.utmifyToken || (config?.utmifyAccounts?.length ?? 0) > 0;
    if (isPaid && hasUtmify && body.id) {
      const amountInCents: number = body.amount ?? 0;
      const amount = amountInCents / 100;

      // UTMify — confirma pagamento em todos os dashboards configurados
      sendUtmifyOrderToAll(config!, {
        orderId: String(body.id),
        status: "paid",
        amount,
        customerName: body.customer?.name ?? "Cliente",
        customerEmail: body.customer?.email ?? "",
        customerPhone: body.customer?.phone ?? "",
        customerDocument: body.customer?.document ?? "",
        utms: {},
        products: [
          {
            id: "WEBHOOK",
            name: "Pedido",
            planId: null,
            planName: null,
            quantity: 1,
            priceInCents: Math.round(amount * 100),
          },
        ],
        approvedDate: new Date().toISOString().replace("T", " ").substring(0, 19),
        isTest: config!.utmifyIsTest,
      }).catch((e) => console.error("Webhook UTMify error:", e));
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Webhook error:", e);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
