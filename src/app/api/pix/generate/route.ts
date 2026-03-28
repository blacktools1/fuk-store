import { NextRequest, NextResponse } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
//  Pix Generation API Route
//
//  Calls the PHP pix-widget.php?action=create-payment endpoint.
//  The PHP project is at /Users/vinitakeuti/Desktop/Ecommerce/PIX API/
//  It uses Paradise Pags API under the hood.
//
//  PHP expects:
//    POST pix-widget.php?action=create-payment
//    { amount, customer: {name, email, cpf, phone}, utms, orderbump?, selectedOrderbumps? }
//
//  PHP returns:
//    { plgId, pixQrCode, pixCopyPaste, amount, customerName, status }
// ────────────────────────────────────────────────────────────────────────────

const PHP_PIX_URL =
  process.env.PHP_PIX_URL ||
  "http://localhost:8080/pix-widget.php?action=create-payment";

const PHP_PIX_STATUS_URL =
  process.env.PHP_PIX_STATUS_URL ||
  "http://localhost:8080/pix-widget.php?action=check-status";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, customer, items } = body;

    if (!amount || !customer || !items) {
      return NextResponse.json(
        { message: "Dados incompletos: amount, customer e items são obrigatórios" },
        { status: 400 }
      );
    }

    // Build UTMs from headers if available
    const utms: Record<string, string> = {};

    // ── Payload adapted to pix-widget.php format ──
    const pixPayload = {
      amount: parseFloat(amount.toFixed(2)),
      customer: {
        name: customer.name,
        email: customer.email,
        cpf: customer.cpf?.replace(/\D/g, ""),
        phone: customer.phone?.replace(/\D/g, ""),
      },
      utms,
      // No orderbumps from the ecommerce store — total is already computed in `amount`
      orderbump: false,
      selectedOrderbumps: [],
    };

    const response = await fetch(PHP_PIX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(pixPayload),
    });

    const text = await response.text();

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("PHP Pix API non-JSON response:", text.slice(0, 500));
      return NextResponse.json(
        { message: "Resposta inválida da API Pix PHP" },
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.error("PHP Pix API error:", data);
      return NextResponse.json(
        { message: (data.error as string) || "Erro na API Pix" },
        { status: response.status }
      );
    }

    // Normalize response for the frontend
    return NextResponse.json({
      transaction_id: data.plgId,
      qr_code: data.pixCopyPaste || data.pixQrCode || null,
      qr_code_base64: null, // Paradise API returns the pix copy-paste string only
      status: data.status || "pending",
      amount: data.amount,
      message: "Pix gerado com sucesso",
    });
  } catch (error) {
    console.error("Pix route error:", error);
    return NextResponse.json(
      { message: "Erro interno ao gerar Pix. Verifique se o servidor PHP está rodando." },
      { status: 500 }
    );
  }
}

// Check payment status (polling)
export async function GET(req: NextRequest) {
  const txId = req.nextUrl.searchParams.get("id");
  if (!txId) {
    return NextResponse.json({ message: "id é obrigatório" }, { status: 400 });
  }

  try {
    const response = await fetch(PHP_PIX_STATUS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plgId: txId }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ paid: false, status: "error", error: String(error) });
  }
}
