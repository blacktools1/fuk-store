/**
 * Cliente TypeScript para a Skale Pay API (PIX).
 * @see https://skalepay.readme.io/reference/introducao
 * @see https://skalepay.readme.io/reference/criar-transacao
 */

import QRCode from "qrcode";
import { getPixQrImgSrc } from "./pix-qr";

const SKALE_BASE = "https://api.conta.skalepay.com.br/v1";

/**
 * Basic Auth: base64("{SECRET_KEY}:{USER_TOKEN}").
 * No painel (Credenciais de API) a Skale exibe chave secreta + token de usuário.
 * A doc pública cita `:x` como placeholder; na prática o token de usuário é obrigatório.
 */
function basicAuth(secretKey: string, userToken: string): string {
  const key = secretKey.trim();
  const token = userToken.trim() || "x";
  const credentials = Buffer.from(`${key}:${token}`).toString("base64");
  return `Basic ${credentials}`;
}

async function qrDataUrlFromPixPayload(emv: string): Promise<string> {
  return QRCode.toDataURL(emv, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
}

async function parseJsonSafely(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function formatSkaleError(data: Record<string, unknown>, fallback: string): string {
  const msg = data.message ?? data.error ?? data.errors;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (Array.isArray(msg) && msg.length > 0) {
    const first = msg[0] as { message?: string; description?: string };
    const d = first.message || first.description;
    if (d) return String(d);
  }
  return fallback;
}

export interface SkaleCreateResult {
  transactionId: string;
  qrCodeBase64: string;
  qrImageSrc: string;
  copyPaste: string;
}

export interface SkaleStatusResult {
  status: string;
  paid: boolean;
  amountInCents: number;
}

export async function createSkalePayment(params: {
  secretKey: string;
  userToken: string;
  amountInCents: number;
  customer: {
    name: string;
    email: string;
    phone: string;
    document: string;
  };
  items: { name: string; unitPrice: number; quantity: number }[];
  externalRef: string;
  webhookUrl: string;
  metadata?: string;
}): Promise<SkaleCreateResult> {
  const docDigits = params.customer.document.replace(/\D/g, "");
  const docType = docDigits.length === 14 ? "cnpj" : "cpf";

  const body: Record<string, unknown> = {
    amount: params.amountInCents,
    paymentMethod: "pix",
    customer: {
      name: params.customer.name,
      email: params.customer.email,
      phone: params.customer.phone.replace(/\D/g, ""),
      document: {
        number: docDigits,
        type: docType,
      },
      externalRef: params.externalRef,
    },
    items: params.items.map((i) => ({
      title: i.name,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      tangible: false,
    })),
    pix: { expiresInDays: 2 },
    postbackUrl: params.webhookUrl,
  };

  if (params.metadata?.trim()) {
    body.metadata = params.metadata.trim().slice(0, 500);
  }

  const res = await fetch(`${SKALE_BASE}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: basicAuth(params.secretKey, params.userToken),
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await parseJsonSafely(res);
  if (!res.ok) {
    const hint =
      res.status === 401 || res.status === 403
        ? " Verifique Secret Key e Token de usuário em Configurações → Credenciais de API."
        : "";
    throw new Error(formatSkaleError(data, `Skale Pay: HTTP ${res.status}`) + hint);
  }

  const id = String(data.id ?? "").trim();
  if (!id) {
    throw new Error("Skale Pay: resposta sem ID. " + JSON.stringify(data));
  }

  const pixObj = data.pix as Record<string, unknown> | undefined;
  const copyPaste = String(pixObj?.qrcode ?? "").trim();

  const qrRaw = (() => {
    const raw = copyPaste;
    if (raw.startsWith("data:image/") || raw.startsWith("iVBOR") || raw.startsWith("/9j/")) {
      return raw;
    }
    return "";
  })();

  let qrImageSrc = getPixQrImgSrc(qrRaw);
  if (!qrImageSrc && copyPaste.length >= 20) {
    try {
      qrImageSrc = await qrDataUrlFromPixPayload(copyPaste);
    } catch (e) {
      console.error("[skalepay] Falha ao gerar QR a partir do payload PIX:", e);
    }
  }

  return {
    transactionId: id,
    qrCodeBase64: qrRaw,
    qrImageSrc,
    copyPaste,
  };
}

export async function checkSkaleStatus(params: {
  secretKey: string;
  userToken: string;
  transactionId: string;
}): Promise<SkaleStatusResult> {
  const id = encodeURIComponent(params.transactionId);
  const res = await fetch(`${SKALE_BASE}/transactions/${id}`, {
    headers: {
      Authorization: basicAuth(params.secretKey, params.userToken),
      Accept: "application/json",
    },
  });

  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new Error(formatSkaleError(data, `Skale Pay status: HTTP ${res.status}`));
  }

  const status = String(data.status ?? "pending").toLowerCase();
  const paid = status === "paid" || status === "approved";
  const amountInCents = typeof data.amount === "number" ? data.amount : 0;

  return { status, paid, amountInCents };
}
