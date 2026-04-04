import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest } from "@/lib/tenant";
import { readStoreData } from "@/lib/store-data";
import { createParadisePayment } from "@/lib/paradise";
import { sendUtmifyOrder } from "@/lib/utmify";
import { validateCPF, digitsOnly } from "@/lib/cpf";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const tenant = getTenantFromRequest(req);
    const store = readStoreData(tenant);
    const config = store.checkoutConfig;

    if (!config?.paradiseApiKey?.trim()) {
      return NextResponse.json({ error: "Checkout não configurado. Configure a chave da API Paradise no painel admin." }, { status: 400 });
    }

    const body = await req.json();
    const { customer, cartItems = [], utms = {}, selectedOrderbumps = [] } = body;

    // Validar dados do cliente
    if (!customer?.name || !customer?.email || !customer?.cpf || !customer?.phone) {
      return NextResponse.json({ error: "Dados do cliente incompletos" }, { status: 400 });
    }

    const cpf = digitsOnly(customer.cpf);
    if (!validateCPF(cpf)) {
      return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
    }

    const phone = digitsOnly(customer.phone);
    if (phone.length < 10) {
      return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });
    }

    // Calcular total
    let total = cartItems.reduce((sum: number, item: { price: number; qty: number }) => sum + item.price * (item.qty || 1), 0);

    // Orderbumps selecionados
    const activeOrdebumps = (config.orderbumps ?? []).filter(
      (ob) => ob.active && selectedOrderbumps.includes(ob.id)
    );
    total += activeOrdebumps.reduce((sum, ob) => sum + ob.price, 0);

    if (total < 0.1) {
      return NextResponse.json({ error: "Valor mínimo é R$ 0,10" }, { status: 400 });
    }

    // URL do webhook — usa o domínio da requisição para multi-tenancy
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || tenant;
    const proto = host.includes("localhost") ? "http" : "https";
    const webhookUrl = config.redirectUrl
      ? `${proto}://${host}/api/checkout/webhook`
      : `${proto}://${host}/api/checkout/webhook`;

    const reference = `REQ_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const result = await createParadisePayment({
      apiKey: config.paradiseApiKey,
      amountInCents: Math.round(total * 100),
      description: cartItems
        .map((i: { name: string }) => i.name)
        .join(", ")
        .substring(0, 100),
      reference,
      webhookUrl: `${proto}://${host}/api/checkout/webhook`,
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim().toLowerCase(),
        phone,
        document: cpf,
      },
    });

    // UTMify — notifica criação do pedido (waiting_payment)
    if (config.utmifyToken) {
      const products = cartItems.map((item: { id: string; name: string; price: number; qty: number }) => ({
        id: String(item.id || "ITEM"),
        name: item.name,
        planId: null as null,
        planName: null as null,
        quantity: item.qty || 1,
        priceInCents: Math.round(item.price * 100),
      }));

      for (const ob of activeOrdebumps) {
        products.push({
          id: ob.offerHash || `OB_${ob.id}`,
          name: ob.title,
          planId: (ob.offerHash || null) as null,
          planName: (ob.title || null) as null,
          quantity: 1,
          priceInCents: Math.round(ob.price * 100),
        });
      }

      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        req.headers.get("x-real-ip") ||
        "127.0.0.1";

      sendUtmifyOrder(config.utmifyToken, {
        orderId: result.transactionId,
        status: "waiting_payment",
        amount: total,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: phone,
        customerDocument: cpf,
        customerIp: ip,
        utms,
        products,
        isTest: config.utmifyIsTest,
      }).catch((e) => console.error("UTMify create error:", e));
    }

    return NextResponse.json({
      transactionId: result.transactionId,
      qrCodeBase64: result.qrCodeBase64,
      copyPaste: result.copyPaste,
      total,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro interno";
    console.error("Checkout create error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
