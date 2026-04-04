import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest } from "@/lib/tenant";
import { readStoreData } from "@/lib/store-data";
import { createParadisePayment } from "@/lib/paradise";
import { sendUtmifyOrder } from "@/lib/utmify";
import { validateCPF, digitsOnly } from "@/lib/cpf";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de validação compartilhados entre provedores
// ─────────────────────────────────────────────────────────────────────────────
function validateCommonFields(customer: Record<string, string>, cartItems: unknown[]) {
  if (!customer?.name || !customer?.email || !customer?.cpf || !customer?.phone) {
    return "Dados do cliente incompletos";
  }
  if (!validateCPF(digitsOnly(customer.cpf))) return "CPF inválido";
  if (digitsOnly(customer.phone).length < 10) return "Telefone inválido";
  if (!Array.isArray(cartItems) || cartItems.length === 0) return "Carrinho vazio";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const tenant = getTenantFromRequest(req);
    const store = readStoreData(tenant);
    const config = store.checkoutConfig;

    const provider = (config?.pixProvider || "paradise").toLowerCase();

    const body = await req.json();
    const { customer, cartItems = [], utms = {}, selectedOrderbumps = [] } = body;

    // Validação comum a todos os provedores
    const validationError = validateCommonFields(customer, cartItems);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const cpf   = digitsOnly(customer.cpf);
    const phone = digitsOnly(customer.phone);

    // Calcular total
    let total = (cartItems as { price: number; qty: number }[]).reduce(
      (sum, item) => sum + item.price * (item.qty || 1), 0
    );

    // Orderbumps selecionados
    const activeOrdebumps = (config?.orderbumps ?? []).filter(
      (ob) => ob.active && selectedOrderbumps.includes(ob.id)
    );
    total += activeOrdebumps.reduce((sum, ob) => sum + ob.price, 0);

    if (total < 0.1) {
      return NextResponse.json({ error: "Valor mínimo é R$ 0,10" }, { status: 400 });
    }

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || tenant;
    const proto = host.includes("localhost") ? "http" : "https";
    const webhookUrl = `${proto}://${host}/api/checkout/webhook`;
    const reference  = `REQ_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const description = (cartItems as { name: string }[])
      .map((i) => i.name).join(", ").substring(0, 100);

    // ─────────────────────────────────────────────────────────────────────────
    // Roteamento por provedor
    // ─────────────────────────────────────────────────────────────────────────
    let result: { transactionId: string; qrCodeBase64: string; copyPaste: string };

    if (provider === "paradise") {
      // ── Paradise Pags ────────────────────────────────────────────────────
      if (!config?.paradiseApiKey?.trim()) {
        return NextResponse.json(
          { error: "Chave da API Paradise não configurada. Acesse o painel admin → Checkout PIX." },
          { status: 400 }
        );
      }

      result = await createParadisePayment({
        apiKey: config.paradiseApiKey,
        amountInCents: Math.round(total * 100),
        description,
        reference,
        webhookUrl,
        customer: {
          name:     customer.name.trim(),
          email:    customer.email.trim().toLowerCase(),
          phone,
          document: cpf,
        },
      });

    } else {
      // ── Provedores ainda não implementados ────────────────────────────────
      return NextResponse.json(
        { error: `Provedor de pagamento "${provider}" ainda não está disponível. Aguarde a próxima atualização.` },
        { status: 501 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UTMify — notifica criação do pedido (waiting_payment)
    // ─────────────────────────────────────────────────────────────────────────
    if (config?.utmifyToken) {
      const products = (cartItems as { id: string; name: string; price: number; qty: number }[]).map((item) => ({
        id:           String(item.id || "ITEM"),
        name:         item.name,
        planId:       null as null,
        planName:     null as null,
        quantity:     item.qty || 1,
        priceInCents: Math.round(item.price * 100),
      }));

      for (const ob of activeOrdebumps) {
        products.push({
          id:           ob.offerHash || `OB_${ob.id}`,
          name:         ob.title,
          planId:       (ob.offerHash || null) as null,
          planName:     (ob.title || null) as null,
          quantity:     1,
          priceInCents: Math.round(ob.price * 100),
        });
      }

      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        req.headers.get("x-real-ip") ||
        "127.0.0.1";

      sendUtmifyOrder(config.utmifyToken, {
        orderId:          result.transactionId,
        status:           "waiting_payment",
        amount:           total,
        customerName:     customer.name,
        customerEmail:    customer.email,
        customerPhone:    phone,
        customerDocument: cpf,
        customerIp:       ip,
        utms,
        products,
        isTest:           config.utmifyIsTest,
      }).catch((e) => console.error("UTMify create error:", e));
    }

    return NextResponse.json({
      transactionId: result.transactionId,
      qrCodeBase64:  result.qrCodeBase64,
      copyPaste:     result.copyPaste,
      total,
    });

  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro interno";
    console.error("Checkout create error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
