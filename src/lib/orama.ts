/** Cliente TypeScript para a OramaPay API (PIX IN) */

import QRCode from "qrcode";
import { getPixQrImgSrc } from "./pix-qr";

const ORAMA_BASE = "https://api.oramapay.com";

/** Gera o header Authorization: Basic base64(apiKey:publicKey) */
function basicAuth(apiKey: string, publicKey: string): string {
  const credentials = Buffer.from(`${apiKey}:${publicKey}`).toString("base64");
  return `Basic ${credentials}`;
}

/** Gera data URL PNG a partir do EMV PIX (payload copia-e-cola). */
async function qrDataUrlFromPixPayload(emv: string): Promise<string> {
  return QRCode.toDataURL(emv, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
}

export interface OramaCreateResult {
  transactionId: string;
  qrCodeBase64: string;
  qrImageSrc: string;
  copyPaste: string;
}

export async function createOramaPayment(params: {
  apiKey: string;
  publicKey: string;
  amountInCents: number;
  customer: {
    name: string;
    email: string;
    phone: string;
    /** CPF (11 dígitos) ou CNPJ (14 dígitos) — somente números */
    document: string;
  };
  items: { name: string; unitPrice: number; quantity: number }[];
  externalRef: string;
  webhookUrl: string;
}): Promise<OramaCreateResult> {
  const docType = params.customer.document.length === 14 ? "cnpj" : "cpf";

  const body = {
    amount: params.amountInCents,
    paymentMethod: "pix",
    customer: {
      name: params.customer.name,
      email: params.customer.email,
      phone: params.customer.phone,
      document: {
        number: params.customer.document,
        type: docType,
      },
    },
    items: params.items.map((i) => ({
      title: i.name,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      tangible: false,
    })),
    pix: { expiresInDays: 2 },
    externalRef: params.externalRef,
    postbackUrl: params.webhookUrl,
  };

  const res = await fetch(`${ORAMA_BASE}/api/v1/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: basicAuth(params.apiKey, params.publicKey),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json() as Record<string, unknown>;

  if (!res.ok) {
    const msg =
      (data.error as string) ||
      (data.message as string) ||
      `OramaPay: HTTP ${res.status}`;
    throw new Error(msg);
  }

  const id = String(data.id ?? "");
  if (!id) {
    throw new Error("OramaPay: resposta sem ID. " + JSON.stringify(data));
  }

  // Extrai QR Code e copia-e-cola
  const pixObj = data.pix as Record<string, unknown> | undefined;
  const copyPaste = String(pixObj?.qrcode ?? "");

  const qrRaw = (() => {
    const raw = String(pixObj?.qrcode ?? "");
    // Se vier data:image ou base64 de imagem, usamos direto; caso contrário é EMV
    if (raw.startsWith("data:image/") || raw.startsWith("iVBOR") || raw.startsWith("/9j/")) {
      return raw;
    }
    return "";
  })();

  let qrImageSrc = getPixQrImgSrc(qrRaw);

  // A API Orama retorna apenas o EMV (copia-e-cola); geramos o QR localmente
  if (!qrImageSrc && copyPaste.trim().length >= 20) {
    try {
      qrImageSrc = await qrDataUrlFromPixPayload(copyPaste.trim());
    } catch (e) {
      console.error("[orama] Falha ao gerar QR a partir do payload PIX:", e);
    }
  }

  return {
    transactionId: id,
    qrCodeBase64: qrRaw,
    qrImageSrc,
    copyPaste,
  };
}

export interface OramaStatusResult {
  status: string;
  paid: boolean;
  amountInCents: number;
}

export async function checkOramaStatus(params: {
  apiKey: string;
  publicKey: string;
  transactionId: string;
}): Promise<OramaStatusResult> {
  const url = `${ORAMA_BASE}/api/v1/transactions/pix-in?id=${encodeURIComponent(params.transactionId)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: basicAuth(params.apiKey, params.publicKey),
    },
  });

  const data = await res.json() as Record<string, unknown>;

  if (!res.ok) {
    throw new Error(
      (data.error as string) || (data.message as string) || `OramaPay status: HTTP ${res.status}`
    );
  }

  const status = String(data.status ?? "pending").toLowerCase();
  const paid = status === "paid" || status === "approved";

  // A API retorna `amount` em centavos para PIX IN
  const amountInCents = typeof data.amount === "number" ? data.amount : 0;

  return { status, paid, amountInCents };
}
