/**
 * Cliente TypeScript para a Skale Pay API (PIX).
 *
 * Autenticação (documentação oficial):
 *   Authorization: Basic base64("{CHAVE_DE_API}:x")
 * @see https://skalepay.readme.io/reference/introducao
 */

import QRCode from "qrcode";
import { getPixQrImgSrc } from "./pix-qr";
import type { CheckoutConfig } from "./admin-types";

const SKALE_BASE = "https://api.conta.skalepay.com.br/v1";

export type SkaleCredentials = {
  apiKey?: string;
  /** Referência da conta — não entra no Basic Auth */
  userId?: string;
};

function normCredential(value?: string): string {
  return (value ?? "").trim().replace(/^\uFEFF/, "").replace(/^["']|["']$/g, "");
}

export function skaleCredentialsFromConfig(cc?: CheckoutConfig | null): SkaleCredentials {
  return {
    apiKey: cc?.skalepayApiKey ?? cc?.skalepaySecretKey,
    userId: cc?.skalepayUserId,
  };
}

export function hasSkaleCredentials(creds: SkaleCredentials): boolean {
  return !!normCredential(creds.apiKey);
}

function encodeBasic(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

/** Auth oficial: chave de API + senha fixa "x" (não use ID do usuário). */
export function skaleAuthHeader(creds: SkaleCredentials): string {
  const apiKey = normCredential(creds.apiKey);
  if (!apiKey) {
    throw new Error(
      "Credenciais Skale Pay incompletas. Informe a Chave de API do painel Skale (Configurações → Credenciais de API)."
    );
  }
  return encodeBasic(apiKey, "x");
}

async function skaleFetch(
  path: string,
  creds: SkaleCredentials,
  init: RequestInit
): Promise<{ res: Response; data: Record<string, unknown> }> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", skaleAuthHeader(creds));
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const res = await fetch(`${SKALE_BASE}${path}`, { ...init, headers });
  const data = await parseJsonSafely(res);
  return { res, data };
}

export type SkaleAuthTestResult = {
  ok: boolean;
  httpStatus: number;
  message: string;
  hint?: string;
};

/** Testa credenciais com GET /balance/available (sem criar cobrança). */
export async function testSkaleCredentials(creds: SkaleCredentials): Promise<SkaleAuthTestResult> {
  const apiKey = normCredential(creds.apiKey);
  if (!apiKey) {
    return {
      ok: false,
      httpStatus: 0,
      message: "Chave de API não informada.",
      hint: "Cole a Chave de API em Admin → Checkout PIX → Skale Pay.",
    };
  }

  const { res, data } = await skaleFetch("/balance/available", creds, { method: "GET" });
  const msg = formatSkaleError(data, `HTTP ${res.status}`);

  if (res.ok) {
    return { ok: true, httpStatus: res.status, message: "Credenciais válidas — conexão com a Skale Pay OK." };
  }

  const lower = msg.toLowerCase();
  let hint: string | undefined;
  if (lower.includes("rl-4") || lower.includes("rl-2") || lower.includes("token")) {
    hint =
      "Use somente a Chave de API no Basic Auth (formato ChaveDeAPI:x). Não use o ID do usuário na autenticação. " +
      "Se a chave estiver correta, gere uma nova em Configurações → Credenciais de API no painel Skale e confira se a conta está aprovada (KYC).";
  }

  return { ok: false, httpStatus: res.status, message: msg, hint };
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
  credentials: SkaleCredentials;
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

  const { res, data } = await skaleFetch("/transactions", params.credentials, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const hint =
      res.status === 401 || res.status === 403
        ? " Verifique a Chave de API no admin (auth: ChaveDeAPI:x — não use o ID do usuário). Gere uma chave nova no painel Skale se necessário."
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
  credentials: SkaleCredentials;
  transactionId: string;
}): Promise<SkaleStatusResult> {
  const id = encodeURIComponent(params.transactionId);
  const { res, data } = await skaleFetch(`/transactions/${id}`, params.credentials, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(formatSkaleError(data, `Skale Pay status: HTTP ${res.status}`));
  }

  const status = String(data.status ?? "pending").toLowerCase();
  const paid = status === "paid" || status === "approved";
  const amountInCents = typeof data.amount === "number" ? data.amount : 0;

  return { status, paid, amountInCents };
}
