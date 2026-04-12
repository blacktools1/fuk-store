import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest } from "@/lib/tenant";
import { readStoreData } from "@/lib/store-data";
import { createParadisePayment } from "@/lib/paradise";
import { createOramaPayment } from "@/lib/orama";
import { sendUtmifyOrderToAll } from "@/lib/utmify";
import { validateCPF, digitsOnly } from "@/lib/cpf";
import { notifyStoreWebhooks } from "@/lib/store-webhooks";

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
    const { customer, cartItems = [], utms = {}, selectedOrderbumps = [], selectedShippingId } = body;

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
      (ob) => ob.active !== false && selectedOrderbumps.includes(ob.id)
    );
    total += activeOrdebumps.reduce((sum, ob) => sum + ob.price, 0);

    // Shipping
    const activeShipping = (config?.shippingOptions ?? []).find(
      (s) => s.active !== false && s.id === selectedShippingId
    );
    if (activeShipping) total += activeShipping.price;

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
    let result: { transactionId: string; qrCodeBase64: string; qrImageSrc: string; copyPaste: string };

    if (provider === "paradise") {
      // ── Paradise Pags ────────────────────────────────────────────────────
      if (!config?.paradiseApiKey?.trim()) {
        return NextResponse.json(
          { error: "Chave da API Paradise não configurada. Acesse o painel admin → Checkout PIX." },
          { status: 400 }
        );
      }

      const utmFlat: Record<string, string> = {};
      if (utms && typeof utms === "object") {
        for (const [k, v] of Object.entries(utms as Record<string, unknown>)) {
          if (v != null && String(v).trim() !== "") utmFlat[k] = String(v).trim();
        }
      }

      result = await createParadisePayment({
        apiKey: config.paradiseApiKey,
        amountInCents: Math.round(total * 100),
        description,
        reference,
        webhookUrl,
        utmMetadata: utmFlat,
        customer: {
          name:     customer.name.trim(),
          email:    customer.email.trim().toLowerCase(),
          phone,
          document: cpf,
        },
      });

    } else if (provider === "orama") {
      // ── OramaPay ──────────────────────────────────────────────────────────
      if (!config?.oramaApiKey?.trim() || !config?.oramaPublicKey?.trim()) {
        return NextResponse.json(
          { error: "Credenciais da OramaPay não configuradas. Acesse o painel admin → Checkout PIX." },
          { status: 400 }
        );
      }

      const items = (cartItems as { name: string; price: number; qty: number }[]).map((i) => ({
        name: i.name,
        unitPrice: Math.round(i.price * 100),
        quantity: i.qty || 1,
      }));
      for (const ob of activeOrdebumps) {
        items.push({
          name: ob.title,
          unitPrice: Math.round(ob.price * 100),
          quantity: 1,
        });
      }

      result = await createOramaPayment({
        apiKey:      config.oramaApiKey,
        publicKey:   config.oramaPublicKey,
        amountInCents: Math.round(total * 100),
        customer: {
          name:     customer.name.trim(),
          email:    customer.email.trim().toLowerCase(),
          phone,
          document: cpf,
        },
        items,
        externalRef: reference,
        webhookUrl,
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
    if (config?.utmifyToken || (config?.utmifyAccounts?.length ?? 0) > 0) {
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

      sendUtmifyOrderToAll(config, {
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

    const pendingItems: { id: string; name: string; quantity: number; unitPrice: number }[] = (
      cartItems as { id?: string; name: string; price: number; qty: number }[]
    ).map((item) => ({
      id: String(item.id ?? "ITEM"),
      name: item.name,
      quantity: item.qty || 1,
      unitPrice: item.price,
    }));
    for (const ob of activeOrdebumps) {
      pendingItems.push({
        id: ob.offerHash || `OB_${ob.id}`,
        name: ob.title,
        quantity: 1,
        unitPrice: ob.price,
      });
    }
    notifyStoreWebhooks(config?.salePendingWebhooks, "sale_pending", {
      tenant,
      orderId: result.transactionId,
      status: "waiting_payment",
      amount: total,
      currency: "BRL",
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim().toLowerCase(),
        phone,
        document: cpf,
      },
      items: pendingItems,
      utms: utms && typeof utms === "object" ? (utms as Record<string, unknown>) : {},
    }).catch((e) => console.error("Webhooks sale_pending:", e));

    return NextResponse.json({
      transactionId: result.transactionId,
      qrCodeBase64:  result.qrCodeBase64,
      qrImageSrc:    result.qrImageSrc,
      copyPaste:     result.copyPaste,
      total,
    });

  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro interno";
    console.error("Checkout create error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
