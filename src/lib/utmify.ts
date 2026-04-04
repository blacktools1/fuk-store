/** Cliente TypeScript para a API UTMify */

const UTMIFY_URL = "https://api.utmify.com.br/api-credentials/orders";

export interface UtmifyProduct {
  id: string;
  name: string;
  planId: string | null;
  planName: string | null;
  quantity: number;
  priceInCents: number;
}

export interface UtmifyOrderInput {
  orderId: string;
  status: "waiting_payment" | "paid" | "refunded";
  amount: number; // em reais
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerDocument?: string;
  customerIp?: string;
  utms?: Record<string, string | null | undefined>;
  products: UtmifyProduct[];
  approvedDate?: string | null;
  createdAt?: string;
  isTest?: boolean;
}

export async function sendUtmifyOrder(token: string, input: UtmifyOrderInput): Promise<void> {
  if (!token) return;

  const now = new Date().toISOString().replace("T", " ").substring(0, 19);
  const amountInCents = Math.round(input.amount * 100);

  const body = {
    orderId: input.orderId,
    platform: "Paradise",
    paymentMethod: "pix",
    status: input.status,
    createdAt: input.createdAt ?? now,
    approvedDate: input.approvedDate ?? null,
    refundedAt: null,
    customer: {
      name: input.customerName,
      email: input.customerEmail ?? "",
      phone: input.customerPhone ?? "11999999999",
      document: input.customerDocument ?? "",
      ip: input.customerIp ?? "127.0.0.1",
      country: "BR",
    },
    products: input.products,
    trackingParameters: {
      utm_source: input.utms?.utm_source ?? null,
      utm_medium: input.utms?.utm_medium ?? null,
      utm_campaign: input.utms?.utm_campaign ?? null,
      utm_content: input.utms?.utm_content ?? null,
      utm_term: input.utms?.utm_term ?? null,
      src: input.utms?.src ?? null,
      sck: input.utms?.sck ?? null,
    },
    commission: {
      totalPriceInCents: amountInCents,
      gatewayFeeInCents: 0,
      userCommissionInCents: amountInCents,
      currency: "BRL",
    },
    isTest: input.isTest ?? false,
  };

  try {
    await fetch(UTMIFY_URL, {
      method: "POST",
      headers: {
        "x-api-token": token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("UTMify send error:", e);
  }
}
